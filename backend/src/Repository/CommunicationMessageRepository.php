<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\CommunicationMessage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CommunicationMessage>
 */
class CommunicationMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CommunicationMessage::class);
    }

    /**
     * Returns all active CommunicationMessages that target a given user,
     * excluding messages the user has already read.
     *
     * A message targets a user when:
     *   - scopeType = 'all'  AND (hospital IS NULL OR hospital.id IN $hospitalContext)
     *   - scopeType = 'role' AND targetRole = $userType AND (hospital IS NULL OR hospital.id IN $hospitalContext)
     *   - scopeType = 'user' AND targetUserId = $userId AND targetUserType = $userType
     *
     * @param string       $userType        'manager' | 'resident' | 'hospital_admin'
     * @param int          $userId          Primary key of the user
     * @param int|int[]|null $hospitalContext Hospital(s) the user belongs to.
     *                                       int   → single hospital (managers / hospital admins)
     *                                       int[] → multiple hospitals (residents linked to several years)
     *                                       null  → global messages only
     * @param string       $msgType         'notification' | 'modal'
     *
     * @return CommunicationMessage[]
     */
    public function findUnreadForUser(
        string $userType,
        int $userId,
        int|array|null $hospitalContext,
        string $msgType
    ): array {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.hospital', 'h')
            ->leftJoin('m.reads', 'r', 'WITH', 'r.userType = :userType AND r.userId = :userId')
            ->where('m.isActive = true')
            ->andWhere('m.type = :msgType')
            ->andWhere('r.id IS NULL') // not yet read by this user
            ->andWhere(
                'm.scopeType = :scopeAll
                 OR (m.scopeType = :scopeRole AND m.targetRole = :userType)
                 OR (m.scopeType = :scopeUser AND m.targetUserId = :userId AND m.targetUserType = :userType)'
            )
            ->setParameter('userType', $userType)
            ->setParameter('userId', $userId)
            ->setParameter('msgType', $msgType)
            ->setParameter('scopeAll', CommunicationMessage::SCOPE_ALL)
            ->setParameter('scopeRole', CommunicationMessage::SCOPE_ROLE)
            ->setParameter('scopeUser', CommunicationMessage::SCOPE_USER)
            ->orderBy('m.priority', 'ASC')
            ->addOrderBy('m.createdAt', 'DESC');

        $this->applyHospitalFilter($qb, $hospitalContext);

        return $qb->getQuery()->getResult();
    }

    /**
     * All messages (read + unread) targeting a user — used for the notification page list.
     *
     * @param int|int[]|null $hospitalContext See findUnreadForUser() for semantics.
     * @return CommunicationMessage[]
     */
    public function findAllForUser(
        string $userType,
        int $userId,
        int|array|null $hospitalContext,
        string $msgType
    ): array {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.hospital', 'h')
            ->where('m.isActive = true')
            ->andWhere('m.type = :msgType')
            ->andWhere(
                'm.scopeType = :scopeAll
                 OR (m.scopeType = :scopeRole AND m.targetRole = :userType)
                 OR (m.scopeType = :scopeUser AND m.targetUserId = :userId AND m.targetUserType = :userType)'
            )
            ->setParameter('userType', $userType)
            ->setParameter('userId', $userId)
            ->setParameter('msgType', $msgType)
            ->setParameter('scopeAll', CommunicationMessage::SCOPE_ALL)
            ->setParameter('scopeRole', CommunicationMessage::SCOPE_ROLE)
            ->setParameter('scopeUser', CommunicationMessage::SCOPE_USER)
            ->orderBy('m.createdAt', 'DESC');

        $this->applyHospitalFilter($qb, $hospitalContext);

        return $qb->getQuery()->getResult();
    }

    /**
     * Count unread notifications for a user (used for the badge endpoint).
     *
     * @param int|int[]|null $hospitalContext See findUnreadForUser() for semantics.
     */
    public function countUnreadNotificationsForUser(
        string $userType,
        int $userId,
        int|array|null $hospitalContext
    ): int {
        return count($this->findUnreadForUser($userType, $userId, $hospitalContext, CommunicationMessage::TYPE_NOTIFICATION));
    }

    /**
     * Pending modals for a user (unread modals, ordered by priority then createdAt).
     *
     * @param int|int[]|null $hospitalContext See findUnreadForUser() for semantics.
     * @return CommunicationMessage[]
     */
    public function findPendingModalsForUser(
        string $userType,
        int $userId,
        int|array|null $hospitalContext
    ): array {
        return $this->findUnreadForUser($userType, $userId, $hospitalContext, CommunicationMessage::TYPE_MODAL);
    }

    /**
     * Restricts query builder to messages scoped to the user's hospital(s).
     * Global messages (hospital IS NULL) are always included.
     *
     * @param int|int[]|null $hospitalContext
     */
    private function applyHospitalFilter(\Doctrine\ORM\QueryBuilder $qb, int|array|null $hospitalContext): void
    {
        if ($hospitalContext === null || $hospitalContext === []) {
            // No hospital context → only globally-scoped messages
            $qb->andWhere('m.hospital IS NULL');
        } elseif (is_array($hospitalContext)) {
            // Multiple hospitals (residents linked to several academic years)
            $qb->andWhere('m.hospital IS NULL OR h.id IN (:hospitalIds)')
               ->setParameter('hospitalIds', $hospitalContext);
        } else {
            // Single hospital (manager / hospital admin)
            $qb->andWhere('m.hospital IS NULL OR h.id = :hospitalId')
               ->setParameter('hospitalId', $hospitalContext);
        }
    }

    /**
     * All messages created by a hospital admin (for the communication history page).
     *
     * @return CommunicationMessage[]
     */
    public function findByHospital(int $hospitalId): array
    {
        return $this->createQueryBuilder('m')
            ->join('m.hospital', 'h')
            ->where('h.id = :hospitalId')
            ->setParameter('hospitalId', $hospitalId)
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * All messages created by super admin (no hospital restriction).
     *
     * @return CommunicationMessage[]
     */
    public function findGlobal(): array
    {
        return $this->createQueryBuilder('m')
            ->where('m.authorType = :authorType')
            ->setParameter('authorType', CommunicationMessage::AUTHOR_SUPER_ADMIN)
            ->orderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
