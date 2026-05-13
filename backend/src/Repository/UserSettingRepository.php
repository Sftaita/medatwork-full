<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\UserSetting;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserSetting>
 */
class UserSettingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserSetting::class);
    }

    public function findByUser(string $userType, int $userId): ?UserSetting
    {
        return $this->findOneBy(['userType' => $userType, 'userId' => $userId]);
    }

    /**
     * Returns the existing record or creates a new one with the provided defaults.
     * Does NOT flush — the caller is responsible.
     */
    public function getOrCreate(string $userType, int $userId, array $defaults): UserSetting
    {
        $setting = $this->findByUser($userType, $userId);

        if ($setting === null) {
            $setting = new UserSetting($userType, $userId, $defaults);
            $this->getEntityManager()->persist($setting);
        }

        return $setting;
    }
}
