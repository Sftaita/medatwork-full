<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PeriodValidationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PeriodValidationRepository::class)]
class PeriodValidation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Years::class, inversedBy: 'periodValidations')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Years $year = null;

    #[ORM\Column(type: 'integer')]
    private int $month;

    #[ORM\Column(type: 'integer')]
    private int $yearNb;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $validatedAt = null;

    #[ORM\Column(type: 'boolean')]
    private bool $validated;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $endLimite = null;

    #[ORM\ManyToOne(targetEntity: Manager::class, inversedBy: 'periodValidations')]
    private ?Manager $validatedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $unvalidatedAt = null;

    /** @var Collection<int, ResidentValidation> */
    #[ORM\OneToMany(targetEntity: ResidentValidation::class, mappedBy: 'periodValidation', orphanRemoval: true)]
    private Collection $residentValidations;

    public function __construct()
    {
        $this->residentValidations = new ArrayCollection();
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

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(int $month): self
    {
        $this->month = $month;

        return $this;
    }

    public function getYearNb(): ?int
    {
        return $this->yearNb;
    }

    public function setYearNb(int $yearNb): self
    {
        $this->yearNb = $yearNb;

        return $this;
    }

    public function getValidatedAt(): ?\DateTimeInterface
    {
        return $this->validatedAt;
    }

    public function setValidatedAt(\DateTimeInterface $validatedAt): self
    {
        $this->validatedAt = $validatedAt;

        return $this;
    }

    public function getValidated(): ?bool
    {
        return $this->validated;
    }

    public function setValidated(bool $validated): self
    {
        $this->validated = $validated;

        return $this;
    }

    public function getEndLimite(): ?\DateTimeInterface
    {
        return $this->endLimite;
    }

    public function setEndLimite(?\DateTimeInterface $endLimite): self
    {
        $this->endLimite = $endLimite;

        return $this;
    }

    public function getValidatedBy(): ?Manager
    {
        return $this->validatedBy;
    }

    public function setValidatedBy(?Manager $validatedBy): self
    {
        $this->validatedBy = $validatedBy;

        return $this;
    }

    public function getUnvalidatedAt(): ?\DateTimeInterface
    {
        return $this->unvalidatedAt;
    }

    public function setUnvalidatedAt(?\DateTimeInterface $unvalidatedAt): self
    {
        $this->unvalidatedAt = $unvalidatedAt;

        return $this;
    }

    /**
     * @return Collection<int, ResidentValidation>
     */
    public function getResidentValidations(): Collection
    {
        return $this->residentValidations;
    }

    public function addResidentValidation(ResidentValidation $residentValidation): self
    {
        if (! $this->residentValidations->contains($residentValidation)) {
            $this->residentValidations[] = $residentValidation;
            $residentValidation->setPeriodValidation($this);
        }

        return $this;
    }

    public function removeResidentValidation(ResidentValidation $residentValidation): self
    {
        if ($this->residentValidations->removeElement($residentValidation)) {
            // set the owning side to null (unless already changed)
            if ($residentValidation->getPeriodValidation() === $this) {
                $residentValidation->setPeriodValidation(null);
            }
        }

        return $this;
    }

}
