<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Entity\NotificationResident;
use App\Entity\PeriodValidation;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use App\Util\FrenchMonths;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class UpdateYearResidentNotifications
{
    public function __construct(
        private readonly ManagerYearsRepository     $managerYearsRepository,
        private readonly EntityManagerInterface     $entityManager,
        private readonly ManagerRepository          $managerRepository,
        private readonly \App\Services\NotificationDecisionService $decisionService,
    ) {
    }

    /**
     * Notify the managers and the resident about a validation status change on a period.
     *
     * Managers (except the one who acted) and the resident are notified. An optional
     * private manager comment and/or a resident-facing message can be appended to the body.
     *
     * @param array<string, mixed> $data {
     *     status: 'validate'|'invalidate',
     *     managerComment?: string,
     *     residentNotification?: string,
     * }
     */
    public function notifyValidationChange(array $data, PeriodValidation $period, Manager $managerThatValidated, Resident $resident): void
    {
        $year = $period->getYear();

        if ($year === null) {
            return;
        }

        // ── Gate NotificationDecisionService ─────────────────────────────────
        // Détermine l'événement selon le statut de validation
        $eventType = ($data['status'] === 'validate') ? 'MONTH_VALIDATION' : 'VALIDATION_REJECTED';

        // Vérification globale sur le canal email pour le manager acteur.
        // Si désactivé globalement → pas de notification in-app non plus (cohérence).
        // P0 : gate simplifié sur email du manager acteur.
        // P1 : vérification par canal et par destinataire.
        if (!$this->decisionService->shouldSend(
            'manager',
            (int) $managerThatValidated->getId(),
            $year,
            $eventType,
            'email',
        )) {
            return;
        }

        $isValidated      = $data['status'] === 'validate';
        $validationString = $isValidated ? 'Validation' : 'Invalidation';
        $monthName        = FrenchMonths::name($period->getMonth());
        $yearNb           = $period->getYearNb();
        $authorName       = $managerThatValidated->getFirstname().' '.$managerThatValidated->getLastname();
        $residentName     = $resident->getFirstname().' '.$resident->getLastname();
        $type             = $isValidated ? 'validated' : 'invalidated';
        $title            = $year->getTitle() ?? '';

        // ── Managers (excluding the one who acted) ────────────────────────────
        $managerRows = $this->managerYearsRepository->fetchYearManagers($year);
        $managerIds  = array_values(array_filter(
            array_column($managerRows, 'managerId'),
            fn (int $id) => $id !== $managerThatValidated->getId(),
        ));

        // Single query — no N+1
        $managerEntities = $this->managerRepository->findBy(['id' => $managerIds]);

        $managerBody = $residentName.': '.$validationString.' du mois de '.$monthName.' '.$yearNb
            .' par '.$authorName
            .'. Pour rappel, le maître de stage dispose de 3 jours pour annuler une validation.';

        if (! empty($data['managerComment'])) {
            $managerBody .= ' Commentaire privé de '.$authorName.' : '.$data['managerComment'].'.';
        }
        if (! empty($data['residentNotification'])) {
            $managerBody .= ' Notification au résident : '.$data['residentNotification'].'.';
        }

        foreach ($managerEntities as $manager) {
            $notification = new NotificationManager();
            $notification->setObject($title);
            $notification->setBody($managerBody);
            $notification->setCreatedAt(new DateTime());
            $notification->setIsRead(false);
            $notification->setManager($manager);
            $notification->setType($type);
            $this->entityManager->persist($notification);
        }

        // ── Resident ──────────────────────────────────────────────────────────
        $residentBody = $validationString.' du mois de '.$monthName.' '.$yearNb
            .' par '.$authorName
            .'. Pour rappel, le maître de stage dispose de 3 jours pour annuler une validation.';

        if (! empty($data['residentNotification'])) {
            $residentBody .= ' Notification du résident : '.$data['residentNotification'].'.';
        }

        $notification = new NotificationResident();
        $notification->setObject($title);
        $notification->setBody($residentBody);
        $notification->setCreatedAt(new DateTime());
        $notification->setIsRead(false);
        $notification->setResident($resident);
        $notification->setType($type);
        $this->entityManager->persist($notification);

        $this->entityManager->flush();
    }
}
