<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\Absence;
use App\Entity\Garde;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\StaffPlannerAuditEvent;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\Timesheet;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Centralized audit service for Staff Planner RH events (Phase 6).
 *
 * All record* methods persist an audit event AND flush independently.
 * Integration point: call AFTER the main entity flush so entity IDs are available.
 *
 * Exception: record*Created() may be called BEFORE the main flush —
 * in that case entity IDs are unavailable (acceptable: date is sufficient identifier).
 *
 * actor_type values: 'resident' | 'manager' | 'hospital_admin' | 'app_admin' | 'system'
 */
class AuditService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly YearsResidentRepository $yrRepo,
    ) {
    }

    // ── Export ────────────────────────────────────────────────────────────────

    public function recordExportGenerated(StaffPlannerExportBatch $batch, string $actorType, ?int $actorId): void
    {
        $event = (new StaffPlannerAuditEvent('export_generated', $actorType, $actorId, [
            'batchId'       => $batch->getId(),
            'batchNumber'   => $batch->getBatchNumber(),
            'itemCount'     => $batch->getItemCount(),
            'fileSizeBytes' => $batch->getFileSizeBytes(),
        ]))
            ->setYear($batch->getYear())
            ->setBatch($batch);

        $this->save($event);
    }

    // ── Timesheet ─────────────────────────────────────────────────────────────

    public function recordTimesheetCreated(Resident $resident, Years $year, Timesheet $ts): void
    {
        $start = $ts->getDateOfStart();
        $event = (new StaffPlannerAuditEvent('timesheet_created', 'resident', $resident->getId(), [
            'timesheetId' => $ts->getId(),
            'dateOfStart' => $start?->format('Y-m-d H:i'),
            'dateOfEnd'   => $ts->getDateOfEnd()?->format('Y-m-d H:i'),
            'residentId'  => $resident->getId(),
            'yearId'      => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($start !== null ? (int) $start->format('n') : null)
            ->setCalendarYear($start !== null ? (int) $start->format('Y') : null);

        $this->save($event);
    }

    public function recordTimesheetModified(Resident $resident, Years $year, Timesheet $ts): void
    {
        $start = $ts->getDateOfStart();
        $event = (new StaffPlannerAuditEvent('timesheet_modified', 'resident', $resident->getId(), [
            'timesheetId' => $ts->getId(),
            'dateOfStart' => $start?->format('Y-m-d H:i'),
            'dateOfEnd'   => $ts->getDateOfEnd()?->format('Y-m-d H:i'),
            'residentId'  => $resident->getId(),
            'yearId'      => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($start !== null ? (int) $start->format('n') : null)
            ->setCalendarYear($start !== null ? (int) $start->format('Y') : null);

        $this->save($event);
    }

    public function recordTimesheetDeleted(Resident $resident, Years $year, int $tsId, \DateTimeInterface $date): void
    {
        $event = (new StaffPlannerAuditEvent('timesheet_deleted', 'resident', $resident->getId(), [
            'timesheetId' => $tsId,
            'dateOfStart' => $date->format('Y-m-d H:i'),
            'residentId'  => $resident->getId(),
            'yearId'      => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth((int) $date->format('n'))
            ->setCalendarYear((int) $date->format('Y'));

        $this->save($event);
    }

    // ── Garde ─────────────────────────────────────────────────────────────────

    public function recordGardeCreated(Resident $resident, Years $year, Garde $garde): void
    {
        $start = $garde->getDateOfStart();
        $event = (new StaffPlannerAuditEvent('garde_created', 'resident', $resident->getId(), [
            'gardeId'    => $garde->getId(),
            'dateOfStart'=> $start?->format('Y-m-d H:i'),
            'type'       => $garde->getType()?->value,
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($start !== null ? (int) $start->format('n') : null)
            ->setCalendarYear($start !== null ? (int) $start->format('Y') : null);

        $this->save($event);
    }

    public function recordGardeDeleted(Resident $resident, Years $year, int $gardeId, \DateTimeInterface $date): void
    {
        $event = (new StaffPlannerAuditEvent('garde_deleted', 'resident', $resident->getId(), [
            'gardeId'    => $gardeId,
            'dateOfStart'=> $date->format('Y-m-d H:i'),
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth((int) $date->format('n'))
            ->setCalendarYear((int) $date->format('Y'));

        $this->save($event);
    }

    // ── Absence ───────────────────────────────────────────────────────────────

    public function recordAbsenceCreated(Resident $resident, Years $year, Absence $absence): void
    {
        $start = $absence->getDateOfStart();
        $event = (new StaffPlannerAuditEvent('absence_created', 'resident', $resident->getId(), [
            'absenceId'  => $absence->getId(),
            'dateOfStart'=> $start?->format('Y-m-d'),
            'dateOfEnd'  => $absence->getDateOfEnd()?->format('Y-m-d'),
            'type'       => $absence->getType()?->value,
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($start !== null ? (int) $start->format('n') : null)
            ->setCalendarYear($start !== null ? (int) $start->format('Y') : null);

        $this->save($event);
    }

    public function recordAbsenceDeleted(Resident $resident, Years $year, int $absenceId, \DateTimeInterface $date): void
    {
        $event = (new StaffPlannerAuditEvent('absence_deleted', 'resident', $resident->getId(), [
            'absenceId'  => $absenceId,
            'dateOfStart'=> $date->format('Y-m-d'),
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth((int) $date->format('n'))
            ->setCalendarYear((int) $date->format('Y'));

        $this->save($event);
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public function recordValidationAccepted(
        Resident $resident,
        Years $year,
        int $month,
        int $calYear,
        int $managerId,
        ?string $comment,
    ): void {
        $event = (new StaffPlannerAuditEvent('validation_accepted', 'manager', $managerId, [
            'managerId'      => $managerId,
            'managerComment' => $comment,
            'residentId'     => $resident->getId(),
            'yearId'         => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($month)
            ->setCalendarYear($calYear);

        $this->save($event);
    }

    public function recordValidationRejected(
        Resident $resident,
        Years $year,
        int $month,
        int $calYear,
        int $managerId,
        ?string $notification,
    ): void {
        $event = (new StaffPlannerAuditEvent('validation_rejected', 'manager', $managerId, [
            'managerId'           => $managerId,
            'residentNotification'=> $notification,
            'residentId'          => $resident->getId(),
            'yearId'              => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($month)
            ->setCalendarYear($calYear);

        $this->save($event);
    }

    public function recordValidationBlockedByLock(
        Resident $resident,
        Years $year,
        int $month,
        int $calYear,
        int $managerId,
    ): void {
        $event = (new StaffPlannerAuditEvent('validation_blocked_by_lock', 'manager', $managerId, [
            'managerId'  => $managerId,
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($month)
            ->setCalendarYear($calYear);

        $this->save($event);
    }

    // ── Blocked modification attempt ──────────────────────────────────────────

    public function recordBlockedModificationAttempt(
        Resident $resident,
        Years $year,
        int $month,
        int $calYear,
        string $entityType,
    ): void {
        $event = (new StaffPlannerAuditEvent('blocked_modification_attempt', 'resident', $resident->getId(), [
            'entityType' => $entityType,
            'month'      => $month,
            'calYear'    => $calYear,
            'residentId' => $resident->getId(),
            'yearId'     => $year->getId(),
        ]))
            ->setYear($year)
            ->setYearsResident($this->resolveYr($resident, $year))
            ->setMonth($month)
            ->setCalendarYear($calYear);

        $this->save($event);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function resolveYr(Resident $resident, Years $year): ?YearsResident
    {
        return $this->yrRepo->findOneBy(['resident' => $resident, 'year' => $year]);
    }

    private function save(StaffPlannerAuditEvent $event): void
    {
        $this->em->persist($event);
        $this->em->flush();
    }
}
