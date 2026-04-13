<?php

declare(strict_types=1);

namespace App\Controller\ManagersAPI\ManagersAPI;

use App\Controller\MailerController;
use App\DTO\NewManagerInputDTO;
use App\DTO\UpdateRightsInputDTO;
use App\Entity\HospitalRequest;
use App\Entity\Manager;
use App\Enum\HospitalRequestStatus;
use App\Enum\ManagerStatus;
use App\Repository\HospitalRepository;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Security\Voter\YearAccessVoter;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Years Manager APIs
 */
class ManagersAPIController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
        private readonly string $apiUrl,
    ) {
    }

    /**
    * Get list of managers
    */
    #[IsGranted('ROLE_MANAGER')]
    #[Route('/api/fetchManagers', name: 'fetchManager', methods: ['GET'])]
    public function fetchManager(ManagerRepository $managerRepository): JsonResponse
    {
        $managers = [];
        foreach ($managerRepository->findAll() as $d) {
            $managers[] = [
                'id'        => $d->getId(),
                'firstname' => $d->getFirstname(),
                'lastname'  => $d->getLastname(),
                'sexe'      => $d->getSexe()->value,
                'job'       => $d->getJob(),
                'hospital'  => $d->getHospital(),
            ];
        }

        return $this->json($managers, 200);
    }

    #[Route('/api/create/newManager', name: 'newManager', methods: ['POST'])]
    public function createNewManager(Request $request, EntityManagerInterface $entityManager, ResidentRepository $residentRepository, ManagerRepository $managerRepository, HospitalRepository $hospitalRepository, RateLimiterFactoryInterface $registerLimiter): JsonResponse
    {
        $limiter = $registerLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['message' => 'Trop de tentatives. Réessayez dans une heure.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        try {
            $dto = NewManagerInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        // check if this email is already registered as resident
        $checkResident = $residentRepository->findOneBy(['email' => $dto->email]);
        // check if this email is already registered as manager
        $checkManager = $managerRepository->findOneBy(['email' => $dto->email]);
        $registeredAs = '';

        if ($checkResident) {
            $registeredAs = 'Resident';
        } elseif ($checkManager) {
            $registeredAs = 'Manager';
        }

        if ($registeredAs !== '') {
            // Generic response to prevent user enumeration
            return new JsonResponse(['message' => 'ok'], 200);
        }

        $now             = new DateTime('now', new DateTimeZone('Europe/Paris'));
        $token           = bin2hex(random_bytes(32));
        $link            = $this->apiUrl.'ManagerActivation/'.$token;
        $tokenExpiration = (new DateTime('now', new DateTimeZone('Europe/Paris')))->modify('+48 hours');

        $manager = new Manager();

        $hashedPassword = $this->passwordHasher->hashPassword(
            $manager,
            $dto->password
        );

        $hospital = null;
        if ($dto->hospitalId !== null) {
            $hospital = $hospitalRepository->find($dto->hospitalId);
            if ($hospital === null) {
                return new JsonResponse(['message' => 'Hospital not found'], Response::HTTP_BAD_REQUEST);
            }
        }

        $manager->setEmail($dto->email)
                ->setPassword($hashedPassword)
                ->setFirstname($dto->firstname)
                ->setLastname($dto->lastname)
                ->setRole('manager')
                ->setRoles(['ROLE_MANAGER'])
                ->setSexe($dto->sexe)
                ->setJob($dto->job)
                ->setStatus($hospital !== null ? ManagerStatus::Active : ManagerStatus::PendingHospital)
                ->setToken($token)
                ->setTokenExpiration($tokenExpiration)
                ->setCreatedAt($now);

        if ($hospital !== null) {
            $manager->addHospital($hospital);
        }

        $violations = $this->validator->validate($manager);

        if (count($violations) > 0) {
            $errorMessages = [];
            foreach ($violations as $violation) {
                $errorMessages['errors'][] = $violation->getPropertyPath() . ': ' . $violation->getMessage();
            }
            return new JsonResponse(['errors' => $errorMessages], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->persist($manager);

        // If the manager provided a hospital name not yet in the system, create a pending request
        if ($dto->hospitalName !== null) {
            $hospitalRequest = (new HospitalRequest())
                ->setRequestedBy($manager)
                ->setHospitalName($dto->hospitalName)
                ->setStatus(HospitalRequestStatus::Pending);
            $entityManager->persist($hospitalRequest);
        }

        $entityManager->flush();

        try {
            $this->mailer->sendEmail($dto->email, 'Activation de votre compte', 'email/activationEmail.html.twig', [
                'firstname' => $dto->firstname,
                'link'      => $link,
            ]);
        } catch (\Throwable) {
            // Email failure must not block registration — the user can request a new link
        }

        return new JsonResponse(['message' => 'ok'], 200);
    }

    #[Route('api/managers/updateRights', name: 'update_rights', methods: ['PUT'])]
    public function updateRights(Request $request, EntityManagerInterface $entityManager, ManagerYearsRepository $managerYearsRepository): Response
    {
        try {
            $dto = UpdateRightsInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $managerYear = $managerYearsRepository->find($dto->managerYearId);

        if (! $managerYear) {
            return new JsonResponse(['message' => 'Invalid managerYearId'], Response::HTTP_BAD_REQUEST);
        }

        if ($managerYear->getAdmin()) {
            return new JsonResponse(['message' => "Vous ne pouvez pas modifier les droit d'un administrateur."], Response::HTTP_FORBIDDEN);
        }

        $year = $managerYear->getYears();

        if (! $this->isGranted(YearAccessVoter::ADMIN, $year)) {
            return new JsonResponse(['message' => "Vous n'avez pas les droit pour effectuer ce changement."], Response::HTTP_FORBIDDEN);
        }

        $managerYear->setAdmin($dto->admin)
            ->setDataAccess($dto->dataAccess)
            ->setDataValidation($dto->dataValidation)
            ->setDataDownload($dto->dataDownload)
            ->setCanManageAgenda($dto->canManageAgenda)
            ->setHasAgendaAccess($dto->hasAgendaAccess);

        $entityManager->persist($managerYear);
        $entityManager->flush();

        return new JsonResponse(['message' => 'Rights updated successfully'], Response::HTTP_OK);
    }
}
