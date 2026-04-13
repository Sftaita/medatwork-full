<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\Resident;
use App\Enum\HospitalAdminStatus;
use App\Enum\ManagerStatus;
use App\Exceptions\AccountDisabledException;
use App\Security\UserChecker;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Unit tests for UserChecker::checkPreAuth().
 *
 * Covers:
 * - Resident with token → blocked
 * - Resident without token → allowed
 * - Manager with token → blocked (email not validated)
 * - Manager without token, Active → allowed
 * - Manager without token, PendingHospital → blocked with specific message
 * - HospitalAdmin Invited → blocked with specific message
 * - HospitalAdmin Active → allowed
 * - Unknown UserInterface implementation → allowed (no check)
 */
final class UserCheckerTest extends TestCase
{
    private UserChecker $checker;

    protected function setUp(): void
    {
        $this->checker = new UserChecker();
    }

    // ── Resident ──────────────────────────────────────────────────────────────

    public function testResidentWithTokenIsBlocked(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getToken')->willReturn('abc123');

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($resident);
    }

    public function testResidentWithoutTokenIsAllowed(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getToken')->willReturn(null);

        $this->checker->checkPreAuth($resident); // no exception
        $this->addToAssertionCount(1);
    }

    // ── Manager — email validation ────────────────────────────────────────────

    public function testManagerWithTokenIsBlocked(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getToken')->willReturn('abc123');

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($manager);
    }

    public function testManagerWithoutTokenAndActiveStatusIsAllowed(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getToken')->willReturn(null);
        $manager->method('getStatus')->willReturn(ManagerStatus::Active);

        $this->checker->checkPreAuth($manager); // no exception
        $this->addToAssertionCount(1);
    }

    // ── Manager — PendingHospital ─────────────────────────────────────────────

    public function testManagerPendingHospitalIsBlocked(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getToken')->willReturn(null);
        $manager->method('getStatus')->willReturn(ManagerStatus::PendingHospital);

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($manager);
    }

    public function testManagerPendingHospitalBlockMessageContainsValidation(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getToken')->willReturn(null);
        $manager->method('getStatus')->willReturn(ManagerStatus::PendingHospital);

        try {
            $this->checker->checkPreAuth($manager);
            $this->fail('AccountDisabledException expected');
        } catch (AccountDisabledException $e) {
            $this->assertStringContainsStringIgnoringCase('validation', $e->getMessageKey());
        }
    }

    // ── HospitalAdmin ─────────────────────────────────────────────────────────

    public function testHospitalAdminInvitedIsBlocked(): void
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getStatus')->willReturn(HospitalAdminStatus::Invited);

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($admin);
    }

    public function testHospitalAdminInvitedBlockMessageMentionsInvitation(): void
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getStatus')->willReturn(HospitalAdminStatus::Invited);

        try {
            $this->checker->checkPreAuth($admin);
            $this->fail('AccountDisabledException expected');
        } catch (AccountDisabledException $e) {
            $this->assertStringContainsStringIgnoringCase('invitation', $e->getMessageKey());
        }
    }

    public function testHospitalAdminActiveIsAllowed(): void
    {
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getStatus')->willReturn(HospitalAdminStatus::Active);

        $this->checker->checkPreAuth($admin); // no exception
        $this->addToAssertionCount(1);
    }

    // ── Unknown user type ─────────────────────────────────────────────────────

    public function testUnknownUserTypeIsAllowed(): void
    {
        $unknown = new class implements UserInterface {
            public function getRoles(): array { return ['ROLE_USER']; }
            public function eraseCredentials(): void {}
            public function getUserIdentifier(): string { return 'anon'; }
        };

        $this->checker->checkPreAuth($unknown); // no exception
        $this->addToAssertionCount(1);
    }

    // ── checkPostAuth ─────────────────────────────────────────────────────────

    public function testCheckPostAuthNeverThrows(): void
    {
        $user = $this->createMock(UserInterface::class);
        $this->checker->checkPostAuth($user); // no exception
        $this->addToAssertionCount(1);
    }
}
