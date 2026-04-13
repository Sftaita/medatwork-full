<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Hospital;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Hospital> */
class HospitalRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Hospital::class);
    }

    /** @return Hospital[] */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('h')
            ->where('h.isActive = true')
            ->orderBy('h.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
