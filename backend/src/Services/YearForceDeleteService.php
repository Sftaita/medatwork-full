<?php

declare(strict_types=1);

namespace App\Services;

use App\Controller\MailerController;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\YearsResidentRepository;
use App\Services\HospitalAdminAuditService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Handles force-deletion of a hospital year with all associated data.
 *
 * Responsibilities:
 * - Delete all dependent records in FK-safe order
 * - Send email notifications to linked residents, managers and hospital admins
 * - Write an audit log entry
 */
class YearForceDeleteService
{
    public function __construct(
        private readonly MailerController $mailer,
        private readonly HospitalAdminAuditService $auditService,
        private readonly string $frontendUrl,
    ) {}

    public function execute(
        Years $year,
        Hospital $hospital,
        YearsResidentRepository $yrRepo,
        EntityManagerInterface $em,
        HospitalAdmin|Manager|null $actor,
    ): void {
        $yearTitle    = $year->getTitle();
        $hospitalName = $hospital->getName();
        $deletedAt    = (new \DateTime())->format('d/m/Y à H:i');

        // ── Collect notification targets before deletion ───────────────────────

        $residentEmails = [];
        foreach ($year->getResidents() as $yr) {
            $r = $yr->getResident();
            if ($r !== null) {
                $residentEmails[] = ['email' => $r->getEmail(), 'firstname' => $r->getFirstname()];
            }
        }

        $managerEmails = [];
        foreach ($year->getManagers() as $my) {
            $m = $my->getManager();
            if ($m !== null) {
                $managerEmails[] = ['email' => $m->getEmail(), 'firstname' => $m->getFirstname()];
            }
        }

        $adminEmails = [];
        foreach ($hospital->getHospitalAdmins() as $admin) {
            $adminEmails[] = ['email' => $admin->getEmail(), 'firstname' => $admin->getFirstname()];
        }

        // ── Delete in FK-safe order ───────────────────────────────────────────

        // 1. YearsResident with their children (StaffPlannerResources cascade:remove, ResidentYearCalendar orphanRemoval)
        foreach ($yrRepo->findBy(['year' => $year]) as $yr) {
            $em->remove($yr);
        }
        $em->flush();

        // 2. Bulk-delete remaining dependents via DQL
        $dql = static fn (string $entity, string $field): string =>
            "DELETE FROM App\\Entity\\{$entity} e WHERE e.{$field} = :year";

        foreach ([
            ['Timesheet',         'year'],
            ['Garde',             'year'],
            ['Absence',           'year'],
            ['PeriodValidation',  'year'],
            ['YearsWeekIntervals','year'],
            ['YearsWeekTemplates','year'],
            ['ManagerYears',      'years'],
        ] as [$entity, $field]) {
            $em->createQuery($dql($entity, $field))->execute(['year' => $year]);
        }

        // 3. Audit + remove year
        if ($actor !== null) {
            $this->auditService->log(
                $actor, $hospital,
                'force_delete_year', 'year', $year->getId(),
                sprintf('Année "%s" supprimée (force) avec toutes les données associées', $yearTitle),
            );
        }

        $em->remove($year);
        $em->flush();

        // ── Send email notifications ──────────────────────────────────────────

        $tplParams = [
            'yearTitle'    => $yearTitle,
            'hospitalName' => $hospitalName,
            'deletedAt'    => $deletedAt,
        ];

        $send = function (string $email, string $firstname, bool $isAdmin) use ($tplParams): void {
            try {
                $this->mailer->sendEmail(
                    $email,
                    "Année « {$tplParams['yearTitle']} » supprimée — MED@WORK",
                    'email/yearDeleted.html.twig',
                    array_merge($tplParams, ['firstname' => $firstname, 'isAdmin' => $isAdmin]),
                );
            } catch (\Throwable) {
                // Email failure must not block the operation
            }
        };

        foreach ($residentEmails as $r) { $send($r['email'], $r['firstname'], false); }
        foreach ($managerEmails  as $m) { $send($m['email'], $m['firstname'], false); }
        foreach ($adminEmails    as $a) { $send($a['email'], $a['firstname'], true);  }
    }
}
