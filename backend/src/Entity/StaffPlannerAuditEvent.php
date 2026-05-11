<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerAuditEventRepository;
use Doctrine\ORM\Mapping as ORM;
// Note: Years and StaffPlannerExportBatch imported for new Phase 6 fields

/**
 * Append-only audit trail for Staff Planner RH events (Phase 5 → Phase 6).
 *
 * eventType catalogue:
 *   rh_lock_applied              — period locked by RH
 *   rh_lock_removed              — lock lifted
 *   export_generated             — Staff Planner export batch created
 *   timesheet_created            — resident added a timesheet
 *   timesheet_modified           — resident modified a timesheet
 *   timesheet_deleted            — resident deleted a timesheet
 *   garde_created                — resident added a garde
 *   garde_deleted                — resident deleted a garde
 *   absence_created              — resident added an absence
 *   absence_deleted              — resident deleted an absence
 *   validation_accepted          — MDS validated a resident period
 *   validation_rejected          — MDS invalidated a resident period
 *   validation_blocked_by_lock   — validation attempt blocked (period locked)
 *   blocked_modification_attempt — data change attempt blocked (period locked)
 *
 * Never updated after creation.
 * yearsResident/year/batch are SET NULL on deletion to preserve history.
 */
#[ORM\Entity(repositoryClass: StaffPlannerAuditEventRepository::class)]
#[ORM\Table(name: 'staff_planner_audit_event')]
#[ORM\Index(columns: ['years_resident_id', 'occurred_at'], name: 'idx_audit_maccs_date')]
#[ORM\Index(columns: ['event_type', 'occurred_at'],        name: 'idx_audit_type_date')]
#[ORM\Index(columns: ['occurred_at'],                      name: 'idx_audit_date')]
#[ORM\Index(columns: ['year_id', 'occurred_at'],           name: 'idx_audit_year')]
#[ORM\Index(columns: ['actor_type', 'actor_id', 'occurred_at'], name: 'idx_audit_actor')]
#[ORM\Index(columns: ['month', 'calendar_year', 'occurred_at'], name: 'idx_audit_period')]
#[ORM\Index(columns: ['batch_id'],                         name: 'idx_audit_batch')]
class StaffPlannerAuditEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private ?int $id = null;

    /** @var string 'rh_lock_applied' | 'rh_lock_removed' */
    #[ORM\Column(type: 'string', length: 60)]
    private string $eventType;

    /** SET NULL on MACCS deletion — preserves history */
    #[ORM\ManyToOne(targetEntity: YearsResident::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?YearsResident $yearsResident = null;

    /** Year — for global timeline filtering; SET NULL if year deleted */
    #[ORM\ManyToOne(targetEntity: Years::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Years $year = null;

    /** Export batch — for batch timeline (export_generated events) */
    #[ORM\ManyToOne(targetEntity: StaffPlannerExportBatch::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?StaffPlannerExportBatch $batch = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $month = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $calendarYear = null;

    /** 'manager' | 'hospital_admin' | 'app_admin' | 'system' */
    #[ORM\Column(type: 'string', length: 30)]
    private string $actorType;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $actorId = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $occurredAt;

    /** Event-specific payload: lockReason, previous state, etc. */
    #[ORM\Column(type: 'json')]
    private array $context = [];

    public function __construct(
        string $eventType,
        string $actorType,
        ?int $actorId,
        array $context = [],
    ) {
        $this->eventType  = $eventType;
        $this->actorType  = $actorType;
        $this->actorId    = $actorId;
        $this->occurredAt = new \DateTimeImmutable();
        $this->context    = $context;
    }

    public function getId(): ?int { return $this->id; }
    public function getEventType(): string { return $this->eventType; }
    public function getYearsResident(): ?YearsResident { return $this->yearsResident; }
    public function getYear(): ?Years { return $this->year; }
    public function getBatch(): ?StaffPlannerExportBatch { return $this->batch; }
    public function getMonth(): ?int { return $this->month; }
    public function getCalendarYear(): ?int { return $this->calendarYear; }
    public function getActorType(): string { return $this->actorType; }
    public function getActorId(): ?int { return $this->actorId; }
    public function getOccurredAt(): \DateTimeImmutable { return $this->occurredAt; }
    public function getContext(): array { return $this->context; }

    public function setYearsResident(?YearsResident $yr): self
    {
        $this->yearsResident = $yr;
        return $this;
    }

    public function setYear(?Years $year): self { $this->year = $year; return $this; }
    public function setBatch(?StaffPlannerExportBatch $batch): self { $this->batch = $batch; return $this; }
    public function setMonth(?int $m): self { $this->month = $m; return $this; }
    public function setCalendarYear(?int $y): self { $this->calendarYear = $y; return $this; }
}
