<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\UserSetting;
use App\Repository\ManagerRepository;
use App\Repository\UserSettingRepository;
use App\Services\UserSettingService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for UserSettingService.
 *
 * Covers:
 * - defaults structure
 * - getForUser merges with defaults
 * - patchForUser merges and flushes
 * - resolveIdentity for all user types
 */
final class UserSettingServiceTest extends TestCase
{
    private UserSettingRepository&MockObject $repo;
    private ManagerRepository&MockObject    $managerRepo;
    private EntityManagerInterface&MockObject $em;
    private UserSettingService $service;

    protected function setUp(): void
    {
        $this->repo        = $this->createMock(UserSettingRepository::class);
        $this->managerRepo = $this->createMock(ManagerRepository::class);
        $this->em          = $this->createMock(EntityManagerInterface::class);
        $this->service     = new UserSettingService($this->repo, $this->managerRepo, $this->em);
    }

    // ── Defaults ──────────────────────────────────────────────────────────────

    public function testDefaultsHaveExpectedKeys(): void
    {
        $defaults = $this->service->getDefaults();

        $this->assertArrayHasKey('theme', $defaults);
        $this->assertArrayHasKey('language', $defaults);
        $this->assertArrayHasKey('calendar', $defaults);
        $this->assertArrayHasKey('notifications', $defaults);
        $this->assertArrayHasKey('ui', $defaults);
        $this->assertArrayHasKey('tables', $defaults);
        $this->assertSame('light', $defaults['theme']);
        $this->assertSame('fr', $defaults['language']);
        $this->assertSame('month', $defaults['calendar']['defaultView']);
        $this->assertNull($defaults['calendar']['lastUsedView']);
        $this->assertTrue($defaults['calendar']['showWeekends']);
        $this->assertFalse($defaults['notifications']['dailySummary']);
        $this->assertTrue($defaults['notifications']['validation']);
        $this->assertTrue($defaults['notifications']['planning']);
        $this->assertTrue($defaults['notifications']['staffPlanner']);
        $this->assertFalse($defaults['ui']['sidebarCollapsed']);
        $this->assertSame(25, $defaults['tables']['staffPlanner']['pageSize']);
        $this->assertFalse($defaults['tables']['staffPlanner']['dense']);
    }

    // ── getForUser ────────────────────────────────────────────────────────────

    public function testGetForUserReturnsDefaultsWhenNoRecord(): void
    {
        $this->repo->method('findByUser')->willReturn(null);

        $result = $this->service->getForUser('resident', 1);

        $this->assertSame('light', $result['theme']);
        $this->assertSame('fr', $result['language']);
    }

    public function testGetForUserMergesStoredWithDefaults(): void
    {
        $stored = new UserSetting('resident', 1, ['theme' => 'dark', 'language' => 'nl']);
        $this->repo->method('findByUser')->willReturn($stored);

        $result = $this->service->getForUser('resident', 1);

        $this->assertSame('dark', $result['theme']);
        $this->assertSame('nl', $result['language']);
        // Defaults still present for non-stored keys
        $this->assertSame('month', $result['calendar']['defaultView']);
    }

    public function testGetForUserFallsBackToDefaultForMissingNestedKey(): void
    {
        // Stored has calendar but missing showWeekends
        $stored = new UserSetting('manager', 2, ['calendar' => ['defaultView' => 'week']]);
        $this->repo->method('findByUser')->willReturn($stored);

        $result = $this->service->getForUser('manager', 2);

        $this->assertSame('week', $result['calendar']['defaultView']);
        $this->assertTrue($result['calendar']['showWeekends']); // from defaults
    }

    // ── patchForUser ──────────────────────────────────────────────────────────

    public function testPatchForUserMergesPatchAndFlushes(): void
    {
        $stored = new UserSetting('resident', 1, ['theme' => 'light', 'language' => 'fr']);
        $this->repo->method('getOrCreate')->willReturn($stored);
        $this->em->expects($this->once())->method('flush');

        $result = $this->service->patchForUser('resident', 1, ['theme' => 'dark']);

        $this->assertSame('dark', $result['theme']);
        $this->assertSame('fr', $result['language']);
    }

    public function testPatchForUserMergesNestedNotifications(): void
    {
        $stored = new UserSetting('manager', 2, $this->service->getDefaults());
        $this->repo->method('getOrCreate')->willReturn($stored);
        $this->em->method('flush');

        $result = $this->service->patchForUser('manager', 2, [
            'notifications' => ['email' => false, 'dailySummary' => true],
        ]);

        $this->assertFalse($result['notifications']['email']);
        $this->assertTrue($result['notifications']['dailySummary']);
        $this->assertTrue($result['notifications']['push']); // unchanged default
    }

    // ── compliance sync ───────────────────────────────────────────────────────

    public function testPatchForManagerSyncsComplianceEmail(): void
    {
        $manager = $this->createMock(Manager::class);
        $manager->expects($this->once())
            ->method('setReceiveComplianceEmails')
            ->with(false);

        $stored = new UserSetting('manager', 5, $this->service->getDefaults());
        $this->repo->method('getOrCreate')->willReturn($stored);
        $this->managerRepo->method('find')->with(5)->willReturn($manager);
        $this->em->method('flush');

        $this->service->patchForUser('manager', 5, ['notifications' => ['compliance' => false]]);
    }

    public function testPatchForResidentDoesNotTouchManagerRepo(): void
    {
        $stored = new UserSetting('resident', 3, $this->service->getDefaults());
        $this->repo->method('getOrCreate')->willReturn($stored);
        $this->managerRepo->expects($this->never())->method('find');
        $this->em->method('flush');

        $this->service->patchForUser('resident', 3, ['notifications' => ['compliance' => false]]);
    }

    public function testPatchWithoutComplianceKeySkipsSyncEvenForManager(): void
    {
        $stored = new UserSetting('manager', 7, $this->service->getDefaults());
        $this->repo->method('getOrCreate')->willReturn($stored);
        $this->managerRepo->expects($this->never())->method('find');
        $this->em->method('flush');

        $this->service->patchForUser('manager', 7, ['theme' => 'dark']);
    }

    // ── resolveIdentity ───────────────────────────────────────────────────────

    public function testResolveResidentIdentity(): void
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(10);

        [$type, $id] = $this->service->resolveIdentity($r);

        $this->assertSame('resident', $type);
        $this->assertSame(10, $id);
    }

    public function testResolveManagerIdentity(): void
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn(20);

        [$type, $id] = $this->service->resolveIdentity($m);

        $this->assertSame('manager', $type);
        $this->assertSame(20, $id);
    }

    public function testResolveUnknownTypeThrows(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->service->resolveIdentity(new \stdClass());
    }
}
