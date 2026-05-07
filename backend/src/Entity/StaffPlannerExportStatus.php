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

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new \DateTime();
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
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }

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
}
