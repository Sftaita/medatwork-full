<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\UserSettingPatchInputDTO;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Tests for UserSettingPatchInputDTO.
 *
 * Covers:
 * - Valid patches for every known field
 * - Security: body size limit
 * - Rejection of unknown top-level keys
 * - Type validation for all fields
 * - calendar.lastUsedView (null allowed)
 * - ui.sidebarCollapsed
 * - tables.staffPlanner.pageSize (enum 25|50|100|200)
 * - tables.staffPlanner.dense
 * - notifications extended keys
 * - Empty body rejection
 */
final class UserSettingPatchInputDTOTest extends TestCase
{
    private static function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private static function makeLargeRequest(): Request
    {
        return new Request([], [], [], [], [], [], str_repeat('x', 4097));
    }

    // ── Security ──────────────────────────────────────────────────────────────

    public function testRejectsBodyExceedingMaxSize(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/trop volumineux/');
        UserSettingPatchInputDTO::fromRequest(self::makeLargeRequest());
    }

    public function testRejectsEmptyBody(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/invalide ou vide/');
        UserSettingPatchInputDTO::fromRequest(new Request([], [], [], [], [], [], ''));
    }

    public function testRejectsUnknownTopLevelKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Clés inconnues/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['hack' => 'payload']));
    }

    public function testRejectsAllUnknownKeysWhenMixedWithValid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Clés inconnues/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['theme' => 'dark', 'inject' => true]));
    }

    // ── theme ─────────────────────────────────────────────────────────────────

    public function testAcceptsValidTheme(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest(['theme' => 'dark']));
        $this->assertSame('dark', $dto->patch['theme']);
    }

    public function testRejectsInvalidTheme(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/theme doit être/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['theme' => 'blue']));
    }

    // ── language ──────────────────────────────────────────────────────────────

    public function testAcceptsValidLanguage(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest(['language' => 'nl']));
        $this->assertSame('nl', $dto->patch['language']);
    }

    public function testRejectsInvalidLanguage(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['language' => 'de']));
    }

    // ── calendar ──────────────────────────────────────────────────────────────

    public function testAcceptsValidCalendarDefaultView(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['defaultView' => 'week'],
        ]));
        $this->assertSame('week', $dto->patch['calendar']['defaultView']);
    }

    public function testRejectsInvalidCalendarDefaultView(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/calendar.defaultView/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['defaultView' => 'agenda'],
        ]));
    }

    public function testAcceptsCalendarLastUsedViewAsNull(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['lastUsedView' => null],
        ]));
        $this->assertNull($dto->patch['calendar']['lastUsedView']);
    }

    public function testAcceptsCalendarLastUsedViewAsString(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['lastUsedView' => 'list'],
        ]));
        $this->assertSame('list', $dto->patch['calendar']['lastUsedView']);
    }

    public function testRejectsInvalidCalendarLastUsedView(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/calendar.lastUsedView/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['lastUsedView' => 'agenda'],
        ]));
    }

    public function testAcceptsShowWeekendsFalse(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['showWeekends' => false],
        ]));
        $this->assertFalse($dto->patch['calendar']['showWeekends']);
    }

    public function testRejectsNonBoolShowWeekends(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['showWeekends' => 1],
        ]));
    }

    public function testIgnoresUnknownCalendarSubKeys(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['defaultView' => 'day', 'unknown' => 'value'],
        ]));
        $this->assertArrayNotHasKey('unknown', $dto->patch['calendar'] ?? []);
        $this->assertSame('day', $dto->patch['calendar']['defaultView']);
    }

    // ── notifications ─────────────────────────────────────────────────────────

    public function testAcceptsNewNotificationKeys(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'notifications' => [
                'validation'   => false,
                'planning'     => true,
                'staffPlanner' => false,
            ],
        ]));
        $this->assertFalse($dto->patch['notifications']['validation']);
        $this->assertTrue($dto->patch['notifications']['planning']);
        $this->assertFalse($dto->patch['notifications']['staffPlanner']);
    }

    public function testRejectsNonBoolNotificationKey(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/notifications.validation doit être un booléen/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'notifications' => ['validation' => 'yes'],
        ]));
    }

    // ── ui ────────────────────────────────────────────────────────────────────

    public function testAcceptsSidebarCollapsed(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'ui' => ['sidebarCollapsed' => true],
        ]));
        $this->assertTrue($dto->patch['ui']['sidebarCollapsed']);
    }

    public function testRejectsNonBoolSidebarCollapsed(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/ui.sidebarCollapsed doit être un booléen/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'ui' => ['sidebarCollapsed' => 'yes'],
        ]));
    }

    public function testRejectsNonObjectUi(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/ui doit être un objet/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['ui' => 'true']));
    }

    // ── tables ────────────────────────────────────────────────────────────────

    public function testAcceptsValidStaffPlannerPageSize(): void
    {
        foreach ([25, 50, 100, 200] as $size) {
            $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
                'tables' => ['staffPlanner' => ['pageSize' => $size]],
            ]));
            $this->assertSame($size, $dto->patch['tables']['staffPlanner']['pageSize']);
        }
    }

    public function testRejectsInvalidStaffPlannerPageSize(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/pageSize doit être/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'tables' => ['staffPlanner' => ['pageSize' => 30]],
        ]));
    }

    public function testAcceptsStaffPlannerDense(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'tables' => ['staffPlanner' => ['dense' => true]],
        ]));
        $this->assertTrue($dto->patch['tables']['staffPlanner']['dense']);
    }

    public function testRejectsNonBoolStaffPlannerDense(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/dense doit être un booléen/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'tables' => ['staffPlanner' => ['dense' => 1]],
        ]));
    }

    public function testRejectsNonObjectTables(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/tables doit être un objet/');
        UserSettingPatchInputDTO::fromRequest(self::makeRequest(['tables' => 'all']));
    }

    // ── Empty valid patch ─────────────────────────────────────────────────────

    public function testRejectsBodyWithOnlyUnknownSubKeys(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Aucun champ valide/');
        // calendar object with only unknown sub-keys → patch['calendar'] stays empty → global patch empty
        UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'calendar' => ['unknownKey' => 'value'],
        ]));
    }

    // ── Combined patch ────────────────────────────────────────────────────────

    public function testAcceptsCombinedValidPatch(): void
    {
        $dto = UserSettingPatchInputDTO::fromRequest(self::makeRequest([
            'theme'         => 'dark',
            'language'      => 'nl',
            'calendar'      => ['defaultView' => 'week', 'showWeekends' => false],
            'notifications' => ['email' => false, 'validation' => true],
            'ui'            => ['sidebarCollapsed' => true],
            'tables'        => ['staffPlanner' => ['pageSize' => 50]],
        ]));

        $this->assertSame('dark', $dto->patch['theme']);
        $this->assertSame('nl', $dto->patch['language']);
        $this->assertSame('week', $dto->patch['calendar']['defaultView']);
        $this->assertFalse($dto->patch['calendar']['showWeekends']);
        $this->assertFalse($dto->patch['notifications']['email']);
        $this->assertTrue($dto->patch['notifications']['validation']);
        $this->assertTrue($dto->patch['ui']['sidebarCollapsed']);
        $this->assertSame(50, $dto->patch['tables']['staffPlanner']['pageSize']);
    }
}
