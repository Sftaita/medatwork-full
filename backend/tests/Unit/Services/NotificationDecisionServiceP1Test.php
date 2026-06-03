<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Years;
use App\Services\NotificationDecisionService;
use App\Services\UserSettingService;
use App\Services\YearNotifPrefService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * P1 — NotificationDecisionService : scénarios avancés
 *
 * NDS-P1-01 : UserSetting sans bloc 'notifications'
 * NDS-P1-02 : bloc 'notifications' présent mais vide []
 * NDS-P1-03 : canal vide ''
 * NDS-P1-04 : channel = null  → TypeError (strict_types)
 * NDS-P1-05 : eventType = null → TypeError (strict_types)
 * NDS-P1-06 : multi-canal global email=ON push=OFF
 * NDS-P1-07 : multi-canal global email=ON / annual email=OFF push=ON
 * NDS-P1-08 : UserSettingService lève RuntimeException
 * NDS-P1-09 : YearNotifPrefService lève RuntimeException
 * NDS-P1-10 : tous canaux OFF côté annuel
 */
class NotificationDecisionServiceP1Test extends TestCase
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

    // ── NDS-P1-01 ─────────────────────────────────────────────────────────────

    /**
     * UserSetting retourné SANS le bloc 'notifications' (ex : settings partiels ou corrompus).
     * Attendu : false (fail-safe — canal absent = désactivé).
     */
    public function testUserSettingWithoutNotificationsKeyReturnsFalse(): void
    {
        $this->settings->method('getForUser')
            ->willReturn(['theme' => 'light', 'language' => 'fr']); // pas de 'notifications'

        // annualPrefs ne doit jamais être appelé (global=false → return immédiat)
        $this->annualPrefs->expects(self::never())->method('getForUser');

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email')
        );
    }

    // ── NDS-P1-02 ─────────────────────────────────────────────────────────────

    /**
     * Bloc 'notifications' présent mais vide [].
     * Attendu : false pour tout canal (aucune préférence → désactivé par défaut).
     */
    public function testUserSettingWithEmptyNotificationsReturnsFalse(): void
    {
        $this->settings->method('getForUser')
            ->willReturn(['notifications' => []]);

        $this->annualPrefs->expects(self::never())->method('getForUser');

        foreach (['email', 'push', 'sms', 'callRh'] as $channel) {
            self::assertFalse(
                $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', $channel),
                "Canal '{$channel}' devrait retourner false quand notifications=[]"
            );
        }
    }

    // ── NDS-P1-03 ─────────────────────────────────────────────────────────────

    /**
     * Canal vide ''.
     * Attendu : false ('' n'est pas un canal valide → absent du bloc notifications standard).
     */
    public function testEmptyStringChannelReturnsFalse(): void
    {
        $this->settings->method('getForUser')
            ->willReturn(['notifications' => ['email' => true, 'push' => true]]);

        // '' absent de notifications → global=false → annualPrefs jamais appelé
        $this->annualPrefs->expects(self::never())->method('getForUser');

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', '')
        );
    }

    // ── NDS-P1-04 ─────────────────────────────────────────────────────────────

    /**
     * channel = null.
     * Attendu : TypeError — PHP strict_types interdit null sur string.
     * Ce test documente le contrat PHP : l'appelant est responsable du typage.
     */
    public function testNullChannelThrowsTypeError(): void
    {
        $this->expectException(\TypeError::class);

        /** @phpstan-ignore-next-line */
        $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', null);
    }

    // ── NDS-P1-05 ─────────────────────────────────────────────────────────────

    /**
     * eventType = null.
     * Attendu : TypeError.
     */
    public function testNullEventTypeThrowsTypeError(): void
    {
        $this->expectException(\TypeError::class);

        /** @phpstan-ignore-next-line */
        $this->service->shouldSend('manager', 1, $this->year, null, 'email');
    }

    // ── NDS-P1-06 ─────────────────────────────────────────────────────────────

    /**
     * Multi-canal : global email=ON push=OFF, annual COMPLIANCE_ALERT email=ON push=ON.
     * Attendu :
     *   shouldSend(email) → true  (global ON AND annual ON)
     *   shouldSend(push)  → false (global OFF bloque immédiatement)
     */
    public function testMultiChannelGlobalEmailOnPushOff(): void
    {
        $this->settings->method('getForUser')
            ->willReturn(['notifications' => ['email' => true, 'push' => false]]);

        // COMPLIANCE_ALERT defaults: email=true, push=true
        $this->annualPrefs->method('getForUser')
            ->willReturn(YearNotifPrefService::EVENT_DEFAULTS);

        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email'),
            'email : global ON + annual ON → true attendu'
        );
        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'push'),
            'push : global OFF → false attendu (annualPrefs non consulté)'
        );
    }

    // ── NDS-P1-07 ─────────────────────────────────────────────────────────────

    /**
     * Multi-canal : global email=ON push=ON, annual COMPLIANCE_ALERT email=OFF push=ON.
     * Attendu :
     *   shouldSend(email) → false (global ON mais annual OFF)
     *   shouldSend(push)  → true  (global ON et annual ON)
     */
    public function testMultiChannelGlobalAllOnAnnualEmailOff(): void
    {
        $this->settings->method('getForUser')
            ->willReturn(['notifications' => ['email' => true, 'push' => true]]);

        $prefs = YearNotifPrefService::EVENT_DEFAULTS;
        $prefs['COMPLIANCE_ALERT']['email'] = false;
        $prefs['COMPLIANCE_ALERT']['push']  = true;
        $this->annualPrefs->method('getForUser')->willReturn($prefs);

        self::assertFalse(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email'),
            'email : global ON mais annual OFF → false attendu'
        );
        self::assertTrue(
            $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'push'),
            'push : global ON et annual ON → true attendu'
        );
    }

    // ── NDS-P1-08 ─────────────────────────────────────────────────────────────

    /**
     * UserSettingService lève RuntimeException (ex : storage indisponible).
     * Attendu : exception propagée — shouldSend ne silence pas les erreurs d'infrastructure.
     * Justification : la couche supérieure (ValidationController) a son propre try/catch.
     */
    public function testUserSettingServiceExceptionIsPropagated(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('storage unavailable');

        $this->settings->method('getForUser')
            ->willThrowException(new \RuntimeException('storage unavailable'));

        $this->annualPrefs->expects(self::never())->method('getForUser');

        $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');
    }

    // ── NDS-P1-09 ─────────────────────────────────────────────────────────────

    /**
     * YearNotifPrefService lève RuntimeException (global passe, annuel échoue).
     * Attendu : exception propagée.
     */
    public function testYearPrefServiceExceptionIsPropagated(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('pref storage unavailable');

        $this->settings->method('getForUser')
            ->willReturn(['notifications' => ['email' => true]]); // global passe

        $this->annualPrefs->method('getForUser')
            ->willThrowException(new \RuntimeException('pref storage unavailable'));

        $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', 'email');
    }

    // ── NDS-P1-10 ─────────────────────────────────────────────────────────────

    /**
     * Tous canaux OFF côté annuel (global ON pour tous).
     * Attendu : false pour chaque canal — la préférence annuelle prime sur le global.
     */
    public function testAllAnnualChannelsOffReturnsFalseForAllChannels(): void
    {
        $this->settings->method('getForUser')
            ->willReturn([
                'notifications' => ['email' => true, 'push' => true, 'sms' => true, 'callRh' => true],
            ]);

        // Tous les canaux à false pour tous les events
        $prefs = [];
        foreach (YearNotifPrefService::EVENT_DEFAULTS as $event => $channels) {
            $prefs[$event] = array_map(fn() => false, $channels);
        }
        $this->annualPrefs->method('getForUser')->willReturn($prefs);

        foreach (['email', 'push', 'sms', 'callRh'] as $channel) {
            self::assertFalse(
                $this->service->shouldSend('manager', 1, $this->year, 'COMPLIANCE_ALERT', $channel),
                "Canal '{$channel}' : annual OFF doit retourner false même si global=ON"
            );
        }
    }
}
