<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\HospitalAdminAuditLogRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: HospitalAdminAuditLogRepository::class)]
#[ORM\Index(columns: ['hospital_admin_id', 'created_at'], name: 'idx_audit_admin_date')]
#[ORM\Index(columns: ['hospital_id', 'created_at'], name: 'idx_audit_hospital_date')]
class HospitalAdminAuditLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /** ID du HospitalAdmin (ou Manager promu) qui a effectué l'action */
    #[ORM\Column(type: 'integer')]
    private int $hospitalAdminId;

    /** Nom affiché de l'auteur (snapshot au moment de l'action) */
    #[ORM\Column(type: 'string', length: 255)]
    private string $adminName;

    #[ORM\Column(type: 'integer')]
    private int $hospitalId;

    /**
     * Type d'action : create_maccs, delete_maccs, retire_maccs, resend_invite_maccs,
     *                  create_manager, delete_manager, retire_manager, resend_invite_manager,
     *                  import_csv, bulk_edit, create_year, update_year, delete_year
     */
    #[ORM\Column(type: 'string', length: 50)]
    private string $action;

    /** Type d'entité concernée : resident, manager, year */
    #[ORM\Column(type: 'string', length: 50)]
    private string $entityType;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $entityId = null;

    /** Description lisible de l'action (ex: "MACCS jean@test.com ajouté à Année 2026") */
    #[ORM\Column(type: 'string', length: 500)]
    private string $description;

    /** Snapshot JSON des changements {old: ..., new: ...} — optionnel */
    /** @var array<string, mixed>|null */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $changes = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getHospitalAdminId(): int { return $this->hospitalAdminId; }
    public function setHospitalAdminId(int $id): self { $this->hospitalAdminId = $id; return $this; }

    public function getAdminName(): string { return $this->adminName; }
    public function setAdminName(string $name): self { $this->adminName = $name; return $this; }

    public function getHospitalId(): int { return $this->hospitalId; }
    public function setHospitalId(int $id): self { $this->hospitalId = $id; return $this; }

    public function getAction(): string { return $this->action; }
    public function setAction(string $action): self { $this->action = $action; return $this; }

    public function getEntityType(): string { return $this->entityType; }
    public function setEntityType(string $type): self { $this->entityType = $type; return $this; }

    public function getEntityId(): ?int { return $this->entityId; }
    public function setEntityId(?int $id): self { $this->entityId = $id; return $this; }

    public function getDescription(): string { return $this->description; }
    public function setDescription(string $desc): self { $this->description = $desc; return $this; }

    /** @return array<string, mixed>|null */
    public function getChanges(): ?array { return $this->changes; }
    /** @param array<string, mixed>|null $changes */
    public function setChanges(?array $changes): self { $this->changes = $changes; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $dt): self { $this->createdAt = $dt; return $this; }
}
