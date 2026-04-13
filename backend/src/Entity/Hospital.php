<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\HospitalRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: HospitalRepository::class)]
#[UniqueEntity('name', message: 'Un hôpital avec ce nom existe déjà')]
class Hospital
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 150, unique: true)]
    #[Assert\NotBlank(message: "Le nom de l'hôpital est obligatoire")]
    #[Assert\Length(min: 2, max: 150)]
    private string $name;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(type: 'string', length: 2, options: ['default' => 'BE'])]
    private string $country = 'BE';

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    /** @var Collection<int, Manager> */
    #[ORM\ManyToMany(targetEntity: Manager::class, mappedBy: 'hospitals')]
    private Collection $managers;

    /** @var Collection<int, HospitalAdmin> */
    #[ORM\OneToMany(targetEntity: HospitalAdmin::class, mappedBy: 'hospital')]
    private Collection $hospitalAdmins;

    /** @var Collection<int, Years> */
    #[ORM\OneToMany(targetEntity: Years::class, mappedBy: 'hospital')]
    private Collection $years;

    /** @var Collection<int, HospitalRequest> */
    #[ORM\OneToMany(targetEntity: HospitalRequest::class, mappedBy: 'hospital')]
    private Collection $hospitalRequests;

    public function __construct()
    {
        $this->createdAt      = new \DateTime();
        $this->managers       = new ArrayCollection();
        $this->hospitalAdmins = new ArrayCollection();
        $this->years          = new ArrayCollection();
        $this->hospitalRequests = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $city): self { $this->city = $city; return $this; }

    public function getCountry(): string { return $this->country; }
    public function setCountry(string $country): self { $this->country = $country; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): self { $this->isActive = $isActive; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $createdAt): self { $this->createdAt = $createdAt; return $this; }

    /** @return Collection<int, Manager> */
    public function getManagers(): Collection { return $this->managers; }

    /** @return Collection<int, HospitalAdmin> */
    public function getHospitalAdmins(): Collection { return $this->hospitalAdmins; }

    /** @return Collection<int, Years> */
    public function getYears(): Collection { return $this->years; }
}
