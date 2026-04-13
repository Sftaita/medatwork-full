<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffPlannerResourcesRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffPlannerResourcesRepository::class)]
class StaffPlannerResources
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $workerHRID = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $sectionHRID = null;

    #[ORM\OneToOne(targetEntity: YearsResident::class, mappedBy: 'staffPlannerResources', cascade: ['persist', 'remove'])]
    private ?YearsResident $yearsResident = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getWorkerHRID(): ?string
    {
        return $this->workerHRID;
    }

    public function setWorkerHRID(?string $workerHRID): self
    {
        $this->workerHRID = $workerHRID;

        return $this;
    }

    public function getSectionHRID(): ?string
    {
        return $this->sectionHRID;
    }

    public function setSectionHRID(?string $sectionHRID): self
    {
        $this->sectionHRID = $sectionHRID;

        return $this;
    }

    public function getYearsResident(): ?YearsResident
    {
        return $this->yearsResident;
    }

    public function setYearsResident(?YearsResident $yearsResident): self
    {
        // unset the owning side of the relation if necessary
        if ($yearsResident === null && $this->yearsResident !== null) {
            $this->yearsResident->setStaffPlannerResources(null);
        }

        // set the owning side of the relation if necessary
        if ($yearsResident !== null && $yearsResident->getStaffPlannerResources() !== $this) {
            $yearsResident->setStaffPlannerResources($this);
        }

        $this->yearsResident = $yearsResident;

        return $this;
    }
}
