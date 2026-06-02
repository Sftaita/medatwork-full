<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\YearUserNotifPrefRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Préférences personnelles de notification pour une année académique.
 *
 * Identifiée par (userType × userId × year_id) — unique par utilisateur/année.
 * Le champ prefs est un JSON ouvert : { eventType: { channel: bool } }
 * Les clés absentes sont comblées par YearNotifPrefService::EVENT_DEFAULTS.
 *
 * Supprimée en cascade quand l'année est supprimée (onDelete='CASCADE').
 * Pas de FK vers Manager/HospitalAdmin : user_id est stocké tel quel,
 * résolu dynamiquement via resolveIdentity().
 */
#[ORM\Entity(repositoryClass: YearUserNotifPrefRepository::class)]
#[ORM\Table(name: 'year_user_notif_pref')]
#[ORM\UniqueConstraint(name: 'uk_yunp', columns: ['user_type', 'user_id', 'year_id'])]
#[ORM\Index(columns: ['user_type', 'user_id'], name: 'idx_yunp_user')]
#[ORM\Index(columns: ['year_id'],               name: 'idx_yunp_year')]
class YearUserNotifPref
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private ?int $id = null;

    /** 'manager' | 'hospital_admin' */
    #[ORM\Column(type: 'string', length: 30)]
    private string $userType;

    /** ID de l'entité Manager ou HospitalAdmin */
    #[ORM\Column(type: 'integer')]
    private int $userId;

    #[ORM\ManyToOne(targetEntity: Years::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Years $year;

    /**
     * { eventType: { channel: bool } }
     * Exemple : { "COMPLIANCE_ALERT": { "email": true, "push": false } }
     *
     * @var array<string, array<string, bool>>
     */
    #[ORM\Column(type: 'json')]
    private array $prefs = [];

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $userType, int $userId, Years $year, array $prefs = [])
    {
        $this->userType  = $userType;
        $this->userId    = $userId;
        $this->year      = $year;
        $this->prefs     = $prefs;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUserType(): string { return $this->userType; }
    public function getUserId(): int { return $this->userId; }
    public function getYear(): Years { return $this->year; }

    /** @return array<string, array<string, bool>> */
    public function getPrefs(): array { return $this->prefs; }

    /** @param array<string, array<string, bool>> $prefs */
    public function setPrefs(array $prefs): self
    {
        $this->prefs     = $prefs;
        $this->updatedAt = new \DateTimeImmutable();
        return $this;
    }

    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
