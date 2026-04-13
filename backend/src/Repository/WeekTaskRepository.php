<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\WeekTask;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<WeekTask>
 */
class WeekTaskRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WeekTask::class);
    }

    public function findOverlap(int $weekTemplateId, int $dayOfWeek, \DateTime $startTime, \DateTime $endTime): ?WeekTask
    {
        return $this->createQueryBuilder('wt')
            ->where('wt.weekTemplate = :weekTemplateId')
            ->andWhere('wt.dayOfWeek = :dayOfWeek')
            ->andWhere(
                '(wt.startTime <= :startTime AND wt.endTime > :startTime) OR 
                (wt.startTime < :endTime AND wt.endTime >= :endTime) OR 
                (wt.startTime >= :startTime AND wt.endTime <= :endTime)'
            )
            ->setParameters([
                'weekTemplateId' => $weekTemplateId,
                'dayOfWeek' => $dayOfWeek,
                'startTime' => $startTime,
                'endTime' => $endTime,
            ])
            ->getQuery()
            ->getOneOrNullResult();
    }



    /*
    public function findOneBySomeField($value): ?WeekTask
    {
        return $this->createQueryBuilder('w')
            ->andWhere('w.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
