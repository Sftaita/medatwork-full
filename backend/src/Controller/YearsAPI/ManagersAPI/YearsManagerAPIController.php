<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\DTO\AddManagerInputDTO;
use App\DTO\CreateYearInputDTO;
use App\DTO\UpdateYearInputDTO;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\HospitalRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\YearsManagement\UpdateYear;
use App\Services\YearsManagement\YearCreationInput;
use App\Services\YearsManagement\YearCreationService;
use App\Security\Voter\YearAccessVoter;
use App\Services\YearsManagement\YearSummaryBuilder;
use DateTimeImmutable;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

class YearsManagerAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/managers/hospitals', name: 'manager_hospitals_list', methods: ['GET'])]
    public function getManagerHospitals(Security $security): JsonResponse
    {
        $user = $security->getUser();

        // Manager: return their linked hospitals via manager_hospital relation
        if ($user instanceof Manager) {
            $result = [];
            foreach ($user->getHospitals() as $hospital) {
                $result[] = [
                    'id'   => $hospital->getId(),
                    'name' => $hospital->getName(),
                    'city' => $hospital->getCity(),
                ];
            }
            return $this->json($result, 200);
        }

        // HospitalAdmin: return the single hospital they administrate
        if ($user instanceof HospitalAdmin) {
            $hospital = $user->getHospital();
            if ($hospital instanceof Hospital) {
                return $this->json([[
                    'id'   => $hospital->getId(),
                    'name' => $hospital->getName(),
                    'city' => $hospital->getCity(),
                ]], 200);
            }
            return $this->json([], 200);
        }

        return $this->json([], 200);
    }

    #[Route('/api/managers/years/getManagersYears', name: 'getManagerYears', methods: ['GET'])]
    public function getManagerYears(Security $security, ManagerYearsRepository $relation, YearsResidentRepository $yearResident): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();
        $years   = $relation->findManagerYearsList($manager);
        $results = [];

        foreach ($years as $year) {
            $residents  = $yearResident->findYearResidents($year['id']);
            $results[]  = array_merge($year, ['residents' => $residents]);
        }

        return $this->json($results, 200);
    }

    #[Route('/api/managers/years/create', name: 'createNewYear', methods: ['POST'])]
    public function createYear(Request $request, Security $security, YearCreationService $yearCreationService, HospitalRepository $hospitalRepository): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();

        if (!$manager->isCanCreateYear()) {
            return new JsonResponse(['message' => 'Vous n\'avez pas la permission de créer une année.'], 403);
        }

        try {
            $dto = CreateYearInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $hospital = $dto->hospitalId !== null ? $hospitalRepository->find($dto->hospitalId) : null;
        if ($hospital === null) {
            return new JsonResponse(['message' => 'Hôpital introuvable.'], 400);
        }

        $conn = $this->entityManager->getConnection();
        $conn->beginTransaction();
        try {
            $input = new YearCreationInput(
                title:       $dto->title,
                speciality:  $dto->speciality,
                period:      $dto->period,
                dateOfStart: $dto->dateOfStart,
                dateOfEnd:   $dto->dateOfEnd,
                hospital:    $hospital,
                comment:     $dto->comment ?: null,
            );

            $year = $yearCreationService->create($input);

            if ($dto->isMaster) {
                $year->setTrainingSupervisor($manager);
            }

            $relation = (new ManagerYears())
                ->setManager($manager)
                ->setYears($year)
                ->setAdmin(true)
                ->setDataAccess(true)
                ->setDataValidation(true)
                ->setDataDownload(true)
                ->setCanManageAgenda(true)
                ->setHasAgendaAccess(true);

            $this->entityManager->persist($relation);
            $this->entityManager->flush();

            if ($relation->getId() === null) {
                throw new \RuntimeException('La relation manager-année n\'a pas pu être créée.');
            }

            $conn->commit();
        } catch (\Throwable $e) {
            $conn->rollBack();
            return new JsonResponse(['message' => 'Une erreur est survenue lors de la création.'], 500);
        }

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/managers/years/update', name: 'updateYear', methods: ['PUT'])]
    public function updateYear(Request $request, Security $security, UpdateYear $updateYear, RateLimiterFactoryInterface $managerMutationLimiter): JsonResponse
    {
        $limiter = $managerMutationLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['message' => 'Trop de requêtes. Réessayez dans une heure.'], 429);
        }

        /** @var Manager $manager */
        $manager = $security->getUser();

        try {
            $dto = UpdateYearInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $updateYear->updateYear($dto->yearId, $manager, [
            'yearId'   => $dto->yearId,
            'target'   => $dto->target,
            'newValue' => $dto->newValue,
        ]);

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/managers/years/addManager', name: 'addManager', methods: ['POST'])]
    public function addManager(Request $request, Security $security, ManagerYearsRepository $managerYearsRepository, ManagerRepository $managerRepository, YearsRepository $yearsRepository, RateLimiterFactoryInterface $managerMutationLimiter): JsonResponse
    {
        $limiter = $managerMutationLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['message' => 'Trop de requêtes. Réessayez dans une heure.'], 429);
        }

        try {
            $dto = AddManagerInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $year  = $yearsRepository->findOneBy(['id' => $dto->year]);
        $guest = $managerRepository->findOneBy(['id' => $dto->guest]);

        if (! $year || ! $guest) {
            return new JsonResponse(['message' => 'Année ou manager introuvable.'], 400);
        }

        if ($managerYearsRepository->checkRelation($guest, $year)) {
            return new JsonResponse(['message' => "L'invité a déjà accès à l'année"], 400);
        }

        if (! $security->isGranted(YearAccessVoter::ADMIN, $year)) {
            return new JsonResponse(['message' => 'Vous ne disposez pas des droits administrateur sur cette année.'], 403);
        }

        $managerYears = (new ManagerYears())
            ->setManager($guest)
            ->setYears($year)
            ->setAdmin($dto->admin)
            ->setDataAccess($dto->dataAccess)
            ->setDataValidation($dto->dataValidation)
            ->setDataDownload($dto->dataDownload)
            ->setHasAgendaAccess($dto->agenda)
            ->setCanManageAgenda($dto->schedule)
            ->setInvitedAt(new DateTimeImmutable('now', new DateTimeZone('Europe/Paris')));

        $this->entityManager->persist($managerYears);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/managers/getYearManagers/{yearId}', name: 'getManagerList', methods: ['GET'])]
    public function getYearManagers(int $yearId, Security $security, ManagerYearsRepository $managerYearsRepository, YearsRepository $yearsRepository): JsonResponse
    {
        $year = $yearsRepository->findOneBy(['id' => $yearId]);

        if (! $year) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        if (! $security->isGranted(YearAccessVoter::VIEW, $year)) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette ressource"], 403);
        }

        return new JsonResponse($managerYearsRepository->fetchYearManagers($year), 200);
    }

    #[Route('/api/managers/years/{yearId}/hospital-managers', name: 'getHospitalManagersForYear', methods: ['GET'])]
    public function getHospitalManagersForYear(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerRepository $managerRepository): JsonResponse
    {
        $year = $yearsRepository->findOneBy(['id' => $yearId]);

        if (! $year) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        if (! $security->isGranted(YearAccessVoter::VIEW, $year)) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette ressource"], 403);
        }

        $hospital = $year->getHospital();

        if (! $hospital) {
            return new JsonResponse([], 200);
        }

        $managers = [];
        foreach ($managerRepository->findAllForHospital($hospital) as $m) {
            $managers[] = [
                'id'        => $m->getId(),
                'firstname' => $m->getFirstname(),
                'lastname'  => $m->getLastname(),
                'sexe'      => $m->getSexe()->value,
                'job'       => $m->getJob(),
                'hospital'  => $m->getHospital(),
            ];
        }

        return $this->json($managers, 200);
    }

    #[Route('/api/managers/getYearById/{yearId}', name: 'getYearById', methods: ['GET'])]
    public function findYearById(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        $yearEntity = $yearsRepository->findOneBy(['id' => $yearId]);

        if ($yearEntity === null) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        if (! $security->isGranted(YearAccessVoter::VIEW, $yearEntity)) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette ressource"], 403);
        }

        $year             = $yearsRepository->findOneById($yearId);
        $year['managers'] = $managerYearsRepository->fetchYearManagers($yearId);

        return $this->json($year, 200);
    }

    #[Route('/api/managers/years/yearsIntervalsAndWeekTemplatesSummary', name: 'get_week_intervals', methods: ['GET'])]
    public function getYearsIntervalsAndWeekTemplatesSummary(Security $security, YearSummaryBuilder $yearSummaryBuilder, LoggerInterface $logger): JsonResponse
    {
        try {
            $user = $security->getUser();

            if ($user instanceof HospitalAdmin) {
                return $this->json($yearSummaryBuilder->buildForHospitalAdmin($user), 200);
            }

            if ($user instanceof Manager) {
                return $this->json($yearSummaryBuilder->buildForManager($user), 200);
            }

            throw new AccessDeniedException();
        } catch (AccessDeniedException $e) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        } catch (\Exception $e) {
            $logger->error('YearSummaryBuilder failed', ['exception' => $e]);

            return $this->json(['error' => 'Une erreur est survenue.'], 500);
        }
    }
}
