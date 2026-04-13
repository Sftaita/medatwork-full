<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\AbsenceType;
use App\Repository\AbsenceRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AbsenceRepository::class)]
class Absence implements IsEditableInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Resident::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Resident $resident = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'absences')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    #[ORM\Column(enumType: AbsenceType::class)]
    private AbsenceType $type;

    #[ORM\Column(type: 'date', nullable: true)]
    private ?\DateTimeInterface $dateOfStart = null;

    #[ORM\Column(type: 'date', nullable: true)]
    private ?\DateTimeInterface $dateOfEnd = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

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

    public function getType(): ?AbsenceType
    {
        return $this->type;
    }

    public function setType(AbsenceType $type): self
    {
        $this->type = $type;

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

    public function setDateOfEnd(?\DateTimeInterface $dateOfEnd): self
    {
        $this->dateOfEnd = $dateOfEnd;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

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
