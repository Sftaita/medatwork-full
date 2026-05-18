<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ContactCcConfig;
use App\Repository\ContactCcConfigRepository;
use App\Repository\ContactMessageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Super-admin endpoints for contact message management and CC configuration.
 * All routes require ROLE_SUPER_ADMIN (enforced via access_control in security.yaml).
 */
#[Route('/api/admin/contact')]
class AdminContactController extends AbstractController
{
    // ── Messages ──────────────────────────────────────────────────────────────

    #[Route('/messages', name: 'admin_contact_messages_list', methods: ['GET'])]
    public function listMessages(Request $request, ContactMessageRepository $repo): JsonResponse
    {
        $filter = $request->query->get('treated');
        $messages = match ($filter) {
            '1', 'true'  => $repo->findByTreated(true),
            '0', 'false' => $repo->findByTreated(false),
            default      => $repo->findAll(),
        };

        return $this->json(array_map(fn ($m) => [
            'id'        => $m->getId(),
            'firstname' => $m->getFirstname(),
            'lastname'  => $m->getLastname(),
            'email'     => $m->getEmail(),
            'message'   => $m->getMessage(),
            'createdAt' => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'treatedAt' => $m->getTreatedAt()?->format(\DateTimeInterface::ATOM),
            'treatedBy' => $m->getTreatedBy(),
            'treated'   => $m->isTreated(),
        ], $messages));
    }

    #[Route('/messages/stats', name: 'admin_contact_messages_stats', methods: ['GET'])]
    public function stats(ContactMessageRepository $repo): JsonResponse
    {
        return $this->json(['untreated' => $repo->countUntreated()]);
    }

    #[Route('/messages/{id}/treat', name: 'admin_contact_messages_treat', methods: ['PATCH'])]
    public function treat(int $id, ContactMessageRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $msg = $repo->find($id);
        if ($msg === null) {
            return new JsonResponse(['message' => 'Message introuvable'], Response::HTTP_NOT_FOUND);
        }
        if ($msg->isTreated()) {
            return new JsonResponse(['message' => 'Déjà traité'], Response::HTTP_CONFLICT);
        }

        $admin = $this->getUser();
        $by = ($admin?->getFirstname() ?? '') . ' ' . ($admin?->getLastname() ?? '');
        $msg->markTreated(trim($by) ?: 'super_admin');
        $em->flush();

        return $this->json([
            'treatedAt' => $msg->getTreatedAt()?->format(\DateTimeInterface::ATOM),
            'treatedBy' => $msg->getTreatedBy(),
        ]);
    }

    #[Route('/messages/{id}', name: 'admin_contact_messages_delete', methods: ['DELETE'])]
    public function deleteMessage(int $id, ContactMessageRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $msg = $repo->find($id);
        if ($msg === null) {
            return new JsonResponse(['message' => 'Message introuvable'], Response::HTTP_NOT_FOUND);
        }
        $em->remove($msg);
        $em->flush();
        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    // ── CC Config ─────────────────────────────────────────────────────────────

    #[Route('/cc', name: 'admin_contact_cc_list', methods: ['GET'])]
    public function listCc(ContactCcConfigRepository $repo): JsonResponse
    {
        return $this->json(array_map(fn ($c) => [
            'id'       => $c->getId(),
            'email'    => $c->getEmail(),
            'name'     => $c->getName(),
            'isActive' => $c->isActive(),
        ], $repo->findAll()));
    }

    #[Route('/cc', name: 'admin_contact_cc_create', methods: ['POST'])]
    public function createCc(Request $request, ContactCcConfigRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = trim($data['email'] ?? '');
        $name  = trim($data['name']  ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['message' => 'Email invalide'], 400);
        }
        if ($name === '') {
            return new JsonResponse(['message' => 'Nom requis'], 400);
        }
        if (mb_strlen($name) > 100) {
            return new JsonResponse(['message' => 'Nom trop long'], 400);
        }
        if ($repo->findOneBy(['email' => $email]) !== null) {
            return new JsonResponse(['message' => 'Cet email est déjà configuré'], Response::HTTP_CONFLICT);
        }

        $cc = (new ContactCcConfig())->setEmail($email)->setName($name)->setIsActive(true);
        $em->persist($cc);
        $em->flush();

        return $this->json(['id' => $cc->getId(), 'email' => $cc->getEmail(), 'name' => $cc->getName(), 'isActive' => $cc->isActive()], Response::HTTP_CREATED);
    }

    #[Route('/cc/{id}', name: 'admin_contact_cc_update', methods: ['PATCH'])]
    public function updateCc(int $id, Request $request, ContactCcConfigRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $cc = $repo->find($id);
        if ($cc === null) {
            return new JsonResponse(['message' => 'Destinataire introuvable'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['isActive'])) {
            $cc->setIsActive((bool) $data['isActive']);
        }
        if (isset($data['name']) && trim($data['name']) !== '') {
            $cc->setName(trim($data['name']));
        }
        $em->flush();

        return $this->json(['id' => $cc->getId(), 'email' => $cc->getEmail(), 'name' => $cc->getName(), 'isActive' => $cc->isActive()]);
    }

    #[Route('/cc/{id}', name: 'admin_contact_cc_delete', methods: ['DELETE'])]
    public function deleteCc(int $id, ContactCcConfigRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $cc = $repo->find($id);
        if ($cc === null) {
            return new JsonResponse(['message' => 'Destinataire introuvable'], Response::HTTP_NOT_FOUND);
        }
        $em->remove($cc);
        $em->flush();
        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
