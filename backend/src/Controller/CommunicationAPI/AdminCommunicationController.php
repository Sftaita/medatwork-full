<?php

declare(strict_types=1);

namespace App\Controller\CommunicationAPI;

use App\DTO\Communication\CommunicationInputDTO;
use App\Entity\AppAdmin;
use App\Entity\CommunicationMessage;
use App\Repository\CommunicationMessageRepository;
use App\Repository\HospitalRepository;
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
 * Super-admin endpoints for CommunicationMessage management.
 *
 * POST  /api/admin/communications                   → create message
 * GET   /api/admin/communications                   → list all global messages
 * PATCH /api/admin/communications/{id}/toggle-active → activate / deactivate
 * POST  /api/admin/communications/{id}/duplicate    → duplicate message
 * GET   /api/admin/communications/users             → list all users for specific targeting
 */
#[Route('/api/admin/communications')]
#[IsGranted('ROLE_SUPER_ADMIN')]
class AdminCommunicationController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface      $entityManager,
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
            'hospital'       => $m->getHospital() ? ['id' => $m->getHospital()->getId(), 'name' => $m->getHospital()->getName()] : null,
            'isActive'       => $m->isActive(),
            'authorType'     => $m->getAuthorType(),
            'authorId'       => $m->getAuthorId(),
            'readCount'      => $m->getReadCount(),
            'createdAt'      => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, HospitalRepository $hospitalRepo): JsonResponse
    {
        try {
            $dto = CommunicationInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 422);
        }

        /** @var AppAdmin $admin */
        $admin = $this->getUser();

        $data = json_decode($request->getContent(), true) ?? [];

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
        $message->setAuthorType(CommunicationMessage::AUTHOR_SUPER_ADMIN);
        $message->setAuthorId($admin->getId());

        // Super admin can optionally restrict to one hospital
        if (!empty($data['hospitalId'])) {
            $hospital = $hospitalRepo->find((int) $data['hospitalId']);
            if ($hospital) {
                $message->setHospital($hospital);
            }
        }

        $this->entityManager->persist($message);
        $this->entityManager->flush();

        return $this->json($this->serialize($message), 201);
    }

    #[Route('', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $messages = $this->messageRepo->findGlobal();

        return $this->json(array_map([$this, 'serialize'], $messages));
    }

    #[Route('/{id}/toggle-active', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function toggleActive(int $id): JsonResponse
    {
        $message = $this->messageRepo->find($id);
        if ($message === null) {
            return $this->json(['error' => 'Message introuvable.'], 404);
        }

        $message->setIsActive(!$message->isActive());
        $this->entityManager->flush();

        return $this->json($this->serialize($message));
    }

    #[Route('/{id}/duplicate', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function duplicate(int $id): JsonResponse
    {
        $original = $this->messageRepo->find($id);
        if ($original === null) {
            return $this->json(['error' => 'Message introuvable.'], 404);
        }

        /** @var AppAdmin $admin */
        $admin = $this->getUser();

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
        $copy->setHospital($original->getHospital());
        $copy->setTargetUserId($original->getTargetUserId());
        $copy->setTargetUserType($original->getTargetUserType());
        $copy->setAuthorType(CommunicationMessage::AUTHOR_SUPER_ADMIN);
        $copy->setAuthorId($admin->getId());
        $copy->setIsActive(false); // copies start inactive

        $this->entityManager->persist($copy);
        $this->entityManager->flush();

        return $this->json($this->serialize($copy), 201);
    }

    #[Route('/users', methods: ['GET'])]
    public function listUsers(
        ManagerRepository       $managerRepo,
        ResidentRepository      $residentRepo,
        HospitalAdminRepository $hospitalAdminRepo
    ): JsonResponse {
        $managers = array_map(
            fn ($u) => ['id' => $u->getId(), 'firstname' => $u->getFirstname(), 'lastname' => $u->getLastname(), 'email' => $u->getEmail(), 'type' => 'manager'],
            $managerRepo->findAll()
        );
        $residents = array_map(
            fn ($u) => ['id' => $u->getId(), 'firstname' => $u->getFirstname(), 'lastname' => $u->getLastname(), 'email' => $u->getEmail(), 'type' => 'resident'],
            $residentRepo->findAll()
        );
        $admins = array_map(
            fn ($u) => ['id' => $u->getId(), 'firstname' => $u->getFirstname(), 'lastname' => $u->getLastname(), 'email' => $u->getEmail(), 'type' => 'hospital_admin'],
            $hospitalAdminRepo->findAll()
        );

        return $this->json(array_merge($managers, $residents, $admins));
    }
}
