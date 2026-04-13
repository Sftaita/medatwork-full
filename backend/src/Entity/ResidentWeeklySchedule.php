<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ResidentWeeklyScheduleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ResidentWeeklyScheduleRepository::class)]
class ResidentWeeklySchedule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Resident::class, inversedBy: 'residentWeeklySchedules')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Resident $resident = null;

    #[ORM\ManyToOne(targetEntity: YearsWeekIntervals::class, inversedBy: 'residentWeeklySchedules')]
    #[ORM\JoinColumn(nullable: true)]
    private ?YearsWeekIntervals $yearsWeekIntervals = null;

    #[ORM\ManyToOne(targetEntity: YearsWeekTemplates::class, inversedBy: 'residentWeeklySchedules')]
    #[ORM\JoinColumn(nullable: true)]
    private ?YearsWeekTemplates $yearsWeekTemplates = null;

    /** @var Collection<int, ResidentYearCalendar> */
    #[ORM\OneToMany(targetEntity: ResidentYearCalendar::class, mappedBy: 'residentWeeklySchedule')]
    private Collection $residentYearCalendars;

    public function __construct()
    {
        $this->residentYearCalendars = new ArrayCollection();
    }

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

    public function getYearsWeekIntervals(): ?YearsWeekIntervals
    {
        return $this->yearsWeekIntervals;
    }

    public function setYearsWeekIntervals(?YearsWeekIntervals $yearsWeekIntervals): self
    {
        $this->yearsWeekIntervals = $yearsWeekIntervals;

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

    /**
     * @return Collection<int, ResidentYearCalendar>
     */
    public function getResidentYearCalendars(): Collection
    {
        return $this->residentYearCalendars;
    }

    public function addResidentYearCalendar(ResidentYearCalendar $residentYearCalendar): self
    {
        if (! $this->residentYearCalendars->contains($residentYearCalendar)) {
            $this->residentYearCalendars[] = $residentYearCalendar;
            $residentYearCalendar->setResidentWeeklySchedule($this);
        }

        return $this;
    }

    public function removeResidentYearCalendar(ResidentYearCalendar $residentYearCalendar): self
    {
        if ($this->residentYearCalendars->removeElement($residentYearCalendar)) {
            // set the owning side to null (unless already changed)
            if ($residentYearCalendar->getResidentWeeklySchedule() === $this) {
                $residentYearCalendar->setResidentWeeklySchedule(null);
            }
        }

        return $this;
    }
}
