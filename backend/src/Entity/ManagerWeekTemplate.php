<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ManagerWeekTemplateRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ManagerWeekTemplateRepository::class)]
class ManagerWeekTemplate
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Manager::class, inversedBy: 'managerWeekTemplates')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Manager $manager = null;

    #[ORM\ManyToOne(targetEntity: WeekTemplates::class, inversedBy: 'managerWeekTemplates')]
    #[ORM\JoinColumn(nullable: true)]
    private ?WeekTemplates $weekTemplate = null;

    #[ORM\Column(type: 'boolean')]
    private bool $canEdit;

    #[ORM\Column(type: 'boolean')]
    private bool $canShare;

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

    public function getWeekTemplate(): ?WeekTemplates
    {
        return $this->weekTemplate;
    }

    public function setWeekTemplate(?WeekTemplates $weekTemplate): self
    {
        $this->weekTemplate = $weekTemplate;

        return $this;
    }

    public function getCanEdit(): ?bool
    {
        return $this->canEdit;
    }

    public function setCanEdit(bool $canEdit): self
    {
        $this->canEdit = $canEdit;

        return $this;
    }

    public function getCanShare(): ?bool
    {
        return $this->canShare;
    }

    public function setCanShare(bool $canShare): self
    {
        $this->canShare = $canShare;

        return $this;
    }
}
