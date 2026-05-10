<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerExportStatusRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Tracks whether a specific (MACCS × month) combination has been exported to Staff Planner.
 * Key: (yearsResident, month, calendarYear) — independent of ResidentValidation existence.
 *
 * treatedByType is polymorphic: 'manager' | 'hospital_admin' | 'app_admin'.
 * No FK constraint on treatedBy — avoids multi-table FK complexity.
 *
 * downloadCount increments each time this item is included in a Staff Planner generation.
 * lastGeneratedAt is updated on each generation (not on manual toggle).
 */
#[ORM\Entity(repositoryClass: StaffPlannerExportStatusRepository::class)]
#[ORM\UniqueConstraint(name: 'uq_sp_export', columns: ['years_resident_id', 'month', 'calendar_year'])]
class StaffPlannerExportStatus
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: YearsResident::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private YearsResident $yearsResident;

    /** Calendar month: 1–12 */
    #[ORM\Column(type: 'smallint')]
    private int $month;

    /** Calendar year (e.g. 2024) */
    #[ORM\Column(type: 'smallint')]
    private int $calendarYear;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $treated = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $treatedAt = null;

    /** 'manager' | 'hospital_admin' | 'app_admin' | null */
    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    private ?string $treatedByType = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $treatedById = null;

    /** Number of times this item was included in a Staff Planner export generation. */
    #[ORM\Column(type: 'smallint', options: ['default' => 0])]
    private int $downloadCount = 0;

    /** Timestamp of the last Staff Planner generation including this item. */
    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastGeneratedAt = null;

    // ── Phase 5 : Lock RH ────────────────────────────────────────────────────

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $locked = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lockedAt = null;

    /** 'manager' | 'hospital_admin' | 'app_admin' */
    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    private ?string $lockedByType = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $lockedById = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $lockReason = null;

    // ── Phase 1 V2 : dirty flag + fingerprint ─────────────────────────────────

    /** True if data changed after the last export. Reset to false on next export. */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $dirtySinceExport = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $dirtyAt = null;

    /** e.g. 'timesheet_added' | 'garde_modified' | 'absence_deleted' | 'validation_changed' */
    #[ORM\Column(type: 'string', length: 60, nullable: true)]
    private ?string $dirtyReason = null;

    /** SHA-256 of the canonical monthly data at last export. Null before first export. */
    #[ORM\Column(type: 'string', length: 64, nullable: true)]
    private ?string $dataFingerprint = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $fingerprintComputedAt = null;

    // ─────────────────────────────────────────────────────────────────────────

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $now             = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): ?int { return $this->id; }

    public function getYearsResident(): YearsResident { return $this->yearsResident; }
    public function setYearsResident(YearsResident $yr): self { $this->yearsResident = $yr; return $this; }

    public function getMonth(): int { return $this->month; }
    public function setMonth(int $m): self { $this->month = $m; return $this; }

    public function getCalendarYear(): int { return $this->calendarYear; }
    public function setCalendarYear(int $y): self { $this->calendarYear = $y; return $this; }

    public function isTreated(): bool { return $this->treated; }
    public function setTreated(bool $treated): self { $this->treated = $treated; return $this; }
    public function getTreatedAt(): ?\DateTimeInterface { return $this->treatedAt; }
    public function setTreatedAt(?\DateTimeInterface $at): self { $this->treatedAt = $at; return $this; }
    public function getTreatedByType(): ?string { return $this->treatedByType; }
    public function getTreatedById(): ?int { return $this->treatedById; }

    public function getDownloadCount(): int { return $this->downloadCount; }
    public function getLastGeneratedAt(): ?\DateTimeInterface { return $this->lastGeneratedAt; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }

    // ── Phase 5 — Lock RH accessors & methods ────────────────────────────────

    public function isLocked(): bool { return $this->locked; }
    public function getLockedAt(): ?\DateTimeInterface { return $this->lockedAt; }
    public function getLockedByType(): ?string { return $this->lockedByType; }
    public function getLockedById(): ?int { return $this->lockedById; }
    public function getLockReason(): ?string { return $this->lockReason; }

    public function lock(string $byType, int $byId, ?string $reason = null): self
    {
        $this->locked       = true;
        $this->lockedAt     = new \DateTime();
        $this->lockedByType = $byType;
        $this->lockedById   = $byId;
        $this->lockReason   = $reason;
        return $this->touch();
    }

    public function unlock(): self
    {
        $this->locked       = false;
        $this->lockedAt     = null;
        $this->lockedByType = null;
        $this->lockedById   = null;
        $this->lockReason   = null;
        return $this->touch();
    }

    // ── Phase 1 V2 accessors ──────────────────────────────────────────────────

    public function isDirtySinceExport(): bool { return $this->dirtySinceExport; }
    public function getDirtyAt(): ?\DateTimeInterface { return $this->dirtyAt; }
    public function getDirtyReason(): ?string { return $this->dirtyReason; }
    public function getDataFingerprint(): ?string { return $this->dataFingerprint; }
    public function getFingerprintComputedAt(): ?\DateTimeInterface { return $this->fingerprintComputedAt; }

    public function markDirty(string $reason): self
    {
        $this->dirtySinceExport = true;
        $this->dirtyAt          = new \DateTime();
        $this->dirtyReason      = $reason;
        return $this->touch();
    }

    public function clearDirty(): self
    {
        $this->dirtySinceExport = false;
        $this->dirtyAt          = null;
        $this->dirtyReason      = null;
        return $this->touch();
    }

    public function updateFingerprint(string $fingerprint): self
    {
        $this->dataFingerprint       = $fingerprint;
        $this->fingerprintComputedAt = new \DateTime();
        return $this->touch();
    }

    // ─────────────────────────────────────────────────────────────────────────

    /** Returns true if there has been at least one export (used to guard dirty marking). */
    public function hasBeenExported(): bool
    {
        return $this->downloadCount > 0 || $this->lastGeneratedAt !== null;
    }

    public function touch(): self { $this->updatedAt = new \DateTime(); return $this; }

    public function markTreated(string $byType, int $byId): self
    {
        $this->treated       = true;
        $this->treatedAt     = new \DateTime();
        $this->treatedByType = $byType;
        $this->treatedById   = $byId;
        return $this->touch();
    }

    public function markUntreated(): self
    {
        $this->treated       = false;
        $this->treatedAt     = null;
        $this->treatedByType = null;
        $this->treatedById   = null;
        return $this->touch();
    }

    /**
     * Called when this item is included in an actual Staff Planner export.
     * Increments downloadCount, records generation timestamp, and clears dirty flag.
     * Independent from markTreated — an export always records generation,
     * but manual toggles do not.
     */
    public function recordGeneration(): self
    {
        $this->downloadCount++;
        $this->lastGeneratedAt = new \DateTime();
        $this->clearDirty();
        return $this->touch();
    }
}
