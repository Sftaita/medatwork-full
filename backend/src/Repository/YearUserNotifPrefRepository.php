<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\YearUserNotifPref;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<YearUserNotifPref>
 */
class YearUserNotifPrefRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry, private readonly EntityManagerInterface $em)
    {
        parent::__construct($registry, YearUserNotifPref::class);
    }

    public function findByUser(string $userType, int $userId, Years $year): ?YearUserNotifPref
    {
        return $this->findOneBy([
            'userType' => $userType,
            'userId'   => $userId,
            'year'     => $year,
        ]);
    }

    public function getOrCreate(string $userType, int $userId, Years $year): YearUserNotifPref
    {
        // Ensure we use a managed entity — year may be detached after em->clear()
        $managedYear = $this->em->contains($year)
            ? $year
            : ($this->em->find(Years::class, $year->getId()) ?? $year);

        $existing = $this->findOneBy([
            'userType' => $userType,
            'userId'   => $userId,
            'year'     => $managedYear,
        ]);

        if ($existing !== null) {
            return $existing;
        }

        $pref = new YearUserNotifPref($userType, $userId, $managedYear);
        $this->em->persist($pref);

        return $pref;
    }
}
