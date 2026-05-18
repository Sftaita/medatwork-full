<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ContactCcConfigRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ContactCcConfigRepository::class)]
#[ORM\Table(name: 'contact_cc_config')]
class ContactCcConfig
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private string $email;

    #[ORM\Column(type: 'string', length: 100)]
    private string $name;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    public function getId(): ?int { return $this->id; }
    public function getEmail(): string { return $this->email; }
    public function getName(): string { return $this->name; }
    public function isActive(): bool { return $this->isActive; }

    public function setEmail(string $email): self { $this->email = $email; return $this; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function setIsActive(bool $active): self { $this->isActive = $active; return $this; }
}
