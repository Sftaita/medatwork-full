<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\YearsResidentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: YearsResidentRepository::class)]
class YearsResident
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'residents')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'boolean')]
    private bool $allowed;

    #[ORM\ManyToOne(targetEntity: Resident::class, inversedBy: 'yearsResidents')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Resident $resident = null;

    #[ORM\Column(type: 'date', nullable: true)]
    private ?\DateTimeInterface $dateOfStart = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $holidays = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $scientificDays = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $optingOut = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $scientificLeaves = 10;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $legalLeaves = 20;

    #[ORM\OneToOne(targetEntity: StaffPlannerResources::class, inversedBy: 'yearsResident', cascade: ['persist', 'remove'])]
    private ?StaffPlannerResources $staffPlannerResources = null;

    /** @var Collection<int, ResidentYearCalendar> */
    #[ORM\OneToMany(targetEntity: ResidentYearCalendar::class, mappedBy: 'yearsResident', orphanRemoval: true)]
    private Collection $residentCalendar;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $paternityLeave = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $maternityLeave = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $unpaidLeave = 0;

    public function __construct()
    {
        $this->residentCalendar = new ArrayCollection();
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

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getAllowed(): ?bool
    {
        return $this->allowed;
    }

    public function setAllowed(bool $allowed): self
    {
        $this->allowed = $allowed;

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

    public function getDateOfStart(): ?\DateTimeInterface
    {
        return $this->dateOfStart;
    }

    public function setDateOfStart(?\DateTimeInterface $dateOfStart): self
    {
        $this->dateOfStart = $dateOfStart;

        return $this;
    }

    public function getHolidays(): ?int
    {
        return $this->holidays;
    }

    public function setHolidays(?int $holidays): self
    {
        $this->holidays = $holidays;

        return $this;
    }

    public function getScientificDays(): ?int
    {
        return $this->scientificDays;
    }

    public function setScientificDays(?int $scientificDays): self
    {
        $this->scientificDays = $scientificDays;

        return $this;
    }

    public function getOptingOut(): ?bool
    {
        return $this->optingOut;
    }

    public function setOptingOut(?bool $optingOut): self
    {
        $this->optingOut = $optingOut;

        return $this;
    }

    public function getScientificLeaves(): ?int
    {
        return $this->scientificLeaves;
    }

    public function setScientificLeaves(?int $scientificLeaves): self
    {
        $this->scientificLeaves = $scientificLeaves;

        return $this;
    }

    public function getLegalLeaves(): ?int
    {
        return $this->legalLeaves;
    }

    public function setLegalLeaves(?int $legalLeaves): self
    {
        $this->legalLeaves = $legalLeaves;

        return $this;
    }

    public function getStaffPlannerResources(): ?StaffPlannerResources
    {
        return $this->staffPlannerResources;
    }

    public function setStaffPlannerResources(?StaffPlannerResources $staffPlannerResources): self
    {
        $this->staffPlannerResources = $staffPlannerResources;

        return $this;
    }

    /**
     * @return Collection<int, ResidentYearCalendar>
     */
    public function getResidentCalendar(): Collection
    {
        return $this->residentCalendar;
    }

    public function addResidentCalendar(ResidentYearCalendar $residentCalendar): self
    {
        if (! $this->residentCalendar->contains($residentCalendar)) {
            $this->residentCalendar[] = $residentCalendar;
            $residentCalendar->setYearsResident($this);
        }

        return $this;
    }

    public function removeResidentCalendar(ResidentYearCalendar $residentCalendar): self
    {
        if ($this->residentCalendar->removeElement($residentCalendar)) {
            // set the owning side to null (unless already changed)
            if ($residentCalendar->getYearsResident() === $this) {
                $residentCalendar->setYearsResident(null);
            }
        }

        return $this;
    }

    public function getPaternityLeave(): ?int
    {
        return $this->paternityLeave;
    }

    public function setPaternityLeave(?int $paternityLeave): self
    {
        $this->paternityLeave = $paternityLeave;

        return $this;
    }

    public function getMaternityLeave(): ?int
    {
        return $this->maternityLeave;
    }

    public function setMaternityLeave(?int $maternityLeave): self
    {
        $this->maternityLeave = $maternityLeave;

        return $this;
    }

    public function getUnpaidLeave(): ?int
    {
        return $this->unpaidLeave;
    }

    public function setUnpaidLeave(?int $unpaidLeave): self
    {
        $this->unpaidLeave = $unpaidLeave;

        return $this;
    }
}
