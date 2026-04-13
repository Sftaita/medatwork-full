<?php

declare(strict_types=1);

namespace App\Services\EmailReset;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UpdatePassword
{
    public const RESULT_OK      = 'ok';
    public const RESULT_INVALID = 'invalid';
    public const RESULT_EXPIRED = 'expired';

    public function __construct(
        private readonly UserPasswordHasherInterface $encoder,
        private readonly EntityManagerInterface $entityManager,
        private readonly ResidentRepository $residentRepository,
        private readonly ManagerRepository $managerRepository,
    ) {
    }

    /**
     * Finds the user by token, validates expiry, and updates the password.
     *
     * @return self::RESULT_* One of RESULT_OK, RESULT_INVALID, RESULT_EXPIRED
     */
    public function fromToken(string $token, string $newPassword): string
    {
        $user = $this->residentRepository->findOneBy(['token' => $token])
            ?? $this->managerRepository->findOneBy(['token' => $token]);

        if ($user === null) {
            return self::RESULT_INVALID;
        }

        $now = new DateTime('now', new DateTimeZone('Europe/Paris'));
        if ($now > $user->getTokenExpiration()) {
            return self::RESULT_EXPIRED;
        }

        $this->updatePassword($newPassword, $user);

        return self::RESULT_OK;
    }

    public function updatePassword(string $password, Manager|Resident $user): void
    {
        $hash = $this->encoder->hashPassword($user, $password);

        $user->setPassword($hash)
            ->setToken(null)
            ->setTokenExpiration(null);

        $this->entityManager->flush();
    }
}
