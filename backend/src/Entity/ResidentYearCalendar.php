<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ResidentYearCalendarRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ResidentYearCalendarRepository::class)]
class ResidentYearCalendar
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: YearsResident::class, inversedBy: 'residentCalendar')]
    #[ORM\JoinColumn(nullable: true)]
    private ?YearsResident $yearsResident = null;

    #[ORM\ManyToOne(targetEntity: YearsWeekTemplates::class, inversedBy: 'residentYearCalendars')]
    private ?YearsWeekTemplates $yearsWeekTemplates = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $title;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $dateOfStart;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $dateOfEnd;

    #[ORM\Column(type: 'string', length: 255)]
    private string $type;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $location = null;

    #[ORM\Column(type: 'boolean')]
    private bool $isAllDay;

    #[ORM\Column(type: 'string', length: 255)]
    private string $color;

    #[ORM\ManyToOne(targetEntity: ResidentWeeklySchedule::class, inversedBy: 'residentYearCalendars')]
    private ?ResidentWeeklySchedule $residentWeeklySchedule = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getYearsResident(): ?YearsResident
    {
        return $this->yearsResident;
    }

    public function setYearsResident(?YearsResident $yearsResident): self
    {
        $this->yearsResident = $yearsResident;

        return $this;
    }

    public function getYearsWeekTemplates(): ?YearsWeekTemplates
    {
        return $this->yearsWeekTemplates;
    }

    public function setYearsWeekTemplates(?YearsWeekTemplates $yearsWeekTemplates): self
    {
        $this->yearsWeekTemplates = $yearsWeekTemplates;

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

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

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;

        return $this;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function setLocation(?string $location): self
    {
        $this->location = $location;

        return $this;
    }

    public function getIsAllDay(): ?bool
    {
        return $this->isAllDay;
    }

    public function setIsAllDay(bool $isAllDay): self
    {
        $this->isAllDay = $isAllDay;

        return $this;
    }

    public function getColor(): ?string
    {
        return $this->color;
    }

    public function setColor(string $color): self
    {
        $this->color = $color;

        return $this;
    }

    public function getResidentWeeklySchedule(): ?ResidentWeeklySchedule
    {
        return $this->residentWeeklySchedule;
    }

    public function setResidentWeeklySchedule(?ResidentWeeklySchedule $residentWeeklySchedule): self
    {
        $this->residentWeeklySchedule = $residentWeeklySchedule;

        return $this;
    }
}
