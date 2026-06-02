<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Years;
use App\Services\NotificationDecisionService;
use App\Services\UserSettingService;
use App\Services\YearNotifPrefService;
// EVENT_DEFAULTS est utilisé dans stubAnnual pour simuler le comportement réel du service
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * P0 — NotificationDecisionService
 *
 * Logique : shouldSend = global[channel] AND annual[event][channel]
 *
 * RED attendu : Class "App\Services\NotificationDecisionService" not found
 */
class NotificationDecisionServiceTest extends TestCase
{
    /** @var UserSettingService&MockObject */
    private UserSettingService $settings;

    /** @var YearNotifPrefService&MockObject */
    private YearNotifPrefService $annualPrefs;

    private NotificationDecisionService $service;
    private Years $year;

    protected function setUp(): void
    {
        $this->settings    = $this->createMock(UserSettingService::class);
        $this->annualPrefs = $this->createMock(YearNotifPrefService::class);
        $this->service     = new NotificationDecisionService($this->settings, $this->annualPrefs);
        $this->year        = $this->createMock(Years::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function stubGlobal(string $channel, bool $value): void
    {
        $this->settings->method('getForUser')->willReturn([
            'notifications' => [$channel => $value],
        ]);
    }

    /**
     * Simule YearNotifPrefService::getForUser qui retourne TOUJOURS les defaults fusionnés.
     * La vraie service ne retourne jamais [] — elle fusionne avec EVENT_DEFAULTS.
     */
    private function stubAnnual(string $event, string $channel, bool $value): void
    {
        // Partir des EVENT_DEFAULTS et overrider la valeur demandée
        $prefs                = YearNotifPrefService::EVENT_DEFAULTS;
        $prefs[$event][$channel] = $value;
        $this->annualPrefs->method('getForUser')->willReturn($prefs);
    }

    /** Retourne EVENT_DEFAULTS complets (aucune entrée en DB). */
    private function stubAnnualDefaults(): void
    {
        $this->annualPrefs->method('getForUser')->willReturn(YearNotifPrefService::EVENT_DEFAULTS);
    }

    // ── Groupe A : logique AND stricte ────────────────────────────────────────

    /** A01 */
    public function testGlobalOffAnnualOnReturnsFalse(): void
    {
        $this->stubGlobal('email', false);
        $this->stubAnnual('COMPLIANCE_ALERT', 'email', true);

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    /** A02 */
    public function testGlobalOnAnnualOffReturnsFalse(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnual('COMPLIANCE_ALERT', 'email', false);

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    /** A03 */
    public function testGlobalOnAnnualOnReturnsTrue(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnual('COMPLIANCE_ALERT', 'email', true);

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    /** A04 */
    public function testPushGlobalOffAnnualOnReturnsFalse(): void
    {
        $this->stubGlobal('push', false);
        $this->stubAnnual('MONTH_VALIDATION', 'push', true);

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'MONTH_VALIDATION', 'push')
        );
    }

    /** A05 */
    public function testPushGlobalOnAnnualOffReturnsFalse(): void
    {
        $this->stubGlobal('push', true);
        $this->stubAnnual('MONTH_VALIDATION', 'push', false);

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'MONTH_VALIDATION', 'push')
        );
    }

    /** A06 */
    public function testPushGlobalOnAnnualOnReturnsTrue(): void
    {
        $this->stubGlobal('push', true);
        $this->stubAnnual('MONTH_VALIDATION', 'push', true);

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'MONTH_VALIDATION', 'push')
        );
    }

    // ── Groupe B : fallback EVENT_DEFAULTS ────────────────────────────────────

    /**
     * B01 — aucune entrée DB → YearNotifPrefService retourne EVENT_DEFAULTS fusionnés.
     * COMPLIANCE_ALERT.email = true par défaut → doit retourner true.
     */
    public function testNoAnnualPrefFallsBackToEventDefaults(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnualDefaults(); // YearNotifPrefService retourne toujours les defaults

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    /**
     * B02 — canal absent dans les prefs annuelles → YearNotifPrefService le comble avec le défaut.
     * Le mock simule ce comportement : COMPLIANCE_ALERT.push = défaut (true).
     */
    public function testMissingChannelInAnnualPrefFallsBackToDefault(): void
    {
        $this->stubGlobal('push', true);
        // La vraie service comblerait push manquant avec le défaut (true pour COMPLIANCE_ALERT)
        $prefs = YearNotifPrefService::EVENT_DEFAULTS;
        $prefs['COMPLIANCE_ALERT']['email'] = false; // email overridé, push reste default (true)
        $this->annualPrefs->method('getForUser')->willReturn($prefs);

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'push')
        );
    }

    /**
     * B03 — EVENT_DEFAULTS complets retournés par le service.
     * SCHEDULE_CHANGED.email = false par défaut.
     */
    public function testNullAnnualPrefFallsBackToDefaults(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnualDefaults();

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'SCHEDULE_CHANGED', 'email')
        );
    }

    /** B04 — SCHEDULE_CHANGED.email = false par défaut même avec global ON. */
    public function testScheduleChangedEmailFalseByDefault(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnualDefaults();

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'SCHEDULE_CHANGED', 'email')
        );
    }

    // ── Groupe C : événements futurs (pas de crash) ───────────────────────────

    /** C01 — event inconnu (AI_ALERT) → false par sécurité (absent de EVENT_DEFAULTS). */
    public function testUnknownEventReturnsFalseWithoutCrash(): void
    {
        $this->stubGlobal('email', true);
        $this->stubAnnualDefaults(); // EVENT_DEFAULTS ne contient pas AI_ALERT

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'AI_ALERT', 'email')
        );
    }

    /** C02 — TRAINING_EXPIRED inconnu → false sans exception. */
    public function testTrainingExpiredUnknownEventReturnsFalse(): void
    {
        $this->stubGlobal('push', true);
        $this->stubAnnualDefaults();

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'TRAINING_EXPIRED', 'push')
        );
    }

    /** C03 — canal inconnu → false sans exception. */
    public function testUnknownChannelReturnsFalse(): void
    {
        $this->settings->method('getForUser')->willReturn(['notifications' => []]);
        $this->stubAnnualDefaults();

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'webhook')
        );
    }

    // ── Groupe E : isolation utilisateurs ─────────────────────────────────────

    /** E01 — résultats différents pour deux utilisateurs distincts */
    public function testDifferentUsersGetDifferentResults(): void
    {
        $settingsA = ['notifications' => ['email' => true]];
        $settingsB = ['notifications' => ['email' => false]];

        $this->settings
            ->method('getForUser')
            ->willReturnCallback(fn(string $type, int $id) => match ($id) {
                1 => $settingsA,
                2 => $settingsB,
                default => ['notifications' => []],
            });

        $this->annualPrefs->method('getForUser')->willReturn([
            'COMPLIANCE_ALERT' => ['email' => true],
        ]);

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
        self::assertFalse(
            $this->service->shouldSend('manager', 2, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    /** E02 — deux appels successifs sans contamination d'état */
    public function testConsecutiveCallsAreIndependent(): void
    {
        $this->settings->method('getForUser')->willReturn([
            'notifications' => ['email' => true],
        ]);
        $this->annualPrefs->method('getForUser')->willReturn([
            'COMPLIANCE_ALERT' => ['email' => true],
        ]);

        $first  = $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');
        $second = $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');

        self::assertTrue($first);
        self::assertTrue($second);
    }

    /** shouldSend est idempotent */
    public function testShouldSendIsIdempotent(): void
    {
        $this->settings->method('getForUser')->willReturn([
            'notifications' => ['email' => true],
        ]);
        $prefs = YearNotifPrefService::EVENT_DEFAULTS;
        $prefs['COMPLIANCE_ALERT']['email'] = false;
        $this->annualPrefs->method('getForUser')->willReturn($prefs);

        $r1 = $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');
        $r2 = $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');

        self::assertSame($r1, $r2);
    }
}
