<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\NotificationManagerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NotificationManagerRepository::class)]
class NotificationManager
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $object;

    #[ORM\Column(type: 'text')]
    private string $body;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'boolean')]
    private bool $isRead;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $readAt = null;

    #[ORM\ManyToOne(targetEntity: Manager::class, inversedBy: 'notificationManagers')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Manager $manager = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $type;

    /**
     * Contexte structuré de la notification (deep link, sévérité, entité cible).
     * Format : { version: 1, yearId?: int, yearTitle?: string, tab?: string, severity?: string, ... }
     * Nullable : NULL pour les notifications historiques créées avant P2-C.
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $metadata = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getObject(): ?string
    {
        return $this->object;
    }

    public function setObject(string $object): self
    {
        $this->object = $object;

        return $this;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    public function setBody(string $body): self
    {
        $this->body = $body;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getIsRead(): ?bool
    {
        return $this->isRead;
    }

    public function setIsRead(bool $isRead): self
    {
        $this->isRead = $isRead;

        return $this;
    }

    public function getReadAt(): ?\DateTimeInterface
    {
        return $this->readAt;
    }

    public function setReadAt(?\DateTimeInterface $readAt): self
    {
        $this->readAt = $readAt;

        return $this;
    }

    public function getManager(): ?Manager
    {
        return $this->manager;
    }

    public function setManager(?Manager $manager): self
    {
        $this->manager = $manager;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;

        return $this;
    }

    /** @return array<string, mixed>|null */
    public function getMetadata(): ?array
    {
        return $this->metadata;
    }

    /** @param array<string, mixed>|null $metadata */
    public function setMetadata(?array $metadata): self
    {
        $this->metadata = $metadata;

        return $this;
    }
}
