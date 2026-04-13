<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\CommunicationMessage;
use App\Entity\CommunicationMessageRead;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CommunicationMessageRead>
 */
class CommunicationMessageReadRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly EntityManagerInterface $entityManager
    ) {
        parent::__construct($registry, CommunicationMessageRead::class);
    }

    /**
     * Returns the read record for a specific (message, user) pair, or null.
     */
    public function findOneByMessageAndUser(
        CommunicationMessage $message,
        string $userType,
        int $userId
    ): ?CommunicationMessageRead {
        return $this->findOneBy([
            'communicationMessage' => $message,
            'userType'             => $userType,
            'userId'               => $userId,
        ]);
    }

    /**
     * Marks a single message as read for a user.
     * Idempotent: does nothing if already read.
     */
    public function markAsRead(CommunicationMessage $message, string $userType, int $userId): void
    {
        if ($this->findOneByMessageAndUser($message, $userType, $userId) !== null) {
            return; // already read
        }

        $read = new CommunicationMessageRead();
        $read->setCommunicationMessage($message);
        $read->setUserType($userType);
        $read->setUserId($userId);

        $this->entityManager->persist($read);
        $this->entityManager->flush();
    }

    /**
     * Marks all unread notification-type messages as read for a user.
     * Used by "Marquer tout comme lu".
     */
    public function markAllNotificationsAsRead(
        array $messages,
        string $userType,
        int $userId
    ): void {
        foreach ($messages as $message) {
            if ($this->findOneByMessageAndUser($message, $userType, $userId) === null) {
                $read = new CommunicationMessageRead();
                $read->setCommunicationMessage($message);
                $read->setUserType($userType);
                $read->setUserId($userId);
                $this->entityManager->persist($read);
            }
        }
        $this->entityManager->flush();
    }
}
