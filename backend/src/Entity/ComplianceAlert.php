<?php

declare(strict_types=1);

namespace App\Entity;

use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;
use App\Repository\ComplianceAlertRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Persists a detected compliance anomaly.
 *
 * Fingerprint deduplication: one alert per (resident, issueType, weekStart).
 * Status lifecycle: open → acknowledged → resolved.
 */
#[ORM\Entity(repositoryClass: ComplianceAlertRepository::class)]
#[ORM\UniqueConstraint(name: 'uq_compliance_alert_fingerprint', columns: ['fingerprint'])]
#[ORM\Index(columns: ['resident_id', 'status'], name: 'idx_compliance_alert_resident_status')]
class ComplianceAlert
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Resident::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Resident $resident;

    #[ORM\Column(type: 'string', length: 64, enumType: ComplianceIssueType::class)]
    private ComplianceIssueType $issueType;

    #[ORM\Column(type: 'string', length: 16, enumType: ComplianceSeverity::class)]
    private ComplianceSeverity $severity;

    /** ISO-8601 date of the Monday that starts the offending week, e.g. "2026-03-23" */
    #[ORM\Column(type: 'string', length: 10)]
    private string $weekStart;

    /**
     * SHA-256 of residentId + issueType + weekStart.
     * Used to prevent duplicate alerts for the same violation.
     */
    #[ORM\Column(type: 'string', length: 64, unique: true)]
    private string $fingerprint;

    /** open | acknowledged | resolved */
    #[ORM\Column(type: 'string', length: 20)]
    private string $status = 'open';

    /** Computed hours or other context values */
    #[ORM\Column(type: 'json')]
    private array $context = [];

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $detectedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    public function __construct(
        Resident $resident,
        ComplianceIssueType $issueType,
        ComplianceSeverity $severity,
        string $weekStart,
        array $context = [],
    ) {
        $this->resident    = $resident;
        $this->issueType   = $issueType;
        $this->severity    = $severity;
        $this->weekStart   = $weekStart;
        $this->context     = $context;
        $this->detectedAt  = new \DateTimeImmutable();
        $this->fingerprint = hash('sha256', $resident->getId().$issueType->value.$weekStart);
    }

    public function getId(): ?int { return $this->id; }

    public function getResident(): Resident { return $this->resident; }

    public function getIssueType(): ComplianceIssueType { return $this->issueType; }

    public function getSeverity(): ComplianceSeverity { return $this->severity; }

    public function getWeekStart(): string { return $this->weekStart; }

    public function getFingerprint(): string { return $this->fingerprint; }

    public function getStatus(): string { return $this->status; }

    public function getContext(): array { return $this->context; }

    public function getDetectedAt(): \DateTimeImmutable { return $this->detectedAt; }

    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }

    public function acknowledge(): void
    {
        if ($this->status === 'open') {
            $this->status = 'acknowledged';
        }
    }

    public function resolve(): void
    {
        $this->status     = 'resolved';
        $this->resolvedAt = new \DateTimeImmutable();
    }

    public function reopen(): void
    {
        $this->status     = 'open';
        $this->resolvedAt = null;
    }
}
