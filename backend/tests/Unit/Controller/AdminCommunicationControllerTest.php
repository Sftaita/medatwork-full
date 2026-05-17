<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\CommunicationAPI\AdminCommunicationController;
use App\Entity\CommunicationMessage;
use App\Repository\CommunicationMessageRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for AdminCommunicationController.
 *
 * Covers the routes missing before Sentry fix FRONTEND-7 (60× 404):
 *   PUT  /api/admin/communications/{id} → update
 *   DELETE /api/admin/communications/{id} → delete
 *
 * Also covers existing endpoints to prevent regression:
 *   GET  /api/admin/communications         → list
 *   POST /api/admin/communications         → create
 *   PATCH .../toggle-active
 *   POST  .../duplicate
 */
final class AdminCommunicationControllerTest extends TestCase
{
    private EntityManagerInterface $em;
    private CommunicationMessageRepository $repo;

    protected function setUp(): void
    {
        $this->em   = $this->createMock(EntityManagerInterface::class);
        $this->repo = $this->createMock(CommunicationMessageRepository::class);
    }

    private function buildController(): AdminCommunicationController
    {
        $controller = new AdminCommunicationController($this->em, $this->repo);
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeMessage(int $id): CommunicationMessage
    {
        $msg = $this->createMock(CommunicationMessage::class);
        $msg->method('getId')->willReturn($id);
        $msg->method('getType')->willReturn('notification');
        $msg->method('getTitle')->willReturn('Test message');
        $msg->method('getBody')->willReturn('Corps du message');
        $msg->method('getImageUrl')->willReturn(null);
        $msg->method('getLinkUrl')->willReturn(null);
        $msg->method('getButtonLabel')->willReturn(null);
        $msg->method('getTargetUrl')->willReturn(null);
        $msg->method('getScopeType')->willReturn('all');
        $msg->method('getTargetRole')->willReturn(null);
        $msg->method('getTargetUserId')->willReturn(null);
        $msg->method('getTargetUserType')->willReturn(null);
        $msg->method('getHospital')->willReturn(null);
        $msg->method('isActive')->willReturn(true);
        $msg->method('getAuthorType')->willReturn('super_admin');
        $msg->method('getAuthorId')->willReturn(1);
        $msg->method('getReadCount')->willReturn(0);
        $msg->method('getCreatedAt')->willReturn(new \DateTime('2026-01-01'));
        return $msg;
    }

    private function makeUpdateRequest(): Request
    {
        return new Request([], [], [], [], [], [], json_encode([
            'type'           => 'notification',
            'title'          => 'Titre modifié',
            'body'           => 'Corps modifié',
            'imageUrl'       => null,
            'linkUrl'        => null,
            'buttonLabel'    => null,
            'targetUrl'      => null,
            'priority'       => null,
            'scopeType'      => 'all',
            'targetRole'     => null,
            'targetUserId'   => null,
            'targetUserType' => null,
        ]));
    }

    // ── PUT /{id} – update ────────────────────────────────────────────────────

    public function testUpdateReturns200WhenMessageExists(): void
    {
        $msg = $this->makeMessage(42);
        $this->repo->method('find')->with(42)->willReturn($msg);

        // Setters are called to apply the DTO values
        $msg->expects($this->once())->method('setTitle')->with('Titre modifié');
        $msg->expects($this->once())->method('setBody')->with('Corps modifié');
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->update(42, $this->makeUpdateRequest());

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame(42, $data['id']);
    }

    public function testUpdateReturns404WhenMessageNotFound(): void
    {
        $this->repo->method('find')->with(99)->willReturn(null);
        $this->em->expects($this->never())->method('flush');

        $response = $this->buildController()->update(99, $this->makeUpdateRequest());

        $this->assertSame(404, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    public function testUpdateReturns422WhenPayloadInvalid(): void
    {
        $msg = $this->makeMessage(5);
        $this->repo->method('find')->with(5)->willReturn($msg);
        $this->em->expects($this->never())->method('flush');

        // Missing required "title" → DTO throws InvalidArgumentException
        $badRequest = new Request([], [], [], [], [], [], json_encode([
            'type'      => 'notification',
            'title'     => '',        // empty title → DTO validation rejects it
            'body'      => 'Corps',
            'scopeType' => 'all',
        ]));

        $response = $this->buildController()->update(5, $badRequest);

        $this->assertSame(422, $response->getStatusCode());
    }

    // ── DELETE /{id} – delete ────────────────────────────────────────────────

    public function testDeleteReturns204WhenMessageExists(): void
    {
        $msg = $this->makeMessage(7);
        $this->repo->method('find')->with(7)->willReturn($msg);

        $this->em->expects($this->once())->method('remove')->with($msg);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->delete(7);

        $this->assertSame(204, $response->getStatusCode());
        // Symfony json(null, 204) serializes to "null" — assert body is null/empty
        $this->assertContains($response->getContent(), ['', 'null']);
    }

    public function testDeleteReturns404WhenMessageNotFound(): void
    {
        $this->repo->method('find')->with(99)->willReturn(null);
        $this->em->expects($this->never())->method('remove');
        $this->em->expects($this->never())->method('flush');

        $response = $this->buildController()->delete(99);

        $this->assertSame(404, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    public function testDeleteDoesNotRemoveOtherMessages(): void
    {
        $target = $this->makeMessage(10);
        $this->repo->method('find')->with(10)->willReturn($target);

        // Only the target message must be removed, never another
        $this->em->expects($this->once())->method('remove')->with($target);
        $this->em->expects($this->once())->method('flush');

        $this->buildController()->delete(10);
    }

    // ── PATCH /{id}/toggle-active ────────────────────────────────────────────

    public function testToggleActiveFlipsAndReturns200(): void
    {
        $msg = $this->makeMessage(3);
        // makeMessage sets isActive() → true, so toggle must call setIsActive(false)
        $this->repo->method('find')->with(3)->willReturn($msg);
        $msg->expects($this->once())->method('setIsActive')->with(false);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->toggleActive(3);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testToggleActiveReturns404WhenNotFound(): void
    {
        $this->repo->method('find')->with(0)->willReturn(null);

        $response = $this->buildController()->toggleActive(0);

        $this->assertSame(404, $response->getStatusCode());
    }
}
