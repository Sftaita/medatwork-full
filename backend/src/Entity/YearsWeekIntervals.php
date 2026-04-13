<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\YearsWeekIntervalsRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: YearsWeekIntervalsRepository::class)]
class YearsWeekIntervals
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'date')]
    private \DateTimeInterface $dateOfStart;

    #[ORM\Column(type: 'date')]
    private \DateTimeInterface $dateOfEnd;



    #[ORM\Column(type: 'integer')]
    #[Assert\Type(type: 'integer', message: "Le numéro de l'année doit être un nombre entier.")]
    private int $weekNumber;



    #[ORM\Column(type: 'integer')]
    #[Assert\Type(type: 'integer', message: "Le numéro de l'année doit être un nombre entier.")]
    private int $monthNumber;



    #[ORM\Column(type: 'integer')]
    #[Assert\Type(type: 'integer', message: "Le numéro de l'année doit être un nombre entier.")]
    private int $yearNumber;



    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Assert\Type(type: 'bool', message: 'Le champ supprimé doit être un booléen.')]
    private ?bool $deleted = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'yearsWeekIntervals')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    /** @var Collection<int, ResidentWeeklySchedule> */
    #[ORM\OneToMany(targetEntity: ResidentWeeklySchedule::class, mappedBy: 'yearsWeekIntervals', orphanRemoval: true)]
    private Collection $residentWeeklySchedules;

    public function __construct()
    {
        $this->residentWeeklySchedules = new ArrayCollection();
    }

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

    public function getWeekNumber(): ?int
    {
        return $this->weekNumber;
    }

    public function setWeekNumber(int $weekNumber): self
    {
        $this->weekNumber = $weekNumber;

        return $this;
    }

    public function getMonthNumber(): ?int
    {
        return $this->monthNumber;
    }

    public function setMonthNumber(int $monthNumber): self
    {
        $this->monthNumber = $monthNumber;

        return $this;
    }

    public function getYearNumber(): ?int
    {
        return $this->yearNumber;
    }

    public function setYearNumber(int $yearNumber): self
    {
        $this->yearNumber = $yearNumber;

        return $this;
    }

    public function getDeleted(): ?bool
    {
        return $this->deleted;
    }

    public function setDeleted(?bool $deleted): self
    {
        $this->deleted = $deleted;

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
            $residentWeeklySchedule->setYearsWeekIntervals($this);
        }

        return $this;
    }

    public function removeResidentWeeklySchedule(ResidentWeeklySchedule $residentWeeklySchedule): self
    {
        if ($this->residentWeeklySchedules->removeElement($residentWeeklySchedule)) {
            // set the owning side to null (unless already changed)
            if ($residentWeeklySchedule->getYearsWeekIntervals() === $this) {
                $residentWeeklySchedule->setYearsWeekIntervals(null);
            }
        }

        return $this;
    }
}
