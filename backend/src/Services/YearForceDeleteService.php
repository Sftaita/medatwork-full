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

        // ── Delete in FK-safe order via DBAL raw SQL ─────────────────────────
        // DQL bypasses ORM cascades → use raw SQL to control deletion order.

        $conn   = $em->getConnection();
        $yearId = $year->getId();

        // Level 3 — grandchildren of year (via years_resident)
        $yrSub = 'SELECT id FROM years_resident WHERE year_id = :yearId';
        $conn->executeStatement("DELETE FROM year_resident_parameters WHERE related_to_id IN ({$yrSub})", ['yearId' => $yearId]);
        $conn->executeStatement("DELETE FROM resident_year_calendar   WHERE years_resident_id IN ({$yrSub})", ['yearId' => $yearId]);
        $conn->executeStatement("DELETE FROM staff_planner_resources  WHERE years_resident_id IN ({$yrSub})", ['yearId' => $yearId]);

        // Level 2 — children of week intervals/templates and period_validation
        $conn->executeStatement(
            'DELETE rws FROM resident_weekly_schedule rws
             INNER JOIN years_week_intervals ywi ON rws.years_week_intervals_id = ywi.id
             WHERE ywi.year_id = :yearId',
            ['yearId' => $yearId],
        );
        $conn->executeStatement(
            'DELETE rv FROM resident_validation rv
             INNER JOIN period_validation pv ON rv.period_validation_id = pv.id
             WHERE pv.year_id = :yearId',
            ['yearId' => $yearId],
        );

        // Level 1 — direct children of year
        foreach ([
            ['years_resident',      'year_id'],
            ['timesheet',           'year_id'],
            ['garde',               'year_id'],
            ['absence',             'year_id'],
            ['period_validation',   'year_id'],
            ['years_week_intervals','year_id'],
            ['years_week_templates','year_id'],
            ['manager_years',       'years_id'],
        ] as [$table, $col]) {
            $conn->executeStatement("DELETE FROM {$table} WHERE {$col} = :yearId", ['yearId' => $yearId]);
        }

        // Audit + remove year
        if ($actor !== null) {
            $this->auditService->log(
                $actor, $hospital,
                'force_delete_year', 'year', $yearId,
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
