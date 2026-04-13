<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Manager;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Years>
 */
class YearsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Years::class);
    }

    /**
     * Renvoie l'année liée au token.
     *
     * @return array<string,mixed>|null
     */
    public function findOneByToken(string $token): ?array
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.token = :val')
            ->setParameter('val', $token)
            ->select('y.id, y.title, y.dateOfStart, y.location, y.dateOfEnd, y.token')
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }

    /**
     * Renvoie l'année liée à l'id.
     *
     * @return array<string,mixed>|null
     */
    public function findOneById(int $id): ?array
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.id = :val')
            ->setParameter('val', $id)
            ->select('y.id, y.title,y.comment,y.period, y.master,y.speciality, y.dateOfStart, y.location, y.dateOfEnd, y.token')
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }

    /**
     * Find manger's years list
     *
     * @return array<int,mixed>
     */
    public function findManagerYears(Manager $user): array
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.manager = :val')
            ->leftJoin('y.period', 'period')
            ->setParameter('val', $user)
            ->select('y.id, y.title, y.createdAt, y.dateOfStart, y.dateOfEnd, y.location, period.datesInterval')
            ->getQuery()
            ->getResult();
        ;
    }

    /**
     * Check if a link exist
     */
    public function checkManagerAccess(Manager $manager, Years $year): bool
    {
        $check = $this->createQueryBuilder('y')
            ->andWhere('y.id = :year')
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



    /*
    public function findOneBySomeField($value): ?Years
    {
        return $this->createQueryBuilder('y')
            ->andWhere('y.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
