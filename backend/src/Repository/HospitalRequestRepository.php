<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\HospitalRequest;
use App\Enum\HospitalRequestStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<HospitalRequest> */
class HospitalRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, HospitalRequest::class);
    }

    /** @return HospitalRequest[] */
    public function findPending(): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.status = :status')
            ->setParameter('status', HospitalRequestStatus::Pending)
            ->orderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
