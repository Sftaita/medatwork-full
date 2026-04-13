<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TimesheetRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TimesheetRepository::class)]
class Timesheet implements IsEditableInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups(['timesheet_read'])]
    private ?int $id = null;

    #[ORM\Column(type: 'datetime')]
    #[Groups(['timesheet_read'])]
    #[Assert\NotBlank(message: 'Quelle est la date de début')]
    private \DateTimeInterface $dateOfStart;

    #[ORM\Column(type: 'datetime')]
    #[Groups(['timesheet_read'])]
    #[Assert\NotBlank(message: 'Quelle est la date de fin')]
    private \DateTimeInterface $dateOfEnd;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups(['timesheet_read'])]
    private ?int $pause = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups(['timesheet_read'])]
    private ?int $scientific = null;

    #[ORM\ManyToOne(targetEntity: Resident::class, inversedBy: 'timesheets')]
    #[Groups(['timesheet_read'])]
    #[Assert\NotBlank(message: 'A qui appartient cette feuille horaire')]
    private ?Resident $resident = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'timesheets')]
    #[Groups(['timesheet_read'])]
    #[Assert\NotBlank(message: 'A quelle année appartient cette feuille horaire')]
    private ?Years $year = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups(['timesheet_read'])]
    private ?bool $called = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $isEditable = true;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getPause(): ?int
    {
        return $this->pause;
    }

    public function setPause(?int $pause): self
    {
        $this->pause = $pause;

        return $this;
    }

    public function getScientific(): ?int
    {
        return $this->scientific;
    }

    public function setScientific(?int $scientific): self
    {
        $this->scientific = $scientific;

        return $this;
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

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getCalled(): ?bool
    {
        return $this->called;
    }

    public function setCalled(?bool $called): self
    {
        $this->called = $called;

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
