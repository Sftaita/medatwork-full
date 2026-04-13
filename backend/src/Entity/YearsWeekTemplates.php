<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\YearsWeekTemplatesRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: YearsWeekTemplatesRepository::class)]
class YearsWeekTemplates
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'yearsWeekTemplates')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    #[ORM\ManyToOne(targetEntity: WeekTemplates::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?WeekTemplates $weekTemplate = null;

    /** @var Collection<int, ResidentWeeklySchedule> */
    #[ORM\OneToMany(targetEntity: ResidentWeeklySchedule::class, mappedBy: 'yearsWeekTemplates', orphanRemoval: true)]
    private Collection $residentWeeklySchedules;

    /** @var Collection<int, ResidentYearCalendar> */
    #[ORM\OneToMany(targetEntity: ResidentYearCalendar::class, mappedBy: 'yearsWeekTemplates')]
    private Collection $residentYearCalendars;

    public function __construct()
    {
        $this->residentWeeklySchedules = new ArrayCollection();
        $this->residentYearCalendars = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getWeekTemplate(): ?WeekTemplates
    {
        return $this->weekTemplate;
    }

    public function setWeekTemplate(?WeekTemplates $weekTemplate): self
    {
        $this->weekTemplate = $weekTemplate;

        return $this;
    }

    /**
     * @return Collection<int, ResidentWeeklySchedule>
     */
    public function getResidentWeeklySchedules(): Collection
    {
        return $this->residentWeeklySchedules;
    }

    public function addResidentWeeklySchedule(ResidentWeeklySchedule $residentWeeklySchedule): self
    {
        if (! $this->residentWeeklySchedules->contains($residentWeeklySchedule)) {
            $this->residentWeeklySchedules[] = $residentWeeklySchedule;
            $residentWeeklySchedule->setYearsWeekTemplates($this);
        }

        return $this;
    }

    public function removeResidentWeeklySchedule(ResidentWeeklySchedule $residentWeeklySchedule): self
    {
        if ($this->residentWeeklySchedules->removeElement($residentWeeklySchedule)) {
            // set the owning side to null (unless already changed)
            if ($residentWeeklySchedule->getYearsWeekTemplates() === $this) {
                $residentWeeklySchedule->setYearsWeekTemplates(null);
            }
        }

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
            $residentYearCalendar->setYearsWeekTemplates($this);
        }

        return $this;
    }

    public function removeResidentYearCalendar(ResidentYearCalendar $residentYearCalendar): self
    {
        if ($this->residentYearCalendars->removeElement($residentYearCalendar)) {
            // set the owning side to null (unless already changed)
            if ($residentYearCalendar->getYearsWeekTemplates() === $this) {
                $residentYearCalendar->setYearsWeekTemplates(null);
            }
        }

        return $this;
    }
}
