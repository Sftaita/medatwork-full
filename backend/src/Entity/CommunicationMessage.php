<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CommunicationMessageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * A message (notification OR modal) sent by an admin to a set of users.
 *
 * Scope logic:
 *   scopeType = 'all'  → all active users (limited to hospital if hospital is set)
 *   scopeType = 'role' → all users with targetRole (limited to hospital if set)
 *   scopeType = 'user' → exactly one user (targetUserId + targetUserType)
 */
#[ORM\Entity(repositoryClass: CommunicationMessageRepository::class)]
#[ORM\Index(columns: ['type', 'is_active'], name: 'idx_comm_type_active')]
#[ORM\Index(columns: ['hospital_id', 'is_active'], name: 'idx_comm_hospital_active')]
class CommunicationMessage
{
    public const TYPE_NOTIFICATION = 'notification';
    public const TYPE_MODAL        = 'modal';

    public const SCOPE_ALL  = 'all';
    public const SCOPE_ROLE = 'role';
    public const SCOPE_USER = 'user';

    public const AUTHOR_SUPER_ADMIN    = 'super_admin';
    public const AUTHOR_HOSPITAL_ADMIN = 'hospital_admin';

    public const ROLE_MANAGER        = 'manager';
    public const ROLE_RESIDENT        = 'resident';
    public const ROLE_HOSPITAL_ADMIN  = 'hospital_admin';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    /** 'notification' | 'modal' */
    #[ORM\Column(type: 'string', length: 20)]
    private string $type;

    #[ORM\Column(type: 'string', length: 255)]
    private string $title;

    #[ORM\Column(type: 'text')]
    private string $body;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $linkUrl = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $buttonLabel = null;

    /** URL to navigate to when a notification is clicked. */
    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $targetUrl = null;

    /** Lower number = higher priority (for modal display order). */
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $priority = null;

    /** 'super_admin' | 'hospital_admin' */
    #[ORM\Column(type: 'string', length: 20)]
    private string $authorType;

    #[ORM\Column(type: 'integer')]
    private int $authorId;

    /** 'all' | 'role' | 'user' */
    #[ORM\Column(type: 'string', length: 20)]
    private string $scopeType;

    /** 'manager' | 'resident' | 'hospital_admin' — used when scopeType = 'role' */
    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    private ?string $targetRole = null;

    /**
     * When set, restricts delivery to users of this hospital.
     * Null = all hospitals (super_admin global broadcast).
     */
    #[ORM\ManyToOne(targetEntity: Hospital::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Hospital $hospital = null;

    /** Used when scopeType = 'user' */
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $targetUserId = null;

    /** 'manager' | 'resident' | 'hospital_admin' — used when scopeType = 'user' */
    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    private ?string $targetUserType = null;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    /** @var Collection<int, CommunicationMessageRead> */
    #[ORM\OneToMany(targetEntity: CommunicationMessageRead::class, mappedBy: 'communicationMessage', cascade: ['remove'])]
    private Collection $reads;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->reads     = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): self { $this->title = $title; return $this; }

    public function getBody(): string { return $this->body; }
    public function setBody(string $body): self { $this->body = $body; return $this; }

    public function getImageUrl(): ?string { return $this->imageUrl; }
    public function setImageUrl(?string $imageUrl): self { $this->imageUrl = $imageUrl; return $this; }

    public function getLinkUrl(): ?string { return $this->linkUrl; }
    public function setLinkUrl(?string $linkUrl): self { $this->linkUrl = $linkUrl; return $this; }

    public function getButtonLabel(): ?string { return $this->buttonLabel; }
    public function setButtonLabel(?string $buttonLabel): self { $this->buttonLabel = $buttonLabel; return $this; }

    public function getTargetUrl(): ?string { return $this->targetUrl; }
    public function setTargetUrl(?string $targetUrl): self { $this->targetUrl = $targetUrl; return $this; }

    public function getPriority(): ?int { return $this->priority; }
    public function setPriority(?int $priority): self { $this->priority = $priority; return $this; }

    public function getAuthorType(): string { return $this->authorType; }
    public function setAuthorType(string $authorType): self { $this->authorType = $authorType; return $this; }

    public function getAuthorId(): int { return $this->authorId; }
    public function setAuthorId(int $authorId): self { $this->authorId = $authorId; return $this; }

    public function getScopeType(): string { return $this->scopeType; }
    public function setScopeType(string $scopeType): self { $this->scopeType = $scopeType; return $this; }

    public function getTargetRole(): ?string { return $this->targetRole; }
    public function setTargetRole(?string $targetRole): self { $this->targetRole = $targetRole; return $this; }

    public function getHospital(): ?Hospital { return $this->hospital; }
    public function setHospital(?Hospital $hospital): self { $this->hospital = $hospital; return $this; }

    public function getTargetUserId(): ?int { return $this->targetUserId; }
    public function setTargetUserId(?int $targetUserId): self { $this->targetUserId = $targetUserId; return $this; }

    public function getTargetUserType(): ?string { return $this->targetUserType; }
    public function setTargetUserType(?string $targetUserType): self { $this->targetUserType = $targetUserType; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): self { $this->isActive = $isActive; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    /** @return Collection<int, CommunicationMessageRead> */
    public function getReads(): Collection { return $this->reads; }

    public function getReadCount(): int { return $this->reads->count(); }
}
