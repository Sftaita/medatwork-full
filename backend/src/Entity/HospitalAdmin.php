<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\HospitalAdminStatus;
use App\Repository\HospitalAdminRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: HospitalAdminRepository::class)]
#[UniqueEntity('email', message: 'Cet email est déjà utilisé')]
class HospitalAdmin implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email]
    private string $email;

    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $password = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $firstname = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $lastname = null;

    /** @var string[] */
    #[ORM\Column(type: 'json')]
    private array $roles = ['ROLE_HOSPITAL_ADMIN'];

    #[ORM\ManyToOne(targetEntity: Hospital::class, inversedBy: 'hospitalAdmins')]
    #[ORM\JoinColumn(nullable: false)]
    private Hospital $hospital;

    #[ORM\Column(enumType: HospitalAdminStatus::class, options: ['default' => 'invited'])]
    private HospitalAdminStatus $status = HospitalAdminStatus::Invited;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $token = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $tokenExpiration = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $validatedAt = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $avatarPath = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): self { $this->email = $email; return $this; }

    public function getUserIdentifier(): string { return $this->email; }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    /** @param string[] $roles */
    public function setRoles(array $roles): self { $this->roles = $roles; return $this; }

    public function getPassword(): ?string { return $this->password; }
    public function setPassword(?string $password): self { $this->password = $password; return $this; }

    public function getFirstname(): ?string { return $this->firstname; }
    public function setFirstname(?string $firstname): self { $this->firstname = $firstname; return $this; }

    public function getLastname(): ?string { return $this->lastname; }
    public function setLastname(?string $lastname): self { $this->lastname = $lastname; return $this; }

    public function getHospital(): Hospital { return $this->hospital; }
    public function setHospital(Hospital $hospital): self { $this->hospital = $hospital; return $this; }

    public function getStatus(): HospitalAdminStatus { return $this->status; }
    public function setStatus(HospitalAdminStatus $status): self { $this->status = $status; return $this; }

    public function getToken(): ?string { return $this->token; }
    public function setToken(?string $token): self { $this->token = $token; return $this; }

    public function getTokenExpiration(): ?\DateTimeInterface { return $this->tokenExpiration; }
    public function setTokenExpiration(?\DateTimeInterface $exp): self { $this->tokenExpiration = $exp; return $this; }

    public function getValidatedAt(): ?\DateTimeInterface { return $this->validatedAt; }
    public function setValidatedAt(?\DateTimeInterface $validatedAt): self { $this->validatedAt = $validatedAt; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function getAvatarPath(): ?string { return $this->avatarPath; }
    public function setAvatarPath(?string $avatarPath): self { $this->avatarPath = $avatarPath; return $this; }

    public function getSalt(): ?string { return null; }

    #[\Deprecated]
    public function eraseCredentials(): void {}
}
