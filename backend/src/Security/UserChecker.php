<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\HospitalAdminStatus;
use App\Enum\ManagerStatus;
use App\Exceptions\AccountDisabledException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if ($user instanceof Manager || $user instanceof Resident) {
            // Account not yet email-validated
            if ($user->getToken() !== null) {
                throw new AccountDisabledException();
            }

            // Manager waiting for hospital request approval
            if ($user instanceof Manager && $user->getStatus() === ManagerStatus::PendingHospital) {
                throw new AccountDisabledException(
                    "Votre demande d'hôpital est en cours de validation par l'administrateur."
                );
            }
        }

        // HospitalAdmin invited but profile not yet completed
        if ($user instanceof HospitalAdmin && $user->getStatus() === HospitalAdminStatus::Invited) {
            throw new AccountDisabledException(
                "Vous devez compléter votre profil via le lien d'invitation reçu par email."
            );
        }
    }

    public function checkPostAuth(UserInterface $user): void
    {
    }
}
