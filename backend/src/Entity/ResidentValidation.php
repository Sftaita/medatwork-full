<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ResidentValidationRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ResidentValidationRepository::class)]
class ResidentValidation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: PeriodValidation::class, inversedBy: 'residentValidations')]
    #[ORM\JoinColumn(nullable: true)]
    private ?PeriodValidation $periodValidation = null;

    #[ORM\ManyToOne(targetEntity: Resident::class, inversedBy: 'residentValidations')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Resident $resident = null;

    #[ORM\Column(type: 'boolean')]
    private bool $validated;

    #[ORM\ManyToOne(targetEntity: Manager::class, inversedBy: 'residentValidations')]
    private ?Manager $validatedBy = null;

    /**
     *
     * This field should contain an array of associative arrays, with each associative array representing
     * a validation or invalidation action. Each associative array should contain the following keys:
     *
     * "action": A string representing the action ("validated" or "invalidated").
     * "actionBy": An integer representing the ID of the manager who performed the action.
     * "actionAt": A string representing the date and time when the action was performed, in ISO 8601 format.
     * "managerComment": (optional) A string representing the reason for the action.
     * "residentComment": (optional) A string representing the reason for the action.
     */

    /** @var array<int, array<string, mixed>>|null */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $validationHistory = [];

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPeriodValidation(): ?PeriodValidation
    {
        return $this->periodValidation;
    }

    public function setPeriodValidation(?PeriodValidation $periodValidation): self
    {
        $this->periodValidation = $periodValidation;

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

    public function getValidated(): ?bool
    {
        return $this->validated;
    }

    public function setValidated(bool $Validated): self
    {
        $this->validated = $Validated;

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

    /** @return array<int, array<string, mixed>>|null */
    public function getValidationHistory(): ?array
    {
        return $this->validationHistory;
    }

    /** @param array<int, array<string, mixed>>|null $validationHistory */
    public function setValidationHistory(?array $validationHistory): self
    {
        $this->validationHistory = $validationHistory;

        return $this;
    }

    /**
     * Adds a new item to the validation history.
     *
     * The $historyItem parameter should be an associative array with the following keys:
     *
     * "action": A string representing the action ("validated" or "invalidated").
     * "actionBy": An integer representing the ID of the manager who performed the action.
     * "actionAt": A string representing the date and time when the action was performed, in ISO 8601 format.
     * "reason": (optional) A string representing the reason for the action.
     */
    /** @param array<string, mixed> $historyItem */
    public function addValidationHistoryItem(array $historyItem): self
    {
        $this->validationHistory[] = $historyItem;

        return $this;
    }
}
