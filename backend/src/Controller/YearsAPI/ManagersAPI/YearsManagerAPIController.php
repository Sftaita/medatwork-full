<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\DTO\AddManagerInputDTO;
use App\DTO\CreateYearInputDTO;
use App\DTO\UpdateYearInputDTO;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\YearsManagement\CreateYear;
use App\Services\YearsManagement\UpdateYear;
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

class YearsManagerAPIController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/managers/years/getManagersYears', name: 'getManagerYears', methods: ['GET'])]
    public function getManagerYears(Security $security, ManagerYearsRepository $relation, ManagerRepository $managerRepository, YearsResidentRepository $yearResident): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();
        $years   = $relation->findManagerYearsList($manager);
        $results = [];

        foreach ($years as $year) {
            $master          = $managerRepository->findOneBy(['id' => $year['masterId']]);
            $residents       = $yearResident->findYearResidents($year['id']);
            $results[] = array_merge($year, [
                'masterFirstname' => $master?->getFirstname(),
                'masterLastname'  => $master?->getLastname(),
                'residents'       => $residents,
            ]);
        }

        return $this->json($results, 200);
    }

    #[Route('/api/managers/years/create', name: 'createNewYear', methods: ['POST'])]
    public function createYear(Request $request, Security $security, CreateYear $createYear): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();

        try {
            $dto = CreateYearInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $createYear->createYear($manager, $dto->title, $dto->speciality, $dto->comment, $dto->location, $dto->dateOfStart, $dto->dateOfEnd, $dto->period, $dto->isMaster);

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('/api/managers/years/update', name: 'updateYear', methods: ['PUT'])]
    public function updateYear(Request $request, Security $security, UpdateYear $updateYear): JsonResponse
    {
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
    public function addManager(Request $request, Security $security, ManagerYearsRepository $managerYearsRepository, ManagerRepository $managerRepository, YearsRepository $yearsRepository): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();

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

        $relation = $managerYearsRepository->findOneBy(['manager' => $manager, 'years' => $year]);
        if (! $relation?->getAdmin()) {
            return new JsonResponse(['message' => 'Vous ne disposez pas des droits administrateur'], 400);
        }

        $managerYears = (new ManagerYears())
            ->setManager($guest)
            ->setOwner(false)
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
        /** @var Manager $manager */
        $manager = $security->getUser();
        $year    = $yearsRepository->findOneBy(['id' => $yearId]);

        if (! $year) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        if (! $managerYearsRepository->checkRelation($manager, $year)) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette ressource"], 400);
        }

        return $this->json($managerYearsRepository->fetchYearManagers($year), 200);
    }

    #[Route('/api/managers/years/{yearId}/hospital-managers', name: 'getHospitalManagersForYear', methods: ['GET'])]
    public function getHospitalManagersForYear(int $yearId, Security $security, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $security->getUser();
        $year    = $yearsRepository->findOneBy(['id' => $yearId]);

        if (! $year) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        if (! $managerYearsRepository->checkRelation($manager, $year)) {
            return new JsonResponse(['message' => "Vous n'avez pas accès à cette ressource"], 403);
        }

        $hospital = $year->getHospital();

        if (! $hospital) {
            return new JsonResponse([], 200);
        }

        $managers = [];
        foreach ($hospital->getManagers() as $m) {
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
    public function findYearById(int $yearId, YearsRepository $yearsRepository, ManagerYearsRepository $managerYearsRepository, ManagerRepository $managerRepository): JsonResponse
    {
        $year = $yearsRepository->findOneById($yearId);

        if ($year === null) {
            return new JsonResponse(['message' => 'Année introuvable.'], 404);
        }

        $managers = $managerYearsRepository->fetchYearManagers($yearId);

        if ($year['master']) {
            $master                   = $managerRepository->findOneBy(['id' => $year['master']]);
            $year['masterFirstname']  = $master?->getFirstname();
            $year['masterLastname']   = $master?->getLastname();
        } else {
            $year['masterFirstname'] = null;
            $year['masterLastname']  = null;
        }

        $year['managers'] = $managers;

        return $this->json($year, 200);
    }

    #[Route('/api/managers/years/yearsIntervalsAndWeekTemplatesSummary', name: 'get_week_intervals', methods: ['GET'])]
    public function getYearsIntervalsAndWeekTemplatesSummary(Security $security, YearSummaryBuilder $yearSummaryBuilder, LoggerInterface $logger): JsonResponse
    {
        try {
            $user = $security->getUser();
            if (! $user instanceof Manager) {
                throw new AccessDeniedException();
            }
            return $this->json($yearSummaryBuilder->buildForManager($user), 200);
        } catch (\Exception $e) {
            $logger->error('YearSummaryBuilder failed', ['exception' => $e]);

            return $this->json(['error' => 'Une erreur est survenue.'], 500);
        }
    }
}
