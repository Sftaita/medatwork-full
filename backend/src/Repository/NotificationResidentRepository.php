<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\NotificationResident;
use App\Entity\Resident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NotificationResident>
 */
class NotificationResidentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NotificationResident::class);
    }

    /** @return list<NotificationResident> */
    public function getRecentNotificationsForResident(Resident $resident): array
    {
        $weekAgo = new \DateTime('-1 week');
        $qb = $this->createQueryBuilder('n');

        return $qb
            ->where('n.resident = :resident')
            ->andWhere($qb->expr()->orX(
                'n.isRead = false',
                $qb->expr()->andX('n.isRead = true', 'n.readAt >= :weekAgo')
            ))
            ->setParameter('resident', $resident)
            ->setParameter('weekAgo', $weekAgo)
            ->orderBy('n.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Deletes old notifications:
     *   - Read ones whose readAt is older than $readCutoff
     *   - Unread ones whose createdAt is older than $unreadCutoff
     *
     * Returns the number of deleted rows.
     */
    public function purgeOld(\DateTimeInterface $readCutoff, \DateTimeInterface $unreadCutoff): int
    {
        return (int) $this->getEntityManager()
            ->createQuery(
                'DELETE FROM App\Entity\NotificationResident n
                 WHERE (n.isRead = true AND n.readAt < :readCutoff)
                    OR (n.isRead = false AND n.createdAt < :unreadCutoff)'
            )
            ->setParameter('readCutoff', $readCutoff)
            ->setParameter('unreadCutoff', $unreadCutoff)
            ->execute();
    }
}
