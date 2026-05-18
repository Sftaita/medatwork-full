<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ContactMessage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ContactMessage> */
class ContactMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ContactMessage::class);
    }

    /** @return ContactMessage[] */
    public function findAll(): array
    {
        return $this->createQueryBuilder('m')
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** @return ContactMessage[] */
    public function findByTreated(bool $treated): array
    {
        $qb = $this->createQueryBuilder('m')->orderBy('m.createdAt', 'DESC');
        if ($treated) {
            $qb->where('m.treatedAt IS NOT NULL');
        } else {
            $qb->where('m.treatedAt IS NULL');
        }
        return $qb->getQuery()->getResult();
    }

    public function countUntreated(): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.treatedAt IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }
}
