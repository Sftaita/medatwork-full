<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ManagerYears>
 */
class ManagerYearsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ManagerYears::class);
    }

    /**
     * Find manager years list.
     *
     * @return array<int,array<string,mixed>>
     */
    public function findManagerYearsList(Manager $manager): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.manager = :val')
            ->leftJoin('m.years', 'y')
            ->setParameter('val', $manager)
            ->select('y.id, y.title, y.token, y.createdAt, y.dateOfStart, y.dateOfEnd, y.location, y.master as masterId, m.owner, m.dataAccess, m.dataValidation, m.dataDownload, m.admin')
            ->orderBy('y.id', 'DESC')
            ->getQuery()
            ->getResult();
        ;
    }

    /**
     * Find active years for a manager whose date of end is today or in the future.
     *
     * @return array<int,array<string,mixed>>
     */
    public function findActiveManagerYearsList(Manager $manager): array
    {
        $today = new \DateTime();

        return $this->createQueryBuilder('m')
            ->andWhere('m.manager = :manager')
            ->andWhere('y.dateOfEnd >= :today')
            ->leftJoin('m.years', 'y')
            ->setParameter('manager', $manager)
            ->setParameter('today', $today)
            ->select('y.id, y.title, y.token, y.createdAt, y.dateOfStart, y.dateOfEnd, y.location, y.master as masterId, m.owner, m.dataAccess, m.dataValidation, m.dataDownload, m.admin, m.canManageAgenda, m.hasAgendaAccess')
            ->orderBy('y.id', 'DESC')
            ->getQuery()
            ->getResult();
    }


    /**
    * Fetch year managers
    * @return list<array<string, mixed>>
    */
    public function fetchYearManagers(Years|int $year): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.years = :val')
            ->leftJoin('m.manager', 'manager')
            ->setParameter('val', $year)
            ->select('m.id, m.owner, m.dataAccess, m.dataValidation, m.admin, m.dataDownload, m.canManageAgenda, m.hasAgendaAccess, manager.firstname, manager.lastname, manager.job, manager.id as managerId')
            ->getQuery()
            ->getResult();
        ;
    }

    /**
     * Check if the manager↔year relation exists.
     */
    public function checkRelation(Manager $manager, Years $year): bool
    {
        $check = $this->createQueryBuilder('y')
            ->andWhere('y.years = :year')
            ->andWhere('y.manager = :manager')
            ->setParameter('year', $year)
            ->setParameter('manager', $manager)
            ->select('y')
            ->getQuery()
            ->getResult();
        ;

        if ($check) {
            return true;
        } else {
            return false;
        }
    }



}
