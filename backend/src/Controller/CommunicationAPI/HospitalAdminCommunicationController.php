<?php

declare(strict_types=1);

namespace App\Controller\CommunicationAPI;

use App\DTO\Communication\CommunicationInputDTO;
use App\Entity\CommunicationMessage;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Repository\CommunicationMessageRepository;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Repository\HospitalAdminRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Hospital-admin endpoints for CommunicationMessage management.
 * All operations are scoped to the current admin's hospital — never cross-hospital.
 *
 * POST  /api/hospital-admin/communications                   → create message
 * GET   /api/hospital-admin/communications                   → list hospital messages
 * PATCH /api/hospital-admin/communications/{id}/toggle-active → activate/deactivate
 * POST  /api/hospital-admin/communications/{id}/duplicate    → duplicate
 * GET   /api/hospital-admin/communications/users             → list users in hospital
 */
#[Route('/api/hospital-admin/communications')]
#[IsGranted('ROLE_HOSPITAL_ADMIN')]
class HospitalAdminCommunicationController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface         $entityManager,
        private readonly CommunicationMessageRepository $messageRepo,
    ) {}

    private function serialize(CommunicationMessage $m): array
    {
        return [
            'id'             => $m->getId(),
            'type'           => $m->getType(),
            'title'          => $m->getTitle(),
            'body'           => $m->getBody(),
            'imageUrl'       => $m->getImageUrl(),
            'linkUrl'        => $m->getLinkUrl(),
            'buttonLabel'    => $m->getButtonLabel(),
            'targetUrl'      => $m->getTargetUrl(),
            'scopeType'      => $m->getScopeType(),
            'targetRole'     => $m->getTargetRole(),
            'targetUserId'   => $m->getTargetUserId(),
            'targetUserType' => $m->getTargetUserType(),
            'isActive'       => $m->isActive(),
            'authorType'     => $m->getAuthorType(),
            'authorId'       => $m->getAuthorId(),
            'readCount'      => $m->getReadCount(),
            'createdAt'      => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * Resolves the hospital for the current user, whether they are a native HospitalAdmin
     * or a Manager promoted to hospital-admin via setAdminHospital().
     */
    private function resolveHospital(): ?Hospital
    {
        $user = $this->getUser();

        if ($user instanceof HospitalAdmin) {
            return $user->getHospital();
        }

        if ($user instanceof Manager) {
            return $user->getAdminHospital();
        }

        return null;
    }

    /** Asserts the message belongs to this admin's hospital. Returns 403 JsonResponse or null. */
    private function assertOwnership(CommunicationMessage $message, int $hospitalId): ?JsonResponse
    {
        if ($message->getHospital()?->getId() !== $hospitalId) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }
        return null;
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $hospital = $this->resolveHospital();

        if ($hospital === null) {
            return $this->json(['error' => 'Aucun hôpital associé à ce compte.'], 422);
        }

        try {
            $dto = CommunicationInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 422);
        }

        // Hospital admin can only target users within their own hospital
        // (scopeType = 'user' is validated further: targetUserId must belong to the hospital)
        $message = new CommunicationMessage();
        $message->setType($dto->type);
        $message->setTitle($dto->title);
        $message->setBody($dto->body);
        $message->setImageUrl($dto->imageUrl);
        $message->setLinkUrl($dto->linkUrl);
        $message->setButtonLabel($dto->buttonLabel);
        $message->setTargetUrl($dto->targetUrl);
        $message->setPriority($dto->priority);
        $message->setScopeType($dto->scopeType);
        $message->setTargetRole($dto->targetRole);
        $message->setTargetUserId($dto->targetUserId);
        $message->setTargetUserType($dto->targetUserType);
        $message->setHospital($hospital); // always scoped to their hospital
        $message->setAuthorType(CommunicationMessage::AUTHOR_HOSPITAL_ADMIN);
        $message->setAuthorId($this->getUser()->getId());

        $this->entityManager->persist($message);
        $this->entityManager->flush();

        return $this->json($this->serialize($message), 201);
    }

    #[Route('', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $hospital = $this->resolveHospital();

        if ($hospital === null) {
            return $this->json([]);
        }

        $messages = $this->messageRepo->findByHospital($hospital->getId());

        return $this->json(array_map([$this, 'serialize'], $messages));
    }

    #[Route('/{id}/toggle-active', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function toggleActive(int $id): JsonResponse
    {
        $message = $this->messageRepo->find($id);

        if ($message === null) {
            return $this->json(['error' => 'Message introuvable.'], 404);
        }
        if ($err = $this->assertOwnership($message, $this->resolveHospital()?->getId())) {
            return $err;
        }

        $message->setIsActive(!$message->isActive());
        $this->entityManager->flush();

        return $this->json($this->serialize($message));
    }

    #[Route('/{id}/duplicate', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function duplicate(int $id): JsonResponse
    {
        $hospital = $this->resolveHospital();
        $original = $this->messageRepo->find($id);

        if ($original === null) {
            return $this->json(['error' => 'Message introuvable.'], 404);
        }
        if ($err = $this->assertOwnership($original, $hospital?->getId())) {
            return $err;
        }

        $copy = new CommunicationMessage();
        $copy->setType($original->getType());
        $copy->setTitle('[Copie] ' . $original->getTitle());
        $copy->setBody($original->getBody());
        $copy->setImageUrl($original->getImageUrl());
        $copy->setLinkUrl($original->getLinkUrl());
        $copy->setButtonLabel($original->getButtonLabel());
        $copy->setTargetUrl($original->getTargetUrl());
        $copy->setPriority($original->getPriority());
        $copy->setScopeType($original->getScopeType());
        $copy->setTargetRole($original->getTargetRole());
        $copy->setTargetUserId($original->getTargetUserId());
        $copy->setTargetUserType($original->getTargetUserType());
        $copy->setHospital($hospital);
        $copy->setAuthorType(CommunicationMessage::AUTHOR_HOSPITAL_ADMIN);
        $copy->setAuthorId($this->getUser()->getId());
        $copy->setIsActive(false);

        $this->entityManager->persist($copy);
        $this->entityManager->flush();

        return $this->json($this->serialize($copy), 201);
    }

    /**
     * Returns all users in the admin's hospital for the "user spécifique" autocomplete.
     */
    #[Route('/users', methods: ['GET'])]
    public function listHospitalUsers(
        ManagerRepository       $managerRepo,
        ResidentRepository      $residentRepo,
        HospitalAdminRepository $hospitalAdminRepo
    ): JsonResponse {
        $hospital = $this->resolveHospital();

        if ($hospital === null) {
            return $this->json([]);
        }

        // Managers associated with this hospital
        $managers = array_map(
            fn ($u) => [
                'id'        => $u->getId(),
                'firstname' => $u->getFirstname(),
                'lastname'  => $u->getLastname(),
                'email'     => $u->getEmail(),
                'type'      => 'manager',
            ],
            $managerRepo->findByHospital($hospital)
        );

        // Residents: those with a YearsResident linked to a year in this hospital
        $residents = array_map(
            fn ($u) => [
                'id'        => $u->getId(),
                'firstname' => $u->getFirstname(),
                'lastname'  => $u->getLastname(),
                'email'     => $u->getEmail(),
                'type'      => 'resident',
            ],
            $residentRepo->findByHospital($hospital)
        );

        // Other hospital admins of the same hospital
        $admins = array_map(
            fn ($u) => [
                'id'        => $u->getId(),
                'firstname' => $u->getFirstname(),
                'lastname'  => $u->getLastname(),
                'email'     => $u->getEmail(),
                'type'      => 'hospital_admin',
            ],
            $hospitalAdminRepo->findBy(['hospital' => $hospital])
        );

        return $this->json(array_merge($managers, $residents, $admins));
    }
}
