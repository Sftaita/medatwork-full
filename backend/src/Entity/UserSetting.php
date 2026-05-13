<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserSettingRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Persistent user preferences — one record per (userType × userId).
 *
 * userType values: 'resident' | 'manager' | 'hospital_admin' | 'app_admin'
 *
 * The settings JSON is open-ended to support future keys without migrations.
 * Unknown keys are silently ignored on read; the service merges with defaults.
 *
 * Never updated by Doctrine cascade — only via UserSettingService::patch().
 */
#[ORM\Entity(repositoryClass: UserSettingRepository::class)]
#[ORM\Table(name: 'user_setting')]
#[ORM\UniqueConstraint(name: 'uk_user_setting', columns: ['user_type', 'user_id'])]
class UserSetting
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private ?int $id = null;

    /** 'resident' | 'manager' | 'hospital_admin' | 'app_admin' */
    #[ORM\Column(type: 'string', length: 30)]
    private string $userType;

    #[ORM\Column(type: 'integer')]
    private int $userId;

    /** Arbitrary JSON — merged with defaults on read. */
    #[ORM\Column(type: 'json')]
    private array $settings = [];

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $userType, int $userId, array $settings = [])
    {
        $this->userType  = $userType;
        $this->userId    = $userId;
        $this->settings  = $settings;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUserType(): string { return $this->userType; }
    public function getUserId(): int { return $this->userId; }
    public function getSettings(): array { return $this->settings; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    public function setSettings(array $settings): self
    {
        $this->settings  = $settings;
        $this->updatedAt = new \DateTimeImmutable();
        return $this;
    }
}
