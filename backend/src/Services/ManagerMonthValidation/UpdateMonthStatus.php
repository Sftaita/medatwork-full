<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\Manager;
use App\Repository\PeriodValidationRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\Notifications\ValidationNotifications;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateMonthStatus
{
    public function __construct(
        private readonly PeriodValidationRepository $periodRepository,
        private readonly YearsRepository $yearsRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidationNotifications $notifyConcernedPerson,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
    ) {
    }

    public function updateValidationStatus(int $periodId, bool $status, Manager $manager): void
    {
        // 1. Find month period
        $period = $this->periodRepository->findOneBy(['id' => $periodId]);

        if (empty($period)) {
            throw new Exception("This period Id doesn't exist");
        };

        // 2. Find associated year
        $year = $this->yearsRepository->findOneBy(['id' => $period->getYear()]);

        // 3. Check rights
        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)
            && ! $this->authorizationChecker->isGranted(YearAccessVoter::DATA_VALIDATION, $year)) {
            throw new AccessDeniedException("Vous n'avez pas les droits pour valider");
        }

        // 4. Update database
        if ($status === true) {
            $period->setValidated($status)
                ->setValidatedAt(new DateTime('now', new DateTimeZone('Europe/Paris')))
                ->setValidatedBy($manager);

            try {
                $this->notifyConcernedPerson->notifyAcceptedPeriodValidation($period, $manager);
            } catch (Exception $e) {
                error_log($e->getMessage());
            }
        } else {
            $period->setValidated($status)
                ->setUnvalidatedAt(new DateTime('now', new DateTimeZone('Europe/Paris')))
                ->setValidatedBy($manager);

            try {
                $this->notifyConcernedPerson->notifyUnvalidatedPeriodValidation($period, $manager);
            } catch (Exception $e) {
                error_log($e->getMessage());
            }
        }

        $this->entityManager->flush();
    }

}
