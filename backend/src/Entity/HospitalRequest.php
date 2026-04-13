<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\HospitalRequestStatus;
use App\Repository\HospitalRequestRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: HospitalRequestRepository::class)]
class HospitalRequest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 150)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 150)]
    private string $hospitalName;

    #[ORM\ManyToOne(targetEntity: Manager::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Manager $requestedBy;

    #[ORM\Column(enumType: HospitalRequestStatus::class, options: ['default' => 'pending'])]
    private HospitalRequestStatus $status = HospitalRequestStatus::Pending;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $reviewedAt = null;

    /** The Hospital entity created upon approval — null until approved */
    #[ORM\ManyToOne(targetEntity: Hospital::class, inversedBy: 'hospitalRequests')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Hospital $hospital = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getHospitalName(): string { return $this->hospitalName; }
    public function setHospitalName(string $name): self { $this->hospitalName = $name; return $this; }

    public function getRequestedBy(): Manager { return $this->requestedBy; }
    public function setRequestedBy(Manager $manager): self { $this->requestedBy = $manager; return $this; }

    public function getStatus(): HospitalRequestStatus { return $this->status; }
    public function setStatus(HospitalRequestStatus $status): self { $this->status = $status; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function getReviewedAt(): ?\DateTimeInterface { return $this->reviewedAt; }
    public function setReviewedAt(?\DateTimeInterface $reviewedAt): self { $this->reviewedAt = $reviewedAt; return $this; }

    public function getHospital(): ?Hospital { return $this->hospital; }
    public function setHospital(?Hospital $hospital): self { $this->hospital = $hospital; return $this; }
}
