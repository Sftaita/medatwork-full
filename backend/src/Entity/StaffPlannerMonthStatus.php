<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerMonthStatusRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Tracks whether a given calendar month of an academic year has been exported
 * to Staff Planner (treated) and when/by whom.
 *
 * Unique constraint: one record per (year, month, calendarYear).
 */
#[ORM\Entity(repositoryClass: StaffPlannerMonthStatusRepository::class)]
#[ORM\UniqueConstraint(name: 'uq_sp_month', columns: ['year_id', 'month', 'calendar_year'])]
class StaffPlannerMonthStatus
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Years::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Years $year;

    /** Calendar month number: 1–12 */
    #[ORM\Column(type: 'smallint')]
    private int $month;

    /** Calendar year (e.g. 2024) */
    #[ORM\Column(type: 'smallint')]
    private int $calendarYear;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $treated = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $treatedAt = null;

    #[ORM\ManyToOne(targetEntity: Manager::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Manager $treatedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastGeneratedAt = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $downloadCount = 0;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getYear(): Years { return $this->year; }
    public function setYear(Years $year): self { $this->year = $year; return $this; }

    public function getMonth(): int { return $this->month; }
    public function setMonth(int $month): self { $this->month = $month; return $this; }

    public function getCalendarYear(): int { return $this->calendarYear; }
    public function setCalendarYear(int $calendarYear): self { $this->calendarYear = $calendarYear; return $this; }

    public function isTreated(): bool { return $this->treated; }
    public function setTreated(bool $treated): self { $this->treated = $treated; return $this; }

    public function getTreatedAt(): ?\DateTimeInterface { return $this->treatedAt; }
    public function setTreatedAt(?\DateTimeInterface $treatedAt): self { $this->treatedAt = $treatedAt; return $this; }

    public function getTreatedBy(): ?Manager { return $this->treatedBy; }
    public function setTreatedBy(?Manager $treatedBy): self { $this->treatedBy = $treatedBy; return $this; }

    public function getLastGeneratedAt(): ?\DateTimeInterface { return $this->lastGeneratedAt; }
    public function setLastGeneratedAt(?\DateTimeInterface $dt): self { $this->lastGeneratedAt = $dt; return $this; }

    public function getDownloadCount(): int { return $this->downloadCount; }
    public function incrementDownloadCount(): self { $this->downloadCount++; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $updatedAt): self { $this->updatedAt = $updatedAt; return $this; }

    public function touch(): self
    {
        $this->updatedAt = new \DateTime();
        return $this;
    }
}
