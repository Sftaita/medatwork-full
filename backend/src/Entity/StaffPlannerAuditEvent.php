<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerAuditEventRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Append-only audit trail for Staff Planner lock/unlock events.
 *
 * Events recorded:
 *   rh_lock_applied   — a period was locked by an RH actor
 *   rh_lock_removed   — a lock was lifted
 *
 * Never updated after creation. yearsResidentId is SET NULL on MACCS deletion
 * to preserve the audit trail even if the MACCS is removed.
 */
#[ORM\Entity(repositoryClass: StaffPlannerAuditEventRepository::class)]
#[ORM\Table(name: 'staff_planner_audit_event')]
#[ORM\Index(columns: ['years_resident_id', 'occurred_at'], name: 'idx_audit_maccs_date')]
#[ORM\Index(columns: ['event_type', 'occurred_at'],        name: 'idx_audit_type_date')]
#[ORM\Index(columns: ['occurred_at'],                      name: 'idx_audit_date')]
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

    public function setMonth(?int $m): self { $this->month = $m; return $this; }
    public function setCalendarYear(?int $y): self { $this->calendarYear = $y; return $this; }
}
