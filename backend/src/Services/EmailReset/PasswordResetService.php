<?php

declare(strict_types=1);

namespace App\Services\EmailReset;

use App\Controller\MailerController;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;

final class PasswordResetService implements PasswordResetServiceInterface
{
    public function __construct(
        private readonly ResidentRepository $residentRepository,
        private readonly ManagerRepository $managerRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly MailerController $mailer,
        private readonly string $frontendUrl,
    ) {
    }

    /**
     * Generates a reset token, persists it, and sends the email.
     *
     * Always returns silently — never reveals whether the email is registered
     * (prevents user enumeration via timing or response differences).
     */
    public function requestReset(string $email): void
    {
        $user = $this->residentRepository->findOneBy(['email' => $email])
            ?? $this->managerRepository->findOneBy(['email' => $email]);

        if ($user === null) {
            return;
        }

        $token      = bin2hex(random_bytes(32));
        $expiration = new DateTime('+1 day', new DateTimeZone('Europe/Paris'));

        $user->setToken($token)->setTokenExpiration($expiration);
        $this->entityManager->flush();

        $this->mailer->sendEmail(
            $email,
            'Réinitialisation de votre compte',
            'email/resetTokenEmail.html.twig',
            [
                'token' => $token,
                'link'  => rtrim($this->frontendUrl, '/') . '/passwordUpdatePage/',
            ],
        );
    }
}
