<?php

declare(strict_types=1);

namespace App\Controller\CommunicationAPI;

use App\Entity\CommunicationMessage;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\CommunicationMessageReadRepository;
use App\Repository\CommunicationMessageRepository;
use App\Repository\YearsResidentRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Endpoints consumed by any authenticated user (manager, resident, hospital_admin).
 *
 * GET    /api/communications/notifications                → list all notifications for user
 * GET    /api/communications/notifications/unread-count  → badge count
 * PATCH  /api/communications/notifications/{id}/read    → mark one notification as read
 * DELETE /api/communications/notifications/{id}/read    → mark one notification as unread
 * PATCH  /api/communications/notifications/read-all     → mark all notifications as read
 * GET    /api/communications/modals/pending              → pending modals for user
 * PATCH  /api/communications/modals/{id}/read           → mark one modal as read (after "J'ai compris")
 */
#[Route('/api/communications')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class UserCommunicationController extends AbstractController
{
    public function __construct(
        private readonly CommunicationMessageRepository     $messageRepo,
        private readonly CommunicationMessageReadRepository $readRepo,
        private readonly YearsResidentRepository            $yearsResidentRepo,
    ) {}

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** Returns (userType, userId, hospitalId) for the current user. */
    private function resolveUser(): array
    {
        $user = $this->getUser();

        if ($user instanceof Manager) {
            return [
                CommunicationMessage::ROLE_MANAGER,
                $user->getId(),
                $user->getAdminHospital()?->getId(),
            ];
        }
        if ($user instanceof Resident) {
            // Residents are linked to hospitals via their academic years (YearsResident → Years → Hospital).
            // We collect all hospital IDs associated with any of their years so they receive
            // messages scoped to any of those hospitals, in addition to global messages.
            $hospitalIds = $this->yearsResidentRepo->findHospitalIdsByResident($user->getId());
            return [
                CommunicationMessage::ROLE_RESIDENT,
                $user->getId(),
                $hospitalIds ?: null, // null → only global messages when no years found
            ];
        }
        if ($user instanceof HospitalAdmin) {
            return [
                CommunicationMessage::ROLE_HOSPITAL_ADMIN,
                $user->getId(),
                $user->getHospital()?->getId(),
            ];
        }

        throw new \LogicException('Unknown user type: ' . get_class($user));
    }

    private function serializeMessage(CommunicationMessage $m, string $userType, int $userId): array
    {
        $readRecord = $this->readRepo->findOneByMessageAndUser($m, $userType, $userId);

        return [
            'id'          => $m->getId(),
            'type'        => $m->getType(),
            'title'       => $m->getTitle(),
            'body'        => $m->getBody(),
            'imageUrl'    => $m->getImageUrl(),
            'linkUrl'     => $m->getLinkUrl(),
            'buttonLabel' => $m->getButtonLabel(),
            'targetUrl'   => $m->getTargetUrl(),
            'isRead'      => $readRecord !== null,
            'readAt'      => $readRecord?->getReadAt()->format(\DateTimeInterface::ATOM),
            'createdAt'   => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    // ─── Notifications ──────────────────────────────────────────────────────────

    #[Route('/notifications', methods: ['GET'])]
    public function listNotifications(): JsonResponse
    {
        [$userType, $userId, $hospitalId] = $this->resolveUser();

        $messages = $this->messageRepo->findAllForUser(
            $userType,
            $userId,
            $hospitalId,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        return $this->json(array_map(
            fn (CommunicationMessage $m) => $this->serializeMessage($m, $userType, $userId),
            $messages
        ));
    }

    #[Route('/notifications/unread-count', methods: ['GET'])]
    public function unreadCount(): JsonResponse
    {
        [$userType, $userId, $hospitalId] = $this->resolveUser();

        $count = $this->messageRepo->countUnreadNotificationsForUser($userType, $userId, $hospitalId);

        return $this->json(['count' => $count]);
    }

    #[Route('/notifications/read-all', methods: ['PATCH'])]
    public function markAllNotificationsAsRead(): JsonResponse
    {
        [$userType, $userId, $hospitalId] = $this->resolveUser();

        $unread = $this->messageRepo->findUnreadForUser(
            $userType,
            $userId,
            $hospitalId,
            CommunicationMessage::TYPE_NOTIFICATION
        );

        $this->readRepo->markAllNotificationsAsRead($unread, $userType, $userId);

        return $this->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }

    #[Route('/notifications/{id}/read', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function markNotificationAsRead(int $id): JsonResponse
    {
        [$userType, $userId] = $this->resolveUser();

        $message = $this->messageRepo->find($id);
        if ($message === null || $message->getType() !== CommunicationMessage::TYPE_NOTIFICATION) {
            return $this->json(['error' => 'Notification introuvable.'], 404);
        }

        $this->readRepo->markAsRead($message, $userType, $userId);

        return $this->json(['message' => 'Notification marquée comme lue.']);
    }

    #[Route('/notifications/{id}/read', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function markNotificationAsUnread(int $id): JsonResponse
    {
        [$userType, $userId] = $this->resolveUser();

        $message = $this->messageRepo->find($id);
        if ($message === null || $message->getType() !== CommunicationMessage::TYPE_NOTIFICATION) {
            return $this->json(['error' => 'Notification introuvable.'], 404);
        }

        $this->readRepo->markAsUnread($message, $userType, $userId);

        return $this->json(['message' => 'Notification marquée comme non lue.']);
    }

    // ─── Modals ─────────────────────────────────────────────────────────────────

    #[Route('/modals/pending', methods: ['GET'])]
    public function pendingModals(): JsonResponse
    {
        [$userType, $userId, $hospitalId] = $this->resolveUser();

        $modals = $this->messageRepo->findPendingModalsForUser($userType, $userId, $hospitalId);

        return $this->json(array_map(
            fn (CommunicationMessage $m) => $this->serializeMessage($m, $userType, $userId),
            $modals
        ));
    }

    #[Route('/modals/{id}/read', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function markModalAsRead(int $id): JsonResponse
    {
        [$userType, $userId] = $this->resolveUser();

        $message = $this->messageRepo->find($id);
        if ($message === null || $message->getType() !== CommunicationMessage::TYPE_MODAL) {
            return $this->json(['error' => 'Modal introuvable.'], 404);
        }

        $this->readRepo->markAsRead($message, $userType, $userId);

        return $this->json(['message' => 'Modal marquée comme lue.']);
    }
}
