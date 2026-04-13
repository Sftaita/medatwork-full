<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\YearResidentParametersRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: YearResidentParametersRepository::class)]
class YearResidentParameters
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: YearsResident::class, cascade: ['persist', 'remove'])]
    private ?YearsResident $relatedTo = null;

    #[ORM\Column(type: 'time', nullable: true)]
    private ?\DateTimeInterface $timesheetStartTime = null;

    #[ORM\Column(type: 'time', nullable: true)]
    private ?\DateTimeInterface $timesheetEndTime = null;

    #[ORM\Column(type: 'time', nullable: true)]
    private ?\DateTimeInterface $gardeStartTime = null;

    #[ORM\Column(type: 'time', nullable: true)]
    private ?\DateTimeInterface $gardeEndTime = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRelatedTo(): ?YearsResident
    {
        return $this->relatedTo;
    }

    public function setRelatedTo(?YearsResident $relatedTo): self
    {
        $this->relatedTo = $relatedTo;

        return $this;
    }

    public function getTimesheetStartTime(): ?\DateTimeInterface
    {
        return $this->timesheetStartTime;
    }

    public function setTimesheetStartTime(?\DateTimeInterface $timesheetStartTime): self
    {
        $this->timesheetStartTime = $timesheetStartTime;

        return $this;
    }

    public function getTimesheetEndTime(): ?\DateTimeInterface
    {
        return $this->timesheetEndTime;
    }

    public function setTimesheetEndTime(?\DateTimeInterface $timesheetEndTime): self
    {
        $this->timesheetEndTime = $timesheetEndTime;

        return $this;
    }

    public function getGardeStartTime(): ?\DateTimeInterface
    {
        return $this->gardeStartTime;
    }

    public function setGardeStartTime(?\DateTimeInterface $gardeStartTime): self
    {
        $this->gardeStartTime = $gardeStartTime;

        return $this;
    }

    public function getGardeEndTime(): ?\DateTimeInterface
    {
        return $this->gardeEndTime;
    }

    public function setGardeEndTime(?\DateTimeInterface $gardeEndTime): self
    {
        $this->gardeEndTime = $gardeEndTime;

        return $this;
    }
}
