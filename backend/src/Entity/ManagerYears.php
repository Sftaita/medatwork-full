<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ManagerYearsRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ManagerYearsRepository::class)]
class ManagerYears
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Manager::class, inversedBy: 'managerYears')]
    private ?Manager $manager = null;

    #[ORM\Column(type: 'boolean')]
    private bool $owner;

    #[ORM\Column(type: 'boolean')]
    private bool $dataAccess;

    #[ORM\Column(type: 'boolean')]
    private bool $dataValidation;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'managers')]
    private ?Years $years = null;

    #[ORM\Column(type: 'boolean')]
    private bool $admin;

    #[ORM\Column(type: 'boolean')]
    private bool $dataDownload;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $invitedAt = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $canManageAgenda = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $hasAgendaAccess = null;



    public function getId(): ?int
    {
        return $this->id;
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

    public function getOwner(): ?bool
    {
        return $this->owner;
    }

    public function setOwner(bool $owner): self
    {
        $this->owner = $owner;

        return $this;
    }

    public function getDataAccess(): ?bool
    {
        return $this->dataAccess;
    }

    public function setDataAccess(bool $dataAccess): self
    {
        $this->dataAccess = $dataAccess;

        return $this;
    }

    public function getDataValidation(): ?bool
    {
        return $this->dataValidation;
    }

    public function setDataValidation(bool $dataValidation): self
    {
        $this->dataValidation = $dataValidation;

        return $this;
    }

    public function getYears(): ?Years
    {
        return $this->years;
    }

    public function setYears(?Years $years): self
    {
        $this->years = $years;

        return $this;
    }

    public function getAdmin(): ?bool
    {
        return $this->admin;
    }

    public function setAdmin(bool $admin): self
    {
        $this->admin = $admin;

        return $this;
    }

    public function getDataDownload(): ?bool
    {
        return $this->dataDownload;
    }

    public function setDataDownload(bool $dataDownload): self
    {
        $this->dataDownload = $dataDownload;

        return $this;
    }

    public function getInvitedAt(): ?\DateTimeImmutable
    {
        return $this->invitedAt;
    }

    public function setInvitedAt(?\DateTimeImmutable $invitedAt): self
    {
        $this->invitedAt = $invitedAt;

        return $this;
    }

    public function getCanManageAgenda(): ?bool
    {
        return $this->canManageAgenda;
    }

    public function setCanManageAgenda(?bool $canManageAgenda): self
    {
        $this->canManageAgenda = $canManageAgenda;

        return $this;
    }

    public function getHasAgendaAccess(): ?bool
    {
        return $this->hasAgendaAccess;
    }

    public function setHasAgendaAccess(?bool $hasAgendaAccess): self
    {
        $this->hasAgendaAccess = $hasAgendaAccess;

        return $this;
    }

}
