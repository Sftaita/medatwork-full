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
 * The activation criterion is validatedAt === null, NOT token !== null.
 * A non-null token may represent a pending password reset on an already-activated
 * account and must never block login.
 *
 * Covers:
 * - Resident with validatedAt null            → blocked
 * - Resident with validatedAt set             → allowed
 * - Resident activated + reset token pending  → allowed (regression for password-reset flow)
 * - Manager with validatedAt null             → blocked
 * - Manager with validatedAt set, Active      → allowed
 * - Manager activated + reset token pending   → allowed
 * - Manager with validatedAt set, PendingHospital → blocked with specific message
 * - HospitalAdmin Invited                     → blocked with specific message
 * - HospitalAdmin Active                      → allowed
 * - Unknown UserInterface implementation      → allowed (no check)
 */
final class UserCheckerTest extends TestCase
{
    private UserChecker $checker;

    protected function setUp(): void
    {
        $this->checker = new UserChecker();
    }

    // ── Resident ──────────────────────────────────────────────────────────────

    public function testNonActivatedResidentIsBlocked(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(null);

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($resident);
    }

    public function testActivatedResidentIsAllowed(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(new \DateTime());

        $this->checker->checkPreAuth($resident); // no exception
        $this->addToAssertionCount(1);
    }

    /** Regression: password-reset flow sets a non-null token on activated accounts. */
    public function testActivatedResidentWithPendingResetTokenIsNotBlocked(): void
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getValidatedAt')->willReturn(new \DateTime());
        $resident->method('getToken')->willReturn('some64hexresettoken0000000000000000000000000000000000000000000000');

        $this->checker->checkPreAuth($resident); // no exception
        $this->addToAssertionCount(1);
    }

    // ── Manager — email validation ────────────────────────────────────────────

    public function testNonActivatedManagerIsBlocked(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(null);

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($manager);
    }

    public function testActivatedManagerWithActiveStatusIsAllowed(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(new \DateTime());
        $manager->method('getStatus')->willReturn(ManagerStatus::Active);

        $this->checker->checkPreAuth($manager); // no exception
        $this->addToAssertionCount(1);
    }

    /** Regression: password-reset flow must not lock out activated managers. */
    public function testActivatedManagerWithPendingResetTokenIsNotBlocked(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(new \DateTime());
        $manager->method('getToken')->willReturn('some64hexresettoken0000000000000000000000000000000000000000000000');
        $manager->method('getStatus')->willReturn(ManagerStatus::Active);

        $this->checker->checkPreAuth($manager); // no exception
        $this->addToAssertionCount(1);
    }

    // ── Manager — PendingHospital ─────────────────────────────────────────────

    public function testActivatedManagerPendingHospitalIsBlocked(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(new \DateTime());
        $manager->method('getStatus')->willReturn(ManagerStatus::PendingHospital);

        $this->expectException(AccountDisabledException::class);
        $this->checker->checkPreAuth($manager);
    }

    public function testActivatedManagerPendingHospitalBlockMessageContainsValidation(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getValidatedAt')->willReturn(new \DateTime());
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
