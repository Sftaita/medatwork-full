<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Repository\ManagerRepository;
use App\Repository\ResidentRepository;
use App\Security\AuthenticationSuccessListener;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Tests for AuthenticationSuccessListener.
 *
 * Covers:
 * - Manager with avatar_path → avatarUrl present and correct in response
 * - Manager without avatar_path → avatarUrl is null
 * - Resident with avatar_path → avatarUrl present and correct in response
 * - AppAdmin with avatar_path → avatarUrl present (not hardcoded null)
 * - AppAdmin without avatar_path → avatarUrl is null
 * - HospitalAdmin with avatar_path → avatarUrl present and correct
 */
final class AuthenticationSuccessListenerTest extends TestCase
{
    private const API_URL = 'http://localhost:8000/api/';

    private function buildListener(): AuthenticationSuccessListener
    {
        return new AuthenticationSuccessListener(
            tokenTtl: 3600,
            residentRepository: $this->createMock(ResidentRepository::class),
            managerRepository: $this->createMock(ManagerRepository::class),
            apiUrl: self::API_URL,
        );
    }

    private function buildEvent(object $user): AuthenticationSuccessEvent
    {
        return new AuthenticationSuccessEvent(
            ['token' => 'fake.jwt.token'],
            $user,
            new JsonResponse(),
        );
    }

    // ── Manager ───────────────────────────────────────────────────────────────

    public function testManagerWithAvatarReturnsAvatarUrl(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getFirstname')->willReturn('Alice');
        $manager->method('getLastname')->willReturn('Dupont');
        $manager->method('getSexe')->willReturn(\App\Enum\Sexe::Female);
        $manager->method('getAvatarPath')->willReturn('abc123def456abc1.jpg');
        $manager->method('getAdminHospital')->willReturn(null);
        $manager->method('getRole')->willReturn('manager');
        $manager->method('isCanCreateYear')->willReturn(false);
        $manager->method('getJob')->willReturn(null);

        $event = $this->buildEvent($manager);
        $this->buildListener()->onAuthenticationSuccess($event);

        $data = $event->getData();
        $this->assertArrayHasKey('avatarUrl', $data);
        $this->assertStringContainsString('/api/profile/avatar/abc123def456abc1', $data['avatarUrl']);
        $this->assertStringStartsWith('http://localhost:8000', $data['avatarUrl']);
    }

    public function testManagerWithoutAvatarReturnsNullAvatarUrl(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getFirstname')->willReturn('Bob');
        $manager->method('getLastname')->willReturn('Martin');
        $manager->method('getSexe')->willReturn(\App\Enum\Sexe::Male);
        $manager->method('getAvatarPath')->willReturn(null);
        $manager->method('getAdminHospital')->willReturn(null);
        $manager->method('getRole')->willReturn('manager');
        $manager->method('isCanCreateYear')->willReturn(false);
        $manager->method('getJob')->willReturn(null);

        $event = $this->buildEvent($manager);
        $this->buildListener()->onAuthenticationSuccess($event);

        $this->assertNull($event->getData()['avatarUrl']);
    }

    // ── Resident ──────────────────────────────────────────────────────────────

    public function testResidentWithAvatarReturnsAvatarUrl(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getFirstname')->willReturn('Claire');
        $resident->method('getLastname')->willReturn('Leroy');
        $resident->method('getSexe')->willReturn(\App\Enum\Sexe::Female);
        $resident->method('getAvatarPath')->willReturn('11223344aabbccdd.jpg');
        $resident->method('getRole')->willReturn('resident');

        $event = $this->buildEvent($resident);
        $this->buildListener()->onAuthenticationSuccess($event);

        $data = $event->getData();
        $this->assertStringContainsString('/api/profile/avatar/11223344aabbccdd', $data['avatarUrl']);
    }

    // ── AppAdmin ──────────────────────────────────────────────────────────────

    public function testAppAdminWithAvatarReturnsAvatarUrl(): void
    {
        $admin = $this->createMock(AppAdmin::class);
        $admin->method('getFirstname')->willReturn('Super');
        $admin->method('getLastname')->willReturn('Admin');
        $admin->method('getAvatarPath')->willReturn('deadbeef12345678.jpg');

        $event = $this->buildEvent($admin);
        $this->buildListener()->onAuthenticationSuccess($event);

        $data = $event->getData();
        $this->assertArrayHasKey('avatarUrl', $data);
        $this->assertNotNull($data['avatarUrl'], 'AppAdmin avatarUrl doit être non-null quand avatar_path est défini');
        $this->assertStringContainsString('/api/profile/avatar/deadbeef12345678', $data['avatarUrl']);
    }

    public function testAppAdminWithoutAvatarReturnsNullAvatarUrl(): void
    {
        $admin = $this->createMock(AppAdmin::class);
        $admin->method('getFirstname')->willReturn('Super');
        $admin->method('getLastname')->willReturn('Admin');
        $admin->method('getAvatarPath')->willReturn(null);

        $event = $this->buildEvent($admin);
        $this->buildListener()->onAuthenticationSuccess($event);

        $this->assertNull($event->getData()['avatarUrl']);
    }

    // ── HospitalAdmin ─────────────────────────────────────────────────────────

    public function testHospitalAdminWithAvatarReturnsAvatarUrl(): void
    {
        $hospital = $this->createMock(\App\Entity\Hospital::class);
        $hospital->method('getId')->willReturn(1);
        $hospital->method('getName')->willReturn('CHU Liège');

        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getFirstname')->willReturn('Hôpital');
        $admin->method('getLastname')->willReturn('Admin');
        $admin->method('getHospital')->willReturn($hospital);
        $admin->method('getAvatarPath')->willReturn('cafebabe99887766.png');

        $event = $this->buildEvent($admin);
        $this->buildListener()->onAuthenticationSuccess($event);

        $data = $event->getData();
        $this->assertStringContainsString('/api/profile/avatar/cafebabe99887766', $data['avatarUrl']);
    }
}
