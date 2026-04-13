<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\YearStatus;
use App\Repository\YearsRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 *  Years Entity
 *
 */

#[ORM\Entity(repositoryClass: YearsRepository::class)]
class Years
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups(['years_read'])]
    private ?int $id = null;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Groups(['years_read'])]
    #[Assert\NotBlank(message: "Quel est le titre de l'année")]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le titre doit contenir au moins {{ limit }} caractères', maxMessage: 'Le titre doit contenir au maximum {{ limit }} caractères')]
    private ?string $title = null;



    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['years_read'])]
    #[Assert\Length(min: 10, max: 1000, minMessage: 'Le commentaire doit contenir au moins {{ limit }} caractères', maxMessage: 'Le commentaire doit contenir au maximum {{ limit }} caractères')]
    private ?string $comment = null;

    #[ORM\Column(type: 'datetime')]
    #[Groups(['years_read'])]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'date')]
    #[Groups(['years_read'])]
    #[Assert\NotBlank(message: 'Quelle est la date de début de stage')]
    #[Assert\Date(message: 'La date de début doit être au format YYYY-MM-DD')]
    private \DateTimeInterface $dateOfStart;

    #[ORM\Column(type: 'date')]
    #[Groups(['years_read'])]
    #[Assert\NotBlank(message: 'Quelle est la date de fin de stage')]
    #[Assert\Date(message: 'La date de fin doit être au format YYYY-MM-DD')]
    private \DateTimeInterface $dateOfEnd;

    /** @var Collection<int, Timesheet> */
    #[ORM\OneToMany(targetEntity: Timesheet::class, mappedBy: 'year')]
    private Collection $timesheets;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['years_read'])]
    private string $period;

    #[ORM\Column(type: 'string', length: 10)]
    #[Groups(['years_read'])]
    private string $token;



    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['years_read'])]
    #[Assert\NotBlank(message: 'Veuillez entrer un lieu')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le lieu doit contenir au moins {{ limit }} caractères', maxMessage: 'Le lieu doit contenir au maximum {{ limit }} caractères')]
    private string $location;

    /** @var Collection<int, YearsResident> */
    #[ORM\OneToMany(targetEntity: YearsResident::class, mappedBy: 'year')]
    private Collection $residents;

    /** @var Collection<int, Garde> */
    #[ORM\OneToMany(targetEntity: Garde::class, mappedBy: 'year')]
    private Collection $gardes;

    /** @var Collection<int, Absence> */
    #[ORM\OneToMany(targetEntity: Absence::class, mappedBy: 'year', orphanRemoval: true)]
    private Collection $absences;

    /** @var Collection<int, ManagerYears> */
    #[ORM\OneToMany(targetEntity: ManagerYears::class, mappedBy: 'years')]
    private Collection $managers;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $master = null;

    /** @var Collection<int, PeriodValidation> */
    #[ORM\OneToMany(targetEntity: PeriodValidation::class, mappedBy: 'year')]
    private Collection $periodValidations;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\NotBlank(message: 'Veuillez entrer une spécialité')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'La spécialité doit contenir au moins {{ limit }} caractères', maxMessage: 'La spécialité doit contenir au maximum {{ limit }} caractères')]
    private ?string $speciality = null;



    /** @var array<int, mixed>|null */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $WeekIntervals = [];

    /** @var Collection<int, YearsWeekIntervals> */
    #[ORM\OneToMany(targetEntity: YearsWeekIntervals::class, mappedBy: 'year')]
    private Collection $yearsWeekIntervals;

    /** @var Collection<int, YearsWeekTemplates> */
    #[ORM\OneToMany(targetEntity: YearsWeekTemplates::class, mappedBy: 'year')]
    private Collection $yearsWeekTemplates;

    /** The hospital this internship year belongs to — nullable during migration */
    #[ORM\ManyToOne(targetEntity: Hospital::class, inversedBy: 'years')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Hospital $hospital = null;

    #[ORM\Column(enumType: YearStatus::class, options: ['default' => 'active'])]
    private YearStatus $status = YearStatus::Active;



    public function __construct()
    {
        $this->timesheets = new ArrayCollection();
        $this->residents = new ArrayCollection();
        $this->gardes = new ArrayCollection();
        $this->absences = new ArrayCollection();
        $this->managers = new ArrayCollection();
        $this->periodValidations = new ArrayCollection();

        $this->yearsWeekIntervals = new ArrayCollection();
        $this->yearsWeekTemplates = new ArrayCollection();

    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): self
    {
        $this->title = $title;

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

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

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

    /**
     * @return Collection<int, Timesheet>
     */
    public function getTimesheets(): Collection
    {
        return $this->timesheets;
    }

    public function addTimesheet(Timesheet $timesheet): self
    {
        if (! $this->timesheets->contains($timesheet)) {
            $this->timesheets[] = $timesheet;
            $timesheet->setYear($this);
        }

        return $this;
    }

    public function removeTimesheet(Timesheet $timesheet): self
    {
        if ($this->timesheets->removeElement($timesheet)) {
            // set the owning side to null (unless already changed)
            if ($timesheet->getYear() === $this) {
                $timesheet->setYear(null);
            }
        }

        return $this;
    }

    public function getPeriod(): ?string
    {
        return $this->period;
    }

    public function setPeriod(?string $period): self
    {
        $this->period = $period;

        return $this;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function setToken(string $token): self
    {
        $this->token = $token;

        return $this;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function setLocation(string $location): self
    {
        $this->location = $location;

        return $this;
    }

    /**
     * @return Collection<int, YearsResident>
     */
    public function getResidents(): Collection
    {
        return $this->residents;
    }

    public function addResident(YearsResident $resident): self
    {
        if (! $this->residents->contains($resident)) {
            $this->residents[] = $resident;
            $resident->setYear($this);
        }

        return $this;
    }

    public function removeResident(YearsResident $resident): self
    {
        if ($this->residents->removeElement($resident)) {
            // set the owning side to null (unless already changed)
            if ($resident->getYear() === $this) {
                $resident->setYear(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Garde>
     */
    public function getGardes(): Collection
    {
        return $this->gardes;
    }

    public function addGarde(Garde $garde): self
    {
        if (! $this->gardes->contains($garde)) {
            $this->gardes[] = $garde;
            $garde->setYear($this);
        }

        return $this;
    }

    public function removeGarde(Garde $garde): self
    {
        if ($this->gardes->removeElement($garde)) {
            // set the owning side to null (unless already changed)
            if ($garde->getYear() === $this) {
                $garde->setYear(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Absence>
     */
    public function getAbsences(): Collection
    {
        return $this->absences;
    }

    public function addAbsence(Absence $absence): self
    {
        if (! $this->absences->contains($absence)) {
            $this->absences[] = $absence;
            $absence->setYear($this);
        }

        return $this;
    }

    public function removeAbsence(Absence $absence): self
    {
        if ($this->absences->removeElement($absence)) {
            // set the owning side to null (unless already changed)
            if ($absence->getYear() === $this) {
                $absence->setYear(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ManagerYears>
     */
    public function getManagers(): Collection
    {
        return $this->managers;
    }

    public function addManager(ManagerYears $manager): self
    {
        if (! $this->managers->contains($manager)) {
            $this->managers[] = $manager;
            $manager->setYears($this);
        }

        return $this;
    }

    public function removeManager(ManagerYears $manager): self
    {
        if ($this->managers->removeElement($manager)) {
            // set the owning side to null (unless already changed)
            if ($manager->getYears() === $this) {
                $manager->setYears(null);
            }
        }

        return $this;
    }

    public function getMaster(): ?int
    {
        return $this->master;
    }

    public function setMaster(?int $master): self
    {
        $this->master = $master;

        return $this;
    }

    /**
     * @return Collection<int, PeriodValidation>
     */
    public function getPeriodValidations(): Collection
    {
        return $this->periodValidations;
    }

    public function addPeriodValidation(PeriodValidation $periodValidation): self
    {
        if (! $this->periodValidations->contains($periodValidation)) {
            $this->periodValidations[] = $periodValidation;
            $periodValidation->setYear($this);
        }

        return $this;
    }

    public function removePeriodValidation(PeriodValidation $periodValidation): self
    {
        if ($this->periodValidations->removeElement($periodValidation)) {
            // set the owning side to null (unless already changed)
            if ($periodValidation->getYear() === $this) {
                $periodValidation->setYear(null);
            }
        }

        return $this;
    }

    public function getSpeciality(): ?string
    {
        return $this->speciality;
    }

    public function setSpeciality(?string $speciality): self
    {
        $this->speciality = $speciality;

        return $this;
    }

    /** @return array<int, mixed>|null */
    public function getWeekIntervals(): ?array
    {
        return $this->WeekIntervals;
    }

    /** @param array<int, mixed>|null $WeekIntervals */
    public function setWeekIntervals(?array $WeekIntervals): self
    {
        $this->WeekIntervals = $WeekIntervals;

        return $this;
    }

    /**
     * @return Collection<int, YearsWeekIntervals>
     */
    public function getYearsWeekIntervals(): Collection
    {
        return $this->yearsWeekIntervals;
    }

    public function addYearsWeekInterval(YearsWeekIntervals $yearsWeekInterval): self
    {
        if (! $this->yearsWeekIntervals->contains($yearsWeekInterval)) {
            $this->yearsWeekIntervals[] = $yearsWeekInterval;
            $yearsWeekInterval->setYear($this);
        }

        return $this;
    }

    public function removeYearsWeekInterval(YearsWeekIntervals $yearsWeekInterval): self
    {
        if ($this->yearsWeekIntervals->removeElement($yearsWeekInterval)) {
            // set the owning side to null (unless already changed)
            if ($yearsWeekInterval->getYear() === $this) {
                $yearsWeekInterval->setYear(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, YearsWeekTemplates>
     */
    public function getYearsWeekTemplates(): Collection
    {
        return $this->yearsWeekTemplates;
    }

    public function addYearsWeekTemplate(YearsWeekTemplates $yearsWeekTemplate): self
    {
        if (! $this->yearsWeekTemplates->contains($yearsWeekTemplate)) {
            $this->yearsWeekTemplates[] = $yearsWeekTemplate;
            $yearsWeekTemplate->setYear($this);
        }

        return $this;
    }

    public function removeYearsWeekTemplate(YearsWeekTemplates $yearsWeekTemplate): self
    {
        if ($this->yearsWeekTemplates->removeElement($yearsWeekTemplate)) {
            if ($yearsWeekTemplate->getYear() === $this) {
                $yearsWeekTemplate->setYear(null);
            }
        }

        return $this;
    }

    public function getHospital(): ?Hospital
    {
        return $this->hospital;
    }

    public function setHospital(?Hospital $hospital): self
    {
        $this->hospital = $hospital;

        return $this;
    }

    public function getStatus(): YearStatus
    {
        return $this->status;
    }

    public function setStatus(YearStatus $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function isEditable(): bool
    {
        return $this->status === YearStatus::Draft || $this->status === YearStatus::Active;
    }
}
