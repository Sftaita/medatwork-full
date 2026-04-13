<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Entity\NotificationResident;
use App\Entity\PeriodValidation;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentRepository;
use App\Repository\YearsResidentRepository;
use App\Util\FrenchMonths;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class ValidationNotifications
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly ManagerYearsRepository $managerYearsRepository,
        private readonly ManagerRepository $managerRepository,
        private readonly ResidentRepository $residentRepository,
    ) {
    }

    /**
     * Sends period validation notifications to concerned managers and residents.
     *
     * @param PeriodValidation $period           The period that was validated
     * @param Manager          $managerThatValidated The manager who validated the period
     */
    public function notifyAcceptedPeriodValidation(PeriodValidation $period, Manager $managerThatValidated): void
    {
        $this->notify($period, $managerThatValidated, 'validation', 'Validation');
    }

    /**
     * Sends period unvalidation notifications to concerned managers and residents.
     *
     * @param PeriodValidation $period           The period whose validation was cancelled
     * @param Manager          $managerThatValidated The manager who cancelled the validation
     */
    public function notifyUnvalidatedPeriodValidation(PeriodValidation $period, Manager $managerThatValidated): void
    {
        $this->notify($period, $managerThatValidated, 'validation', 'Annulation de la validation');
    }

    private function notify(PeriodValidation $period, Manager $managerThatValidated, string $type, string $verb): void
    {
        $year = $period->getYear();

        if ($year === null) {
            return;
        }

        $monthName = FrenchMonths::name($period->getMonth());
        $yearNb    = $period->getYearNb();
        $author    = $managerThatValidated->getFirstname().' '.$managerThatValidated->getLastname();
        $body      = $verb.' du mois de '.$monthName.' '.$yearNb.' par '.$author
            .'. Pour rappel, le maître de stage dispose de 3 jours pour annuler une validation.';

        // ── Managers (excluding the one who acted) ────────────────────────────
        $managerRows = $this->managerYearsRepository->fetchYearManagers($year);
        $managerIds  = array_values(array_filter(
            array_column($managerRows, 'managerId'),
            fn (int $id) => $id !== $managerThatValidated->getId(),
        ));

        // Single query — no N+1
        $managerEntities = $this->managerRepository->findBy(['id' => $managerIds]);

        foreach ($managerEntities as $manager) {
            $notification = new NotificationManager();
            $notification->setObject($year->getTitle() ?? '');
            $notification->setBody($body);
            $notification->setCreatedAt(new DateTime());
            $notification->setIsRead(false);
            $notification->setManager($manager);
            $notification->setType($type);
            $this->entityManager->persist($notification);
        }

        // ── Residents ─────────────────────────────────────────────────────────
        $residentRows = $this->yearsResidentRepository->findYearAllowedResidents($year);
        $residentIds  = array_column($residentRows, 'residentId');

        // Single query — no N+1
        $residentEntities = $this->residentRepository->findBy(['id' => $residentIds]);

        foreach ($residentEntities as $resident) {
            $notification = new NotificationResident();
            $notification->setObject($year->getTitle() ?? '');
            $notification->setBody($body);
            $notification->setCreatedAt(new DateTime());
            $notification->setIsRead(false);
            $notification->setResident($resident);
            $notification->setType($type);
            $this->entityManager->persist($notification);
        }

        $this->entityManager->flush();
    }
}
