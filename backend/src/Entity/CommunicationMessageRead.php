<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CommunicationMessageReadRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Tracks which user has read which CommunicationMessage.
 * One record = one user has read one message (at most once per user).
 */
#[ORM\Entity(repositoryClass: CommunicationMessageReadRepository::class)]
#[ORM\UniqueConstraint(name: 'uq_comm_read', columns: ['communication_message_id', 'user_type', 'user_id'])]
#[ORM\Index(columns: ['user_type', 'user_id'], name: 'idx_comm_read_user')]
class CommunicationMessageRead
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CommunicationMessage::class, inversedBy: 'reads')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private CommunicationMessage $communicationMessage;

    /** 'manager' | 'resident' | 'hospital_admin' */
    #[ORM\Column(type: 'string', length: 30)]
    private string $userType;

    #[ORM\Column(type: 'integer')]
    private int $userId;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $readAt;

    public function __construct()
    {
        $this->readAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getCommunicationMessage(): CommunicationMessage { return $this->communicationMessage; }
    public function setCommunicationMessage(CommunicationMessage $msg): self { $this->communicationMessage = $msg; return $this; }

    public function getUserType(): string { return $this->userType; }
    public function setUserType(string $userType): self { $this->userType = $userType; return $this; }

    public function getUserId(): int { return $this->userId; }
    public function setUserId(int $userId): self { $this->userId = $userId; return $this; }

    public function getReadAt(): \DateTimeInterface { return $this->readAt; }
    public function setReadAt(\DateTimeInterface $readAt): self { $this->readAt = $readAt; return $this; }
}
