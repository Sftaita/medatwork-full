<?php

declare(strict_types=1);

namespace App\Controller\NotificationsAPI\ManagersAPI;

use App\DTO\NotificationInputDTO;
use App\Entity\Manager;
use App\Entity\NotificationManager;
use App\Repository\NotificationManagerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class NotificationManagerController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    #[Route('/api/managers/notifications/unread', name: 'notification_manager_unread', methods: ['GET'])]
    public function getRecentUnreadNotifications(NotificationManagerRepository $notificationManagerRepository): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $this->getUser();
        $notifications = $notificationManagerRepository->getRecentNotificationsForManager($manager);

        $data = array_map(fn (NotificationManager $n) => [
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

    #[Route('/api/managers/notifications', name: 'notification_manager_create')]
    public function create(Request $request): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $this->getUser();
        $dto = NotificationInputDTO::fromRequest($request);
        $notification = new NotificationManager();
        $notification->setObject($dto->object);
        $notification->setBody($dto->body);
        $notification->setType($dto->type);
        $notification->setCreatedAt(new \DateTime());
        $notification->setIsRead(false);
        $notification->setManager($manager);

        $this->entityManager->persist($notification);
        $this->entityManager->flush();

        return $this->json([
            'notification' => $notification,
        ]);
    }

    #[Route('/api/managers/notifications/mark-all-as-read', name: 'notification_manager_mark_all_as_read', methods: ['PATCH'])]
    public function markAllAsRead(NotificationManagerRepository $notificationManagerRepository): JsonResponse
    {
        /** @var Manager $manager */
        $manager = $this->getUser();
        $notifications = $notificationManagerRepository->findBy([
            'manager' => $manager,
            'isRead' => false,
        ]);

        foreach ($notifications as $notification) {
            $notification->setIsRead(true);
            $notification->setReadAt(new \DateTime());
        }
        $this->entityManager->flush();

        return $this->json([
            'message' => 'All notifications marked as read.',
        ]);
    }
}
