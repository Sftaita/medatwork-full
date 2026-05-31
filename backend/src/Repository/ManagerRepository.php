<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Hospital;
use App\Entity\Manager;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<Manager>
 */
class ManagerRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Manager::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (! $user instanceof Manager) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->_em->persist($user);
        $this->_em->flush();
    }

    /** @return Manager[] Managers who have been promoted to hospital admin */
    public function findPromotedAdmins(): array
    {
        return $this->createQueryBuilder('m')
            ->where('m.adminHospital IS NOT NULL')
            ->orderBy('m.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return Manager[] */
    public function findByHospital(Hospital $hospital): array
    {
        return $this->createQueryBuilder('m')
            ->innerJoin('m.hospitals', 'h')
            ->andWhere('h = :hospital')
            ->setParameter('hospital', $hospital)
            ->orderBy('m.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns all managers linked to the hospital — either via the manager_hospital
     * join table OR via the adminHospital field (hospital admin managers).
     * Deduplicates by manager id.
     *
     * @return Manager[]
     */
    public function findAllForHospital(Hospital $hospital): array
    {
        $viaJoinTable = $this->createQueryBuilder('m')
            ->innerJoin('m.hospitals', 'h')
            ->andWhere('h = :hospital')
            ->setParameter('hospital', $hospital)
            ->getQuery()
            ->getResult();

        $viaAdminField = $this->createQueryBuilder('m')
            ->andWhere('m.adminHospital = :hospital')
            ->setParameter('hospital', $hospital)
            ->getQuery()
            ->getResult();

        $seen = [];
        $merged = [];
        foreach (array_merge($viaJoinTable, $viaAdminField) as $m) {
            if (!isset($seen[$m->getId()])) {
                $seen[$m->getId()] = true;
                $merged[] = $m;
            }
        }

        usort($merged, fn(Manager $a, Manager $b) => strcmp($a->getLastname(), $b->getLastname()));

        return $merged;
    }
}
