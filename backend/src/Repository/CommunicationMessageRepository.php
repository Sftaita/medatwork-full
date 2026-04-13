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
     *   - scopeType = 'all'  AND (hospital IS NULL OR hospital.id = $hospitalId)
     *   - scopeType = 'role' AND targetRole = $userType AND (hospital IS NULL OR hospital.id = $hospitalId)
     *   - scopeType = 'user' AND targetUserId = $userId AND targetUserType = $userType
     *
     * @param string   $userType   'manager' | 'resident' | 'hospital_admin'
     * @param int      $userId     Primary key of the user
     * @param int|null $hospitalId Hospital the user belongs to (used for scoping)
     * @param string   $msgType    'notification' | 'modal'
     *
     * @return CommunicationMessage[]
     */
    public function findUnreadForUser(
        string $userType,
        int $userId,
        ?int $hospitalId,
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

        // Restrict to the user's hospital unless the message targets all hospitals (hospital IS NULL)
        if ($hospitalId !== null) {
            $qb->andWhere('m.hospital IS NULL OR h.id = :hospitalId')
               ->setParameter('hospitalId', $hospitalId);
        } else {
            $qb->andWhere('m.hospital IS NULL');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * All messages (read + unread) targeting a user — used for the notification page list.
     *
     * @return CommunicationMessage[]
     */
    public function findAllForUser(
        string $userType,
        int $userId,
        ?int $hospitalId,
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

        if ($hospitalId !== null) {
            $qb->andWhere('m.hospital IS NULL OR h.id = :hospitalId')
               ->setParameter('hospitalId', $hospitalId);
        } else {
            $qb->andWhere('m.hospital IS NULL');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Count unread notifications for a user (used for the badge endpoint).
     */
    public function countUnreadNotificationsForUser(
        string $userType,
        int $userId,
        ?int $hospitalId
    ): int {
        return count($this->findUnreadForUser($userType, $userId, $hospitalId, CommunicationMessage::TYPE_NOTIFICATION));
    }

    /**
     * Pending modals for a user (unread modals, ordered by priority then createdAt).
     *
     * @return CommunicationMessage[]
     */
    public function findPendingModalsForUser(
        string $userType,
        int $userId,
        ?int $hospitalId
    ): array {
        return $this->findUnreadForUser($userType, $userId, $hospitalId, CommunicationMessage::TYPE_MODAL);
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
