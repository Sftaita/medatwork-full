<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Hospital;
use App\Entity\Resident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<Resident>
 */
class ResidentRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Resident::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (! $user instanceof Resident) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->_em->persist($user);
        $this->_em->flush();
    }

    /**
     * Returns residents who have at least one YearsResident linked to a year in the given hospital.
     *
     * @return Resident[]
     */
    public function findByHospital(Hospital $hospital): array
    {
        return $this->createQueryBuilder('r')
            ->innerJoin('r.yearsResidents', 'yr')
            ->innerJoin('yr.year', 'y')
            ->andWhere('y.hospital = :hospital')
            ->setParameter('hospital', $hospital)
            ->distinct()
            ->orderBy('r.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
