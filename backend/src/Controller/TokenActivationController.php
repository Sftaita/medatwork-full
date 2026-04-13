<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

class TokenActivationController extends AbstractController
{
    // bin2hex(random_bytes(32)) produces 64 hexadecimal characters
    private const TOKEN_LENGTH = 64;

    private const URL_LOGIN   = 'https://www.medatwork.be/login';
    private const URL_404     = 'https://www.medatwork.be/404';
    private const URL_EXPIRED = 'https://www.medatwork.be/token-expired';

    public function __construct(
        private readonly MailerController $mailer,
        private readonly string $apiUrl,
    ) {
    }

    #[Route('/api/ResidentActivation/{token}', name: 'ResidentActivation', methods: ['GET'])]
    public function verifyResidentToken(string $token, ResidentRepository $userRepo, EntityManagerInterface $entityManager): Response
    {
        if (strlen($token) !== self::TOKEN_LENGTH) {
            return $this->redirect(self::URL_404);
        }

        $user = $userRepo->findOneBy(['token' => $token]);

        if (! $user) {
            return $this->redirect(self::URL_404);
        }

        if ($user->getTokenExpiration() !== null && $user->getTokenExpiration() < new DateTime()) {
            $user->setToken(null)->setTokenExpiration(null);
            $entityManager->flush();

            return $this->redirect(self::URL_EXPIRED);
        }

        $user->setToken(null)
             ->setTokenExpiration(null)
             ->setValidatedAt(new DateTime());

        $entityManager->flush();

        return $this->redirect(self::URL_LOGIN);
    }

    #[Route('/api/ManagerActivation/{token}', name: 'ManagerActivation', methods: ['GET'])]
    public function verifyManagerToken(string $token, ManagerRepository $userRepo, EntityManagerInterface $entityManager): Response
    {
        if (strlen($token) !== self::TOKEN_LENGTH) {
            return $this->redirect(self::URL_404);
        }

        $user = $userRepo->findOneBy(['token' => $token]);

        if (! $user) {
            return $this->redirect(self::URL_404);
        }

        if ($user->getTokenExpiration() !== null && $user->getTokenExpiration() < new DateTime()) {
            $user->setToken(null)->setTokenExpiration(null);
            $entityManager->flush();

            return $this->redirect(self::URL_EXPIRED);
        }

        $user->setToken(null)
             ->setTokenExpiration(null)
             ->setValidatedAt(new DateTime());

        $entityManager->flush();

        return $this->redirect(self::URL_LOGIN);
    }

    #[Route('/api/resend-activation', name: 'resend_activation', methods: ['POST'])]
    public function resendActivation(
        Request $request,
        ResidentRepository $residentRepo,
        ManagerRepository $managerRepo,
        EntityManagerInterface $em,
        RateLimiterFactoryInterface $registerLimiter,
    ): JsonResponse {
        $limiter = $registerLimiter->create('resend_' . $request->getClientIp());
        if (! $limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['message' => 'Trop de tentatives. Réessayez dans une heure.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $data  = json_decode($request->getContent(), true);
        $email = trim((string) ($data['email'] ?? ''));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['message' => 'ok'], 200);
        }

        $resident = $residentRepo->findOneBy(['email' => $email]);
        $manager  = $managerRepo->findOneBy(['email' => $email]);
        $user     = $resident ?? $manager;

        // Generic response — never reveal whether the email is registered
        if (! $user || $user->getValidatedAt() !== null) {
            return new JsonResponse(['message' => 'ok'], 200);
        }

        $token      = bin2hex(random_bytes(32));
        $expiration = (new DateTime('now', new DateTimeZone('Europe/Paris')))->modify('+48 hours');

        $user->setToken($token)->setTokenExpiration($expiration);
        $em->flush();

        $route = $resident ? 'ResidentActivation' : 'ManagerActivation';
        $link  = $this->apiUrl . $route . '/' . $token;

        try {
            $this->mailer->sendEmail(
                $email,
                'Activation de votre compte',
                'email/activationEmail.html.twig',
                ['firstname' => $user->getFirstname(), 'link' => $link],
            );
        } catch (\Throwable) {
            // Email failure must not block the resend response
        }

        return new JsonResponse(['message' => 'ok'], 200);
    }
}
