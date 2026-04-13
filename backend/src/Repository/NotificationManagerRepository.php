<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Manager;
use App\Entity\NotificationManager;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NotificationManager>
 */
class NotificationManagerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NotificationManager::class);
    }

    /** @return list<NotificationManager> */
    public function getRecentNotificationsForManager(Manager $manager): array
    {
        $weekAgo = new \DateTime('-1 week');
        $qb = $this->createQueryBuilder('n');

        return $qb
            ->where('n.manager = :manager')
            ->andWhere($qb->expr()->orX(
                'n.isRead = false',
                $qb->expr()->andX('n.isRead = true', 'n.readAt >= :weekAgo')
            ))
            ->setParameter('manager', $manager)
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
                'DELETE FROM App\Entity\NotificationManager n
                 WHERE (n.isRead = true AND n.readAt < :readCutoff)
                    OR (n.isRead = false AND n.createdAt < :unreadCutoff)'
            )
            ->setParameter('readCutoff', $readCutoff)
            ->setParameter('unreadCutoff', $unreadCutoff)
            ->execute();
    }
}
