<?php

declare(strict_types=1);

namespace App\Controller\NotificationsAPI\ResidentsAPI;

use App\DTO\NotificationInputDTO;
use App\Entity\NotificationResident;
use App\Entity\Resident;
use App\Repository\NotificationResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class NotificationResidentController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/residents/notifications/unread', name: 'notification_resident_unread', methods: ['GET'])]
    public function getRecentUnreadNotifications(NotificationResidentRepository $notificationResidentRepository): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $this->getUser();
        $notifications = $notificationResidentRepository->getRecentNotificationsForResident($resident);

        $data = array_map(fn (NotificationResident $n) => [
            'id'        => $n->getId(),
            'object'    => $n->getObject(),
            'body'      => $n->getBody(),
            'type'      => $n->getType(),
            'read'      => $n->getIsRead(),
            'readAt'    => $n->getReadAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $n->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], $notifications);

        return $this->json($data);
    }

    #[Route('/api/residents/notifications', name: 'notification_resident_create')]
    public function create(Request $request): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $this->getUser();
        $dto = NotificationInputDTO::fromRequest($request);
        $notification = new NotificationResident();
        $notification->setObject($dto->object);
        $notification->setBody($dto->body);
        $notification->setType($dto->type);
        $notification->setCreatedAt(new \DateTime());
        $notification->setIsRead(false);
        $notification->setResident($resident);

        $this->entityManager->persist($notification);
        $this->entityManager->flush();

        return $this->json([
            'notification' => $notification,
        ]);
    }

    #[Route('/api/residents/notifications/mark-all-as-read', name: 'notification_resident_all_read', methods: ['PATCH'])]
    public function markAllAsRead(NotificationResidentRepository $notificationResidentRepository): JsonResponse
    {
        /** @var Resident $resident */
        $resident = $this->getUser();
        $unreadNotifications = $notificationResidentRepository->findBy([
            'resident' => $resident,
            'isRead' => false,
        ]);

        foreach ($unreadNotifications as $notification) {
            $notification->setIsRead(true);
            $notification->setReadAt(new \DateTime());
            $this->entityManager->persist($notification);
        }
        $this->entityManager->flush();

        return $this->json([
            'message' => 'All notifications marked as read',
        ]);
    }
}
