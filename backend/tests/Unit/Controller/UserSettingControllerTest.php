<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ProfileAPI\UserSettingController;
use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Services\UserSettingService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Tests for UserSettingController.
 *
 * Covers:
 * - GET: 401 without user, 200 with merged defaults
 * - PATCH: 400 on invalid body, 200 on valid patch
 * - All user types resolve correctly
 */
final class UserSettingControllerTest extends TestCase
{
    private UserSettingService&MockObject $service;

    protected function setUp(): void
    {
        $this->service = $this->createMock(UserSettingService::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(?object $user): UserSettingController
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($user !== null ? $token : null);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $ctrl = new UserSettingController($this->service);
        $ctrl->setContainer($container);
        return $ctrl;
    }

    private function makeResident(): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(10);
        return $r;
    }

    private function makeManager(): Manager&MockObject
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn(20);
        return $m;
    }

    private function makeHospitalAdmin(): HospitalAdmin&MockObject
    {
        $a = $this->createMock(HospitalAdmin::class);
        $a->method('getId')->willReturn(30);
        return $a;
    }

    private function makeAppAdmin(): AppAdmin&MockObject
    {
        $a = $this->createMock(AppAdmin::class);
        $a->method('getId')->willReturn(99);
        return $a;
    }

    private function defaults(): array
    {
        return [
            'theme'         => 'light',
            'language'      => 'fr',
            'calendar'      => ['defaultView' => 'month', 'showWeekends' => true],
            'notifications' => ['email' => true, 'push' => true, 'compliance' => true, 'dailySummary' => false],
        ];
    }

    // ── GET — 401 ─────────────────────────────────────────────────────────────

    public function testGetReturns401WhenNoUser(): void
    {
        $ctrl     = $this->buildController(null);
        $response = $ctrl->get();
        $this->assertSame(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
    }

    // ── GET — 200 ─────────────────────────────────────────────────────────────

    public function testGetReturnsDefaultsForResident(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);
        $this->service->method('getForUser')->with('resident', 10)->willReturn($this->defaults());

        $ctrl     = $this->buildController($user);
        $response = $ctrl->get();

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('resident', $data['userType']);
        $this->assertSame('light', $data['settings']['theme']);
        $this->assertSame('fr', $data['settings']['language']);
    }

    public function testGetWorksForManager(): void
    {
        $this->service->method('resolveIdentity')->willReturn(['manager', 20]);
        $this->service->method('getForUser')->willReturn($this->defaults());

        $response = $this->buildController($this->makeManager())->get();
        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testGetWorksForHospitalAdmin(): void
    {
        $this->service->method('resolveIdentity')->willReturn(['hospital_admin', 30]);
        $this->service->method('getForUser')->willReturn($this->defaults());

        $response = $this->buildController($this->makeHospitalAdmin())->get();
        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testGetWorksForAppAdmin(): void
    {
        $this->service->method('resolveIdentity')->willReturn(['app_admin', 99]);
        $this->service->method('getForUser')->willReturn($this->defaults());

        $response = $this->buildController($this->makeAppAdmin())->get();
        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    // ── PATCH — 400 ───────────────────────────────────────────────────────────

    public function testPatchReturns400OnInvalidJson(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);

        $request  = new Request([], [], [], [], [], [], 'not-json');
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testPatchReturns400OnUnknownKey(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);

        $request  = new Request([], [], [], [], [], [], json_encode(['unknownKey' => 'value']));
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testPatchReturns400OnInvalidTheme(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);

        $request  = new Request([], [], [], [], [], [], json_encode(['theme' => 'purple']));
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testPatchReturns400OnInvalidLanguage(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);

        $request  = new Request([], [], [], [], [], [], json_encode(['language' => 'de']));
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testPatchReturns400OnNotificationNonBool(): void
    {
        $user = $this->makeResident();
        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);

        $request  = new Request([], [], [], [], [], [], json_encode(['notifications' => ['email' => 'yes']]));
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    // ── PATCH — 200 ───────────────────────────────────────────────────────────

    public function testPatchThemeReturns200WithMergedSettings(): void
    {
        $user    = $this->makeResident();
        $updated = array_merge($this->defaults(), ['theme' => 'dark']);

        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);
        $this->service->method('patchForUser')->with('resident', 10, ['theme' => 'dark'])->willReturn($updated);

        $request  = new Request([], [], [], [], [], [], json_encode(['theme' => 'dark']));
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('dark', $data['settings']['theme']);
    }

    public function testPatchCalendarReturns200(): void
    {
        $user    = $this->makeManager();
        $updated = $this->defaults();
        $updated['calendar']['defaultView'] = 'week';

        $this->service->method('resolveIdentity')->willReturn(['manager', 20]);
        $this->service->method('patchForUser')->willReturn($updated);

        $body     = json_encode(['calendar' => ['defaultView' => 'week']]);
        $request  = new Request([], [], [], [], [], [], $body);
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertSame('week', $data['settings']['calendar']['defaultView']);
    }

    public function testPatchNotificationsReturns200(): void
    {
        $user    = $this->makeResident();
        $updated = $this->defaults();
        $updated['notifications']['email'] = false;

        $this->service->method('resolveIdentity')->willReturn(['resident', 10]);
        $this->service->method('patchForUser')->willReturn($updated);

        $body     = json_encode(['notifications' => ['email' => false]]);
        $request  = new Request([], [], [], [], [], [], $body);
        $response = $this->buildController($user)->patch($request);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }
}
