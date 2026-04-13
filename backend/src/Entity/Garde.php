<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\GardeType;
use App\Repository\GardeRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: GardeRepository::class)]
class Garde implements IsEditableInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Resident::class, inversedBy: 'gardes')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Resident $resident = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'gardes')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $dateOfStart;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $dateOfEnd;

    #[ORM\Column(enumType: GardeType::class)]
    private GardeType $type;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 250, maxMessage: 'Your comment cannot be longer than {{ limit }} characters')]
    private ?string $comment = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $isEditable = true;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getResident(): ?Resident
    {
        return $this->resident;
    }

    public function setResident(?Resident $resident): self
    {
        $this->resident = $resident;

        return $this;
    }

    public function getYear(): ?Years
    {
        return $this->year;
    }

    public function setYear(?Years $year): self
    {
        $this->year = $year;

        return $this;
    }

    public function getDateOfStart(): ?\DateTimeInterface
    {
        return $this->dateOfStart;
    }

    public function setDateOfStart(\DateTimeInterface $dateOfStart): self
    {
        $this->dateOfStart = $dateOfStart;

        return $this;
    }

    public function getDateOfEnd(): ?\DateTimeInterface
    {
        return $this->dateOfEnd;
    }

    public function setDateOfEnd(\DateTimeInterface $dateOfEnd): self
    {
        $this->dateOfEnd = $dateOfEnd;

        return $this;
    }

    public function getType(): ?GardeType
    {
        return $this->type;
    }

    public function setType(GardeType $type): self
    {
        $this->type = $type;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(?string $comment): self
    {
        $this->comment = $comment;

        return $this;
    }

    public function getIsEditable(): ?bool
    {
        return $this->isEditable;
    }

    public function setIsEditable(?bool $isEditable): static
    {
        $this->isEditable = $isEditable;

        return $this;
    }
}
