<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ManagerStatus;
use App\Enum\Sexe;
use App\Repository\ManagerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ManagerRepository::class)]
#[UniqueEntity('email', message: 'Cet utilisateur existe déjà')]
class Manager implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups(['manager_read'])]
    private ?int $id = null;



    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Groups(['manager_read'])]
    #[Assert\NotBlank(message: "L'email doit être renseigné")]
    #[Assert\Email(message: "L'email indiqué n'est pas valide")]
    private string $email;

    /** @var string[] */
    #[ORM\Column(type: 'json')]
    private array $roles = [];

    /**
     * @var string The hashed password
     *
     */

    #[ORM\Column(type: 'string')]
    #[Assert\NotBlank(message: 'Le mot de passe doit être renseigné')]
    #[Assert\Length(min: 6, minMessage: 'Le mot de passe doit contenir au minimum 6 caractères', max: 150, maxMessage: 'Le mot de passe est trop long')]
    private string $password;



    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['manager_read'])]
    #[Assert\NotBlank(message: 'Quel est votre prénom')]
    #[Assert\Length(min: 2, minMessage: 'Le prénom doit contenir au minimum 2 caractères', max: 50, maxMessage: 'Le prénom est trop long')]
    private string $firstname;



    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['manager_read'])]
    #[Assert\NotBlank(message: 'Quel est votre nom')]
    #[Assert\Length(min: 2, minMessage: 'Le nom doit contenir au minimum 2 caractères', max: 70, maxMessage: 'Le nom est trop long')]
    private string $lastname;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['manager_read'])]
    #[Assert\NotBlank(message: 'Quel est le rôle')]
    #[Assert\Choice(['manager', 'resident'], message: "Le rôle doit être 'Manager' ou 'Resident'")]
    private string $role;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 100, maxMessage: 'Le token est trop long')]
    private ?string $token = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $validatedAt = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(enumType: Sexe::class)]
    private Sexe $sexe;



    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\Length(max: 100, maxMessage: 'job doit être renseigné')]
    #[Assert\Type(type: 'string', message: 'Le job doit être une chaîne de caractères')]
    private string $job;



    /**
     * Legacy string field — kept for backward compatibility during migration.
     * New code should use $hospitals (ManyToMany) instead.
     */
    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $hospital = null;

    /** @var Collection<int, Hospital> */
    #[ORM\ManyToMany(targetEntity: Hospital::class, inversedBy: 'managers')]
    #[ORM\JoinTable(name: 'manager_hospital')]
    private Collection $hospitals;

    #[ORM\Column(enumType: ManagerStatus::class, options: ['default' => 'active'])]
    private ManagerStatus $status = ManagerStatus::Active;

    /** @var Collection<int, ManagerYears> */
    #[ORM\OneToMany(targetEntity: ManagerYears::class, mappedBy: 'manager')]
    private Collection $managerYears;

    /** @var Collection<int, PeriodValidation> */
    #[ORM\OneToMany(targetEntity: PeriodValidation::class, mappedBy: 'validatedBy')]
    private Collection $periodValidations;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $tokenExpiration = null;

    /** @var Collection<int, NotificationManager> */
    #[ORM\OneToMany(targetEntity: NotificationManager::class, mappedBy: 'manager', orphanRemoval: true)]
    private Collection $notificationManagers;

    /** @var Collection<int, ResidentValidation> */
    #[ORM\OneToMany(targetEntity: ResidentValidation::class, mappedBy: 'validatedBy')]
    private Collection $residentValidations;

    /** @var Collection<int, ManagerWeekTemplate> */
    #[ORM\OneToMany(targetEntity: ManagerWeekTemplate::class, mappedBy: 'manager', orphanRemoval: true)]
    private Collection $managerWeekTemplates;

    /** Whether the manager wants to receive compliance alert emails */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $receiveComplianceEmails = false;

    /** Hospital this manager is admin of (null if not a hospital admin) */
    #[ORM\ManyToOne(targetEntity: Hospital::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Hospital $adminHospital = null;

    /** Soft-delete flag — manager deleted by hospital admin but kept for audit trail */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $isDeleted = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $deletedAt = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $avatarPath = null;

    public function __construct()
    {
        $this->hospitals            = new ArrayCollection();
        $this->managerYears         = new ArrayCollection();
        $this->periodValidations    = new ArrayCollection();
        $this->notificationManagers = new ArrayCollection();
        $this->residentValidations  = new ArrayCollection();
        $this->managerWeekTemplates = new ArrayCollection();
    }


    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        if ($this->adminHospital !== null) {
            $roles[] = 'ROLE_HOSPITAL_ADMIN';
        }

        return array_unique($roles);
    }

    public function getAdminHospital(): ?Hospital
    {
        return $this->adminHospital;
    }

    public function setAdminHospital(?Hospital $hospital): self
    {
        $this->adminHospital = $hospital;

        return $this;
    }

    public function isDeleted(): bool
    {
        return $this->isDeleted;
    }

    public function setIsDeleted(bool $isDeleted): self
    {
        $this->isDeleted = $isDeleted;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeInterface
    {
        return $this->deletedAt;
    }

    public function setDeletedAt(?\DateTimeInterface $deletedAt): self
    {
        $this->deletedAt = $deletedAt;

        return $this;
    }

    /** @param string[] $roles */
    public function setRoles(array $roles): self
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;

        return $this;
    }

    /**
     * Returning a salt is only needed, if you are not using a modern
     * hashing algorithm (e.g. bcrypt or sodium) in your security.yaml.
     *
     * @see UserInterface
     */
    public function getSalt(): ?string
    {
        return null;
    }

    /**
     * @see UserInterface
     */
    #[\Deprecated('eraseCredentials() is no longer called by Symfony 7.3+. Logic moved to __serialize() if needed.')]
    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
    }

    public function getFirstname(): ?string
    {
        return $this->firstname;
    }

    public function setFirstname(string $firstname): self
    {
        $this->firstname = $firstname;

        return $this;
    }

    public function getLastname(): ?string
    {
        return $this->lastname;
    }

    public function setLastname(string $lastname): self
    {
        $this->lastname = $lastname;

        return $this;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(string $role): self
    {
        $this->role = $role;

        return $this;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function setToken(?string $token): self
    {
        $this->token = $token;

        return $this;
    }

    public function getValidatedAt(): ?\DateTimeInterface
    {
        return $this->validatedAt;
    }

    public function setValidatedAt(?\DateTimeInterface $validatedAt): self
    {
        $this->validatedAt = $validatedAt;

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

    public function getSexe(): Sexe
    {
        return $this->sexe;
    }

    public function setSexe(Sexe $sexe): self
    {
        $this->sexe = $sexe;

        return $this;
    }

    public function getJob(): ?string
    {
        return $this->job;
    }

    public function setJob(string $job): self
    {
        $this->job = $job;

        return $this;
    }

    /** @deprecated Use getHospitals() instead */
    public function getHospital(): ?string
    {
        return $this->hospital;
    }

    /** @deprecated Use addHospital() instead */
    public function setHospital(?string $hospital): self
    {
        $this->hospital = $hospital;

        return $this;
    }

    /** @return Collection<int, Hospital> */
    public function getHospitals(): Collection
    {
        return $this->hospitals;
    }

    public function addHospital(Hospital $hospital): self
    {
        if (! $this->hospitals->contains($hospital)) {
            $this->hospitals->add($hospital);
        }

        return $this;
    }

    public function removeHospital(Hospital $hospital): self
    {
        $this->hospitals->removeElement($hospital);

        return $this;
    }

    public function getStatus(): ManagerStatus
    {
        return $this->status;
    }

    public function setStatus(ManagerStatus $status): self
    {
        $this->status = $status;

        return $this;
    }

    /**
     * @return Collection<int, ManagerYears>
     */
    public function getManagerYears(): Collection
    {
        return $this->managerYears;
    }

    public function addManagerYear(ManagerYears $managerYear): self
    {
        if (! $this->managerYears->contains($managerYear)) {
            $this->managerYears[] = $managerYear;
            $managerYear->setManager($this);
        }

        return $this;
    }

    public function removeManagerYear(ManagerYears $managerYear): self
    {
        if ($this->managerYears->removeElement($managerYear)) {
            // set the owning side to null (unless already changed)
            if ($managerYear->getManager() === $this) {
                $managerYear->setManager(null);
            }
        }

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
            $periodValidation->setValidatedBy($this);
        }

        return $this;
    }

    public function removePeriodValidation(PeriodValidation $periodValidation): self
    {
        if ($this->periodValidations->removeElement($periodValidation)) {
            // set the owning side to null (unless already changed)
            if ($periodValidation->getValidatedBy() === $this) {
                $periodValidation->setValidatedBy(null);
            }
        }

        return $this;
    }

    public function getTokenExpiration(): ?\DateTimeInterface
    {
        return $this->tokenExpiration;
    }

    public function setTokenExpiration(?\DateTimeInterface $tokenExpiration): self
    {
        $this->tokenExpiration = $tokenExpiration;

        return $this;
    }

    /**
     * @return Collection<int, NotificationManager>
     */
    public function getNotificationManagers(): Collection
    {
        return $this->notificationManagers;
    }

    public function addNotificationManager(NotificationManager $notificationManager): self
    {
        if (! $this->notificationManagers->contains($notificationManager)) {
            $this->notificationManagers[] = $notificationManager;
            $notificationManager->setManager($this);
        }

        return $this;
    }

    public function removeNotificationManager(NotificationManager $notificationManager): self
    {
        if ($this->notificationManagers->removeElement($notificationManager)) {
            // set the owning side to null (unless already changed)
            if ($notificationManager->getManager() === $this) {
                $notificationManager->setManager(null);
            }
        }

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
            $residentValidation->setValidatedBy($this);
        }

        return $this;
    }

    public function removeResidentValidation(ResidentValidation $residentValidation): self
    {
        if ($this->residentValidations->removeElement($residentValidation)) {
            // set the owning side to null (unless already changed)
            if ($residentValidation->getValidatedBy() === $this) {
                $residentValidation->setValidatedBy(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ManagerWeekTemplate>
     */
    public function getManagerWeekTemplates(): Collection
    {
        return $this->managerWeekTemplates;
    }

    public function addManagerWeekTemplate(ManagerWeekTemplate $managerWeekTemplate): self
    {
        if (! $this->managerWeekTemplates->contains($managerWeekTemplate)) {
            $this->managerWeekTemplates[] = $managerWeekTemplate;
            $managerWeekTemplate->setManager($this);
        }

        return $this;
    }

    public function removeManagerWeekTemplate(ManagerWeekTemplate $managerWeekTemplate): self
    {
        if ($this->managerWeekTemplates->removeElement($managerWeekTemplate)) {
            // set the owning side to null (unless already changed)
            if ($managerWeekTemplate->getManager() === $this) {
                $managerWeekTemplate->setManager(null);
            }
        }

        return $this;
    }

    public function isReceiveComplianceEmails(): bool
    {
        return $this->receiveComplianceEmails;
    }

    public function setReceiveComplianceEmails(bool $receiveComplianceEmails): self
    {
        $this->receiveComplianceEmails = $receiveComplianceEmails;

        return $this;
    }

    public function getAvatarPath(): ?string { return $this->avatarPath; }
    public function setAvatarPath(?string $avatarPath): self { $this->avatarPath = $avatarPath; return $this; }

}
