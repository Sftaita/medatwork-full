<?php

declare(strict_types=1);

namespace App\Services;

use App\Compliance\DTO\ComplianceReport;
use App\Entity\NotificationManager;
use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Envoie une notification in-app agrégée aux managers d'une année
 * lorsqu'un résident présente des problèmes de conformité.
 *
 * Règle : une notification par manager par run d'audit, pas une par alerte.
 * Décision d'envoi : NotificationDecisionService (préférences globales × annuelles).
 */
class ComplianceAlertNotificationService
{
    public function __construct(
        private readonly NotificationDecisionService $decisionService,
        private readonly ManagerYearsRepository     $managerYearsRepo,
        private readonly ManagerRepository          $managerRepo,
        private readonly EntityManagerInterface     $em,
    ) {
    }

    /**
     * Notifie les managers de l'année si le rapport contient des issues.
     *
     * Aucune notification si le rapport est vide (résident conforme).
     */
    private const MAX_DESCRIPTIONS = 3;

    public function notifyForReport(
        ComplianceReport $report,
        Years            $year,
        Resident         $resident,
    ): void {
        if (!$report->hasIssues()) {
            return;
        }

        $managerRows = $this->managerYearsRepo->fetchYearManagers($year);
        $managerIds  = array_column($managerRows, 'managerId');
        $managers    = $this->managerRepo->findBy(['id' => $managerIds]);

        $residentName = $resident->getFirstname().' '.$resident->getLastname();
        $yearTitle    = $year->getTitle() ?? '';
        $severityTag  = $report->hasCriticalIssues() ? '[CRITIQUE]' : '[AVERTISSEMENT]';
        $object       = sprintf('%s %s — %s', $severityTag, $residentName, $yearTitle);
        $body         = $this->buildBody($report, $residentName);

        foreach ($managers as $manager) {
            if (!$this->decisionService->shouldSend(
                'manager',
                (int) $manager->getId(),
                $year,
                'COMPLIANCE_ALERT',
                'email',
            )) {
                continue;
            }

            $notification = new NotificationManager();
            $notification->setObject($object);
            $notification->setBody($body);
            $notification->setCreatedAt(new DateTime());
            $notification->setIsRead(false);
            $notification->setManager($manager);
            $notification->setType('compliance_alert');
            $notification->setMetadata([
                'version'   => 1,
                'yearId'    => $year->getId(),
                'yearTitle' => $year->getTitle() ?? '',
                'tab'       => 'compliance',
                'severity'  => $report->hasCriticalIssues() ? 'critical' : 'warning',
            ]);
            $this->em->persist($notification);
        }

        $this->em->flush();
    }

    private function buildBody(ComplianceReport $report, string $residentName): string
    {
        $issueCount = count($report->issues);
        $date       = (new DateTime())->format('d/m/Y');

        $lines   = [];
        $lines[] = sprintf(
            '%s — %d violation(s) détectée(s) le %s :',
            $residentName,
            $issueCount,
            $date,
        );

        $displayed  = array_slice($report->issues, 0, self::MAX_DESCRIPTIONS);
        $remaining  = $issueCount - count($displayed);

        foreach ($displayed as $issue) {
            $lines[] = '• '.$issue->description;
        }

        if ($remaining > 0) {
            $lines[] = sprintf('et %d autre(s) violation(s). Consultez l\'onglet Conformité de l\'année.', $remaining);
        }

        return implode("\n", $lines);
    }
}
