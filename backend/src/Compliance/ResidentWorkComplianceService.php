<?php

declare(strict_types=1);

namespace App\Compliance;

use App\Compliance\Checker\ComplianceCheckerInterface;
use App\Compliance\DTO\ComplianceReport;
use App\Compliance\Timeline\ResidentWorkTimelineBuilder;
use App\Entity\ComplianceAlert;
use App\Entity\Resident;
use App\Repository\AbsenceRepository;
use App\Repository\ComplianceAlertRepository;
use App\Repository\GardeRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsResidentRepository;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Orchestrates compliance checks for a resident over one or more legal periods.
 *
 * Responsibilities:
 *   1. Fetch raw data (timesheets, gardes, absences) for the period
 *   2. Build the work timeline
 *   3. Run all registered checkers
 *   4. Persist new ComplianceAlert entities (deduplication via fingerprint)
 *   5. Return a ComplianceReport for API serialization
 */
final class ResidentWorkComplianceService
{
    /**
     * @param ComplianceCheckerInterface[] $checkers  Tagged service collection
     */
    public function __construct(
        private readonly ResidentWorkTimelineBuilder $timelineBuilder,
        private readonly TimesheetRepository $timesheetRepository,
        private readonly GardeRepository $gardeRepository,
        private readonly AbsenceRepository $absenceRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly ComplianceAlertRepository $alertRepository,
        private readonly LegalPeriodsCalculator $periodsCalculator,
        private readonly EntityManagerInterface $em,
        /** @var ComplianceCheckerInterface[] */
        private readonly iterable $checkers,
    ) {
    }

    /**
     * Run all compliance checks for one resident over a given date range
     * and persist any new alerts.
     */
    public function auditResident(
        Resident $resident,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
    ): ComplianceReport {
        $yearsResident = $this->yearsResidentRepository->findOneForResidentInPeriod(
            $resident,
            $periodStart,
            $periodEnd,
        );

        $optingOut = $yearsResident?->getOptingOut() ?? false;

        $timesheets = $this->timesheetRepository->findByResidentAndPeriod(
            $resident,
            $periodStart->format('Y-m-d H:i:s'),
            $periodEnd->format('Y-m-d H:i:s'),
        );

        $gardes = $this->gardeRepository->findByResidentAndPeriod(
            $resident,
            $periodStart->format('Y-m-d H:i:s'),
            $periodEnd->format('Y-m-d H:i:s'),
        );

        $absences = $this->absenceRepository->findByResidentAndPeriod(
            $resident,
            $periodStart->format('Y-m-d'),
            $periodEnd->format('Y-m-d'),
        );

        $segments = $this->timelineBuilder->build($timesheets, $gardes);

        $allIssues = [];
        foreach ($this->checkers as $checker) {
            $issues = $checker->check($segments, $absences, $periodStart, $periodEnd, $optingOut);
            array_push($allIssues, ...$issues);
        }

        $this->persistAlerts($resident, $allIssues);

        return new ComplianceReport(
            residentId: (int) $resident->getId(),
            periodStart: $periodStart->format('Y-m-d'),
            periodEnd: $periodEnd->format('Y-m-d'),
            issues: $allIssues,
            optingOut: $optingOut,
        );
    }

    /** @param \App\Compliance\DTO\ComplianceIssue[] $issues */
    private function persistAlerts(Resident $resident, array $issues): void
    {
        foreach ($issues as $issue) {
            $fingerprint = hash('sha256', $resident->getId().$issue->type->value.$issue->weekStart);
            $existing = $this->alertRepository->findByFingerprint($fingerprint);

            if ($existing !== null) {
                // Alert already recorded — reopen if it was resolved
                if ($existing->getStatus() === 'resolved') {
                    $existing->reopen();
                }
                continue;
            }

            $alert = new ComplianceAlert(
                resident: $resident,
                issueType: $issue->type,
                severity: $issue->severity,
                weekStart: $issue->weekStart,
                context: $issue->context,
            );
            $this->em->persist($alert);
        }

        $this->em->flush();
    }
}
