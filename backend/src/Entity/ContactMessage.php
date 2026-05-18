<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ContactMessageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ContactMessageRepository::class)]
#[ORM\Table(name: 'contact_message')]
#[ORM\Index(columns: ['created_at'], name: 'idx_contact_created')]
#[ORM\Index(columns: ['treated_at'], name: 'idx_contact_treated')]
class ContactMessage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 100)]
    private string $firstname;

    #[ORM\Column(type: 'string', length: 100)]
    private string $lastname;

    #[ORM\Column(type: 'string', length: 255)]
    private string $email;

    #[ORM\Column(type: 'text')]
    private string $message;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $treatedAt = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $treatedBy = null;

    public function __construct(string $firstname, string $lastname, string $email, string $message)
    {
        $this->firstname = $firstname;
        $this->lastname  = $lastname;
        $this->email     = $email;
        $this->message   = $message;
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getFirstname(): string { return $this->firstname; }
    public function getLastname(): string { return $this->lastname; }
    public function getEmail(): string { return $this->email; }
    public function getMessage(): string { return $this->message; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getTreatedAt(): ?\DateTimeInterface { return $this->treatedAt; }
    public function getTreatedBy(): ?string { return $this->treatedBy; }
    public function isTreated(): bool { return $this->treatedAt !== null; }

    public function markTreated(string $by): self
    {
        $this->treatedAt = new \DateTime();
        $this->treatedBy = $by;
        return $this;
    }
}
