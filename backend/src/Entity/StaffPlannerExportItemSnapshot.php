<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerExportItemSnapshotRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Immutable snapshot of one MACCS × month included in a Staff Planner export batch.
 *
 * Append-only — NEVER updated after creation.
 * payloadLines contains the exact .txt lines written for this MACCS in this export.
 * dataFingerprint is the SHA-256 of the data at export time (same as FingerprintService::hashData).
 * validatedByMdsAtExport captures the MDS validation state at the moment of export.
 *
 * Constraints:
 * - Unique per (batch, yearsResident, month, calendarYear) — one snapshot per MACCS per export.
 * - yearsResident onDelete RESTRICT — snapshots must not disappear with a MACCS.
 * - batch onDelete CASCADE — if a batch is deleted (data purge), its snapshots go with it.
 */
#[ORM\Entity(repositoryClass: StaffPlannerExportItemSnapshotRepository::class)]
#[ORM\Table(name: 'staff_planner_export_item_snapshot')]
#[ORM\UniqueConstraint(
    name: 'uq_snapshot_batch_item',
    columns: ['batch_id', 'years_resident_id', 'month', 'calendar_year'],
)]
#[ORM\Index(columns: ['years_resident_id', 'calendar_year', 'month'], name: 'idx_snapshot_maccs')]
#[ORM\Index(columns: ['batch_id'], name: 'idx_snapshot_batch')]
class StaffPlannerExportItemSnapshot
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: StaffPlannerExportBatch::class, inversedBy: 'snapshots')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private StaffPlannerExportBatch $batch;

    /** RESTRICT: a snapshot is legal proof — the MACCS must not be deletable while it exists. */
    #[ORM\ManyToOne(targetEntity: YearsResident::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private YearsResident $yearsResident;

    #[ORM\Column(type: 'smallint')]
    private int $month;

    #[ORM\Column(type: 'smallint')]
    private int $calendarYear;

    /** SHA-256 of canonical data at export time. Matches FingerprintService::hashData(). */
    #[ORM\Column(type: 'string', length: 64)]
    private string $dataFingerprint;

    /** Was ResidentValidation.validated=true at the moment of this export? */
    #[ORM\Column(type: 'boolean')]
    private bool $validatedByMdsAtExport;

    /** Number of timesheet entries included. */
    #[ORM\Column(type: 'smallint')]
    private int $timesheetCount;

    /** Number of hospital-garde entries included (callable excluded). */
    #[ORM\Column(type: 'smallint')]
    private int $gardeHospitalCount;

    #[ORM\Column(type: 'smallint')]
    private int $absenceCount;

    /** Sum of all shift durations in minutes (timesheets + hospital gardes). */
    #[ORM\Column(type: 'integer')]
    private int $totalMinutes;

    /** Actual workerHRID used in the .txt lines (snapshot of what was in StaffPlannerResources). */
    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $workerHRIDAtExport = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $sectionHRIDAtExport = null;

    /**
     * Exact .txt lines written for this MACCS in the export.
     * MEDIUMTEXT to handle edge cases (multiple months spanning, large shift counts).
     * Typical size: ~3–5 KB per MACCS × month.
     */
    #[ORM\Column(type: 'text', length: 16777215)]
    private string $payloadLines;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public function getId(): ?int { return $this->id; }
    public function getBatch(): StaffPlannerExportBatch { return $this->batch; }
    public function getYearsResident(): YearsResident { return $this->yearsResident; }
    public function getMonth(): int { return $this->month; }
    public function getCalendarYear(): int { return $this->calendarYear; }
    public function getDataFingerprint(): string { return $this->dataFingerprint; }
    public function isValidatedByMdsAtExport(): bool { return $this->validatedByMdsAtExport; }
    public function getTimesheetCount(): int { return $this->timesheetCount; }
    public function getGardeHospitalCount(): int { return $this->gardeHospitalCount; }
    public function getAbsenceCount(): int { return $this->absenceCount; }
    public function getTotalMinutes(): int { return $this->totalMinutes; }
    public function getWorkerHRIDAtExport(): ?string { return $this->workerHRIDAtExport; }
    public function getSectionHRIDAtExport(): ?string { return $this->sectionHRIDAtExport; }
    public function getPayloadLines(): string { return $this->payloadLines; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    // ── Setters (called once at creation, never again) ────────────────────────

    public function setBatch(StaffPlannerExportBatch $batch): self { $this->batch = $batch; return $this; }
    public function setYearsResident(YearsResident $yr): self { $this->yearsResident = $yr; return $this; }
    public function setMonth(int $m): self { $this->month = $m; return $this; }
    public function setCalendarYear(int $y): self { $this->calendarYear = $y; return $this; }
    public function setDataFingerprint(string $fp): self { $this->dataFingerprint = $fp; return $this; }
    public function setValidatedByMdsAtExport(bool $v): self { $this->validatedByMdsAtExport = $v; return $this; }
    public function setTimesheetCount(int $n): self { $this->timesheetCount = $n; return $this; }
    public function setGardeHospitalCount(int $n): self { $this->gardeHospitalCount = $n; return $this; }
    public function setAbsenceCount(int $n): self { $this->absenceCount = $n; return $this; }
    public function setTotalMinutes(int $m): self { $this->totalMinutes = $m; return $this; }
    public function setWorkerHRIDAtExport(?string $h): self { $this->workerHRIDAtExport = $h; return $this; }
    public function setSectionHRIDAtExport(?string $h): self { $this->sectionHRIDAtExport = $h; return $this; }
    public function setPayloadLines(string $lines): self { $this->payloadLines = $lines; return $this; }
}
