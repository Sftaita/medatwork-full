<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerExportBatchRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * Represents one Staff Planner export generation event.
 *
 * Append-only — never updated after creation.
 * One batch per call to POST /api/managers/SPImport (if at least one item was exported).
 *
 * batchNumber is sequential per year (1, 2, 3 …) — used for human-readable audit references.
 * fileHash (SHA-256) allows verifying the integrity of the generated .txt file.
 *
 * Polymorphic actor: generatedByType ∈ { 'manager', 'hospital_admin', 'app_admin' }
 * No FK on generatedById to avoid multi-table join complexity.
 */
#[ORM\Entity(repositoryClass: StaffPlannerExportBatchRepository::class)]
#[ORM\Table(name: 'staff_planner_export_batch')]
#[ORM\UniqueConstraint(name: 'uq_batch_year_number', columns: ['year_id', 'batch_number'])]
#[ORM\Index(columns: ['year_id', 'generated_at'], name: 'idx_batch_year_date')]
class StaffPlannerExportBatch
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /** Year the export belongs to. RESTRICT: an audit trail must not disappear with the year. */
    #[ORM\ManyToOne(targetEntity: Years::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Years $year;

    /** Sequential number within the year (1-based). Unique per year. */
    #[ORM\Column(type: 'smallint')]
    private int $batchNumber;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $generatedAt;

    /** 'manager' | 'hospital_admin' | 'app_admin' */
    #[ORM\Column(type: 'string', length: 30)]
    private string $generatedByType;

    /** ID of the actor — polymorphic, no FK. */
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $generatedById = null;

    /** Number of MACCS snapshots in this batch. */
    #[ORM\Column(type: 'smallint')]
    private int $itemCount;

    /** SHA-256 of the generated .txt file content. */
    #[ORM\Column(type: 'string', length: 64)]
    private string $fileHash;

    /** File size in bytes. */
    #[ORM\Column(type: 'integer')]
    private int $fileSizeBytes;

    /** Optional note from the actor (e.g. "export de clôture décembre"). */
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, StaffPlannerExportItemSnapshot> */
    #[ORM\OneToMany(targetEntity: StaffPlannerExportItemSnapshot::class, mappedBy: 'batch', orphanRemoval: true)]
    private Collection $snapshots;

    public function __construct()
    {
        $now              = new \DateTimeImmutable();
        $this->generatedAt = $now;
        $this->createdAt   = $now;
        $this->snapshots   = new ArrayCollection();
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public function getId(): ?int { return $this->id; }
    public function getYear(): Years { return $this->year; }
    public function getBatchNumber(): int { return $this->batchNumber; }
    public function getGeneratedAt(): \DateTimeImmutable { return $this->generatedAt; }
    public function getGeneratedByType(): string { return $this->generatedByType; }
    public function getGeneratedById(): ?int { return $this->generatedById; }
    public function getItemCount(): int { return $this->itemCount; }
    public function getFileHash(): string { return $this->fileHash; }
    public function getFileSizeBytes(): int { return $this->fileSizeBytes; }
    public function getNotes(): ?string { return $this->notes; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    /** @return Collection<int, StaffPlannerExportItemSnapshot> */
    public function getSnapshots(): Collection { return $this->snapshots; }

    // ── Setters (called once at creation, never again) ────────────────────────

    public function setYear(Years $year): self { $this->year = $year; return $this; }
    public function setBatchNumber(int $n): self { $this->batchNumber = $n; return $this; }
    public function setGeneratedByType(string $t): self { $this->generatedByType = $t; return $this; }
    public function setGeneratedById(?int $id): self { $this->generatedById = $id; return $this; }
    public function setItemCount(int $n): self { $this->itemCount = $n; return $this; }
    public function setFileHash(string $h): self { $this->fileHash = $h; return $this; }
    public function setFileSizeBytes(int $b): self { $this->fileSizeBytes = $b; return $this; }
    public function setNotes(?string $notes): self { $this->notes = $notes; return $this; }
}
