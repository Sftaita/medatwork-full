<?php

declare(strict_types=1);

namespace App\Controller\ResidentsAPI\PublicAPI;

use App\Controller\MailerController;
use App\DTO\ResidentRegistrationInputDTO;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Services\AvatarUploadHelper;
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
use Symfony\Component\Validator\Validator\ValidatorInterface;

class PublicAPIController extends AbstractController
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
        private readonly string $apiUrl,
    ) {
    }

    #[Route('/api/create/newResident', name: 'newResident', methods: ['POST'])]
    public function createNewResident(Request $request, EntityManagerInterface $entityManager, ResidentRepository $residentRepository, ManagerRepository $managerRepository, RateLimiterFactoryInterface $registerLimiter, AvatarUploadHelper $avatarHelper): JsonResponse
    {
        $limiter = $registerLimiter->create($request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['message' => 'Trop de tentatives. Réessayez dans une heure.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        try {
            $dto = ResidentRegistrationInputDTO::fromRequest($request);
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

        $now = new DateTime('now', new DateTimeZone('Europe/Paris'));
        $token = bin2hex(random_bytes(32));
        $link = $this->apiUrl.'ResidentActivation/'.$token;
        $tokenExpiration = (new DateTime('now', new DateTimeZone('Europe/Paris')))->modify('+48 hours');

        $resident = new Resident();

        $hashedPassword = $this->passwordHasher->hashPassword($resident, $dto->password);

        $resident->setEmail($dto->email)
                ->setPassword($hashedPassword)
                ->setFirstname($dto->firstname)
                ->setLastname($dto->lastname)
                ->setRole($dto->role)
                ->setRoles(['ROLE_RESIDENT'])
                ->setSexe($dto->sexe)
                ->setSpeciality($dto->speciality)
                ->setUniversity($dto->university)
                ->setDateOfMaster(new DateTime($dto->dateOfMaster, new DateTimeZone('Europe/Paris')))
                ->setToken($token)
                ->setTokenExpiration($tokenExpiration)
                ->setCreatedAt($now);

        $violations = $this->validator->validate($resident);

        if (count($violations) > 0) {
            $errorMessages = [];
            foreach ($violations as $violation) {
                $errorMessages['errors'][] = $violation->getPropertyPath() . ': ' . $violation->getMessage();
            }
            return new JsonResponse(['errors' => $errorMessages], Response::HTTP_BAD_REQUEST);
        }

        // Optional avatar upload during signup
        $avatarFile = $request->files->get('avatar');
        if ($avatarFile !== null) {
            try {
                $avatarHelper->process($avatarFile, $resident);
            } catch (\InvalidArgumentException) {
                // Avatar errors are non-blocking during signup — registration still succeeds
            }
        }

        $entityManager->persist($resident);
        $entityManager->flush();

        $subject = 'Activation de votre compte';
        $parameters = [
            'firstname' => $dto->firstname,
            'link' => $link,
        ];

        try {
            $this->mailer->sendEmail($dto->email, $subject, 'email/activationEmail.html.twig', $parameters);
        } catch (\Throwable) {
            // Email failure must not block registration — the user can request a new link
        }

        return new JsonResponse(['message' => 'ok'], 200);
    }

}
