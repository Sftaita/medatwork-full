<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ContactCcConfig;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ContactCcConfig> */
class ContactCcConfigRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ContactCcConfig::class);
    }

    /** @return string[] Active CC email addresses */
    public function findActiveEmails(): array
    {
        $rows = $this->createQueryBuilder('c')
            ->select('c.email')
            ->where('c.isActive = true')
            ->getQuery()
            ->getArrayResult();
        return array_column($rows, 'email');
    }
}
