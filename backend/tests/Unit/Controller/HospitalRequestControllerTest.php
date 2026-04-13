<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalRequestController;
use App\Entity\HospitalRequest;
use App\Entity\Manager;
use App\Enum\HospitalRequestStatus;
use App\Repository\HospitalRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for HospitalRequestController.
 *
 * Covers:
 * - Non-manager user gets 403
 * - Manager creates request → 201 + message ok
 * - Duplicate pending request returns 200 silently (no persist)
 * - Invalid body returns 400
 * - List returns manager's requests with correct shape
 * - List returns empty array when no requests
 */
final class HospitalRequestControllerTest extends TestCase
{
    private HospitalRequestRepository $repo;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->repo = $this->createMock(HospitalRequestRepository::class);
        $this->em   = $this->createMock(EntityManagerInterface::class);
    }

    /** Build a controller with getUser() overridden to return $user. */
    private function controllerForUser(mixed $user): HospitalRequestController
    {
        $controller = new class($user) extends HospitalRequestController {
            public function __construct(private readonly mixed $fakeUser) {}
            public function getUser(): ?\Symfony\Component\Security\Core\User\UserInterface
            {
                // Cast: return null for non-UserInterface objects to simulate anonymous/wrong user
                return $this->fakeUser instanceof \Symfony\Component\Security\Core\User\UserInterface
                    ? $this->fakeUser
                    : null;
            }
        };
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    // ── Security — non-manager ────────────────────────────────────────────────

    public function testNonManagerGetsForbiddenOnCreate(): void
    {
        $response = $this->controllerForUser(new \stdClass())->create(
            $this->makeRequest(['hospitalName' => 'CHU Liège']),
            $this->em,
            $this->repo,
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testNonManagerGetsForbiddenOnList(): void
    {
        $response = $this->controllerForUser(new \stdClass())->list($this->repo);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testNullUserGetsForbiddenOnCreate(): void
    {
        $response = $this->controllerForUser(null)->create(
            $this->makeRequest(['hospitalName' => 'CHU Liège']),
            $this->em,
            $this->repo,
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    // ── Create — happy path ───────────────────────────────────────────────────

    public function testManagerCreatesRequestReturns201(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->repo->method('findOneBy')->willReturn(null);
        $this->em->method('persist');

        $response = $this->controllerForUser($manager)->create(
            $this->makeRequest(['hospitalName' => 'CHU Liège']),
            $this->em,
            $this->repo,
        );

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testCreateResponseContainsMessageOk(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->repo->method('findOneBy')->willReturn(null);

        $response = $this->controllerForUser($manager)->create(
            $this->makeRequest(['hospitalName' => 'Clinique X']),
            $this->em,
            $this->repo,
        );

        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('ok', $data['message']);
    }

    public function testCreatePersistsHospitalRequest(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->repo->method('findOneBy')->willReturn(null);

        $persisted = null;
        $this->em->method('persist')->willReturnCallback(function (object $obj) use (&$persisted): void {
            if ($obj instanceof HospitalRequest) {
                $persisted = $obj;
            }
        });

        $this->controllerForUser($manager)->create(
            $this->makeRequest(['hospitalName' => 'CHU Liège']),
            $this->em,
            $this->repo,
        );

        $this->assertNotNull($persisted, 'HospitalRequest must be persisted');
    }

    // ── Create — duplicate prevention ────────────────────────────────────────

    public function testDuplicatePendingRequestReturns200(): void
    {
        $manager  = $this->createMock(Manager::class);
        $existing = $this->createMock(HospitalRequest::class);
        $this->repo->method('findOneBy')->willReturn($existing);

        $this->em->expects($this->never())->method('persist');

        $response = $this->controllerForUser($manager)->create(
            $this->makeRequest(['hospitalName' => 'CHU Liège']),
            $this->em,
            $this->repo,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    // ── Create — bad DTO ─────────────────────────────────────────────────────

    public function testInvalidBodyReturns400(): void
    {
        $manager = $this->createMock(Manager::class);

        $response = $this->controllerForUser($manager)->create(
            $this->makeRequest([]), // missing hospitalName
            $this->em,
            $this->repo,
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    // ── List ─────────────────────────────────────────────────────────────────

    public function testListReturnsManagerRequestsAsJson(): void
    {
        $manager = $this->createMock(Manager::class);

        $req = $this->createMock(HospitalRequest::class);
        $req->method('getId')->willReturn(5);
        $req->method('getHospitalName')->willReturn('CHU Liège');
        $req->method('getStatus')->willReturn(HospitalRequestStatus::Pending);
        $req->method('getCreatedAt')->willReturn(new \DateTime('2026-01-01 10:00:00'));

        $this->repo->method('findBy')->willReturn([$req]);

        $response = $this->controllerForUser($manager)->list($this->repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(1, $data);
        $this->assertSame(5, $data[0]['id']);
        $this->assertSame('CHU Liège', $data[0]['hospitalName']);
        $this->assertSame('pending', $data[0]['status']);
    }

    public function testListReturnsEmptyArrayWhenNoRequests(): void
    {
        $manager = $this->createMock(Manager::class);
        $this->repo->method('findBy')->willReturn([]);

        $response = $this->controllerForUser($manager)->list($this->repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame([], $data);
    }
}
