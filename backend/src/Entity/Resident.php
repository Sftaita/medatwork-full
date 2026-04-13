<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\Sexe;
use App\Repository\ResidentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ResidentRepository::class)]
#[UniqueEntity('email', message: 'Cet utilisateur existe déjà')]
class Resident implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups(['resident_read'])]
    private ?int $id = null;



    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Groups(['resident_read', 'years_read'])]
    #[Assert\NotBlank(message: "L'email doit être renseigné")]
    #[Assert\Email(message: "L'email indiqué n'est pas valide")]
    private string $email;

    /** @var string[] */
    #[ORM\Column(type: 'json')]
    private array $roles = [];

    /**
     * @var string The hashed password
     *
     *
     */

    #[ORM\Column(type: 'string')]
    #[Assert\NotBlank(message: 'Renseigner un mot de passe')]
    #[Assert\Length(max: 150, maxMessage: 'Mot de passe est trop long', min: 6, minMessage: 'Le mot de passe est trop court')]
    private string $password;



    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['resident_read', 'years_read'])]
    #[Assert\Length(max: 50, maxMessage: 'Le prénom est trop long')]
    private string $firstname;



    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['resident_read', 'years_read'])]
    #[Assert\NotBlank(message: 'Quel est votre nom')]
    #[Assert\Length(max: 50, maxMessage: 'Le nom est trop long')]
    private string $lastname;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['resident_read', 'years_read'])]
    #[Assert\NotBlank(message: 'Quel est le rôle')]
    #[Assert\Choice(['manager', 'resident'], message: "Le rôle doit être 'Manager' ou 'Resident'")]
    private string $role;

    /** @var Collection<int, Timesheet> */
    #[ORM\OneToMany(targetEntity: Timesheet::class, mappedBy: 'resident')]
    private Collection $timesheets;

    /** @var Collection<int, YearsResident> */
    #[ORM\OneToMany(targetEntity: YearsResident::class, mappedBy: 'resident')]
    private Collection $yearsResidents;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 100, maxMessage: 'Le token est trop long')]
    private ?string $token = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $validatedAt = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(enumType: Sexe::class)]
    private Sexe $sexe;

    #[ORM\Column(type: 'date')]
    private \DateTimeInterface $dateOfMaster;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 100, maxMessage: 'La spécialité est trop longue')]
    #[Assert\Type(type: 'string', message: 'La spécialité doit être une chaîne de caractères')]
    private ?string $speciality = null;

    /** @var Collection<int, Garde> */
    #[ORM\OneToMany(targetEntity: Garde::class, mappedBy: 'resident')]
    private Collection $gardes;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $tokenExpiration = null;

    #[ORM\Column(type: 'date', nullable: true)]
    #[Assert\Date(message: 'La date de naissance doit être une date valide')]
    private ?\DateTimeInterface $dateOfBirth = null;



    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Assert\Length(max: 255, maxMessage: "Le nom de l'université est trop long")]
    #[Assert\Type(type: 'string', message: "Le nom de l'université doit être une chaîne de caractères")]
    private ?string $university = null;

    /** @var Collection<int, NotificationResident> */
    #[ORM\OneToMany(targetEntity: NotificationResident::class, mappedBy: 'resident', orphanRemoval: true)]
    private Collection $notificationResidents;

    /** @var Collection<int, ResidentValidation> */
    #[ORM\OneToMany(targetEntity: ResidentValidation::class, mappedBy: 'resident', orphanRemoval: true)]
    private Collection $residentValidations;

    /** @var Collection<int, ResidentWeeklySchedule> */
    #[ORM\OneToMany(targetEntity: ResidentWeeklySchedule::class, mappedBy: 'resident', orphanRemoval: true)]
    private Collection $residentWeeklySchedules;

    public function __construct()
    {
        $this->timesheets = new ArrayCollection();
        $this->yearsResidents = new ArrayCollection();
        $this->gardes = new ArrayCollection();
        $this->notificationResidents = new ArrayCollection();
        $this->residentValidations = new ArrayCollection();
        $this->residentWeeklySchedules = new ArrayCollection();
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
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
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
            $timesheet->setResident($this);
        }

        return $this;
    }

    public function removeTimesheet(Timesheet $timesheet): self
    {
        if ($this->timesheets->removeElement($timesheet)) {
            // set the owning side to null (unless already changed)
            if ($timesheet->getResident() === $this) {
                $timesheet->setResident(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, YearsResident>
     */
    public function getYearsResidents(): Collection
    {
        return $this->yearsResidents;
    }

    public function addYearsResident(YearsResident $yearsResident): self
    {
        if (! $this->yearsResidents->contains($yearsResident)) {
            $this->yearsResidents[] = $yearsResident;
            $yearsResident->setResident($this);
        }

        return $this;
    }

    public function removeYearsResident(YearsResident $yearsResident): self
    {
        if ($this->yearsResidents->removeElement($yearsResident)) {
            // set the owning side to null (unless already changed)
            if ($yearsResident->getResident() === $this) {
                $yearsResident->setResident(null);
            }
        }

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

    public function getDateOfMaster(): ?\DateTimeInterface
    {
        return $this->dateOfMaster;
    }

    public function setDateOfMaster(\DateTimeInterface $dateOfMaster): self
    {
        $this->dateOfMaster = $dateOfMaster;

        return $this;
    }

    public function getSpeciality(): ?string
    {
        return $this->speciality;
    }

    public function setSpeciality(string $speciality): self
    {
        $this->speciality = $speciality;

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
            $garde->setResident($this);
        }

        return $this;
    }

    public function removeGarde(Garde $garde): self
    {
        if ($this->gardes->removeElement($garde)) {
            // set the owning side to null (unless already changed)
            if ($garde->getResident() === $this) {
                $garde->setResident(null);
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

    public function getDateOfBirth(): ?\DateTimeInterface
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(?\DateTimeInterface $dateOfBirth): self
    {
        $this->dateOfBirth = $dateOfBirth;

        return $this;
    }

    public function getUniversity(): ?string
    {
        return $this->university;
    }

    public function setUniversity(?string $university): self
    {
        $this->university = $university;

        return $this;
    }

    /**
     * @return Collection<int, NotificationResident>
     */
    public function getNotificationResidents(): Collection
    {
        return $this->notificationResidents;
    }

    public function addNotificationResident(NotificationResident $notificationResident): self
    {
        if (! $this->notificationResidents->contains($notificationResident)) {
            $this->notificationResidents[] = $notificationResident;
            $notificationResident->setResident($this);
        }

        return $this;
    }

    public function removeNotificationResident(NotificationResident $notificationResident): self
    {
        if ($this->notificationResidents->removeElement($notificationResident)) {
            // set the owning side to null (unless already changed)
            if ($notificationResident->getResident() === $this) {
                $notificationResident->setResident(null);
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
            $residentValidation->setResident($this);
        }

        return $this;
    }

    public function removeResidentValidation(ResidentValidation $residentValidation): self
    {
        if ($this->residentValidations->removeElement($residentValidation)) {
            // set the owning side to null (unless already changed)
            if ($residentValidation->getResident() === $this) {
                $residentValidation->setResident(null);
            }
        }

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
            $residentWeeklySchedule->setResident($this);
        }

        return $this;
    }

    public function removeResidentWeeklySchedule(ResidentWeeklySchedule $residentWeeklySchedule): self
    {
        if ($this->residentWeeklySchedules->removeElement($residentWeeklySchedule)) {
            // set the owning side to null (unless already changed)
            if ($residentWeeklySchedule->getResident() === $this) {
                $residentWeeklySchedule->setResident(null);
            }
        }

        return $this;
    }
}
