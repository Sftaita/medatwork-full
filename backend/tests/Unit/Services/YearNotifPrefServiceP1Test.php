<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\YearUserNotifPref;
use App\Entity\Years;
use App\Repository\YearUserNotifPrefRepository;
use App\Services\YearNotifPrefService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * P1 — YearNotifPrefService : scénarios avancés (tests unitaires)
 *
 * YNS-P1-01 : event inconnu en DB absent de EVENT_DEFAULTS → retourné tel quel
 * YNS-P1-02 : canal inconnu stocké en DB → retourné tel quel (open structure)
 * YNS-P1-03 : tous events absents en DB → EVENT_DEFAULTS complets retournés
 * YNS-P1-04 : patch partiel complexe (3 events × 2 canaux)
 * YNS-P1-05 : double patch successif sur même event/canal
 * YNS-P1-08 : JSON DB corrompu — valeur canal = string (cast (bool))
 * YNS-P1-09 : JSON DB corrompu — channels = string (non-array → ignoré silencieusement)
 *
 * YNS-P1-06 (updatedAt) et YNS-P1-07 (orphan prefs) sont dans
 * YearNotifPrefServiceIntegrationTest (SQLite requis).
 */
class YearNotifPrefServiceP1Test extends TestCase
{
    /** @var YearUserNotifPrefRepository&MockObject */
    private YearUserNotifPrefRepository $repo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    private YearNotifPrefService $service;
    private Years $year;

    protected function setUp(): void
    {
        $this->repo    = $this->createMock(YearUserNotifPrefRepository::class);
        $this->em      = $this->createMock(EntityManagerInterface::class);
        $this->service = new YearNotifPrefService($this->repo, $this->em);
        $this->year    = $this->createMock(Years::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Crée une entité YearUserNotifPref contenant les prefs données. */
    private function stubEntity(array $storedPrefs): YearUserNotifPref
    {
        $entity = new YearUserNotifPref('manager', 1, $this->year, $storedPrefs);
        $this->repo->method('findByUser')->willReturn($entity);
        $this->repo->method('getOrCreate')->willReturn($entity);
        return $entity;
    }

    /** Aucune entrée en DB → findByUser retourne null. */
    private function stubNoEntity(): void
    {
        $this->repo->method('findByUser')->willReturn(null);
    }

    // ── YNS-P1-01 ─────────────────────────────────────────────────────────────

    /**
     * Un event inconnu (absent de EVENT_DEFAULTS) mais présent en DB est retourné tel quel.
     * Garantie forward-compat : les events futurs (AI_ALERT) ne sont pas perdus à la lecture.
     */
    public function testUnknownEventInDbIsReturnedAsIs(): void
    {
        $storedPrefs = [
            'AI_ALERT' => ['email' => true, 'push' => false], // absent de EVENT_DEFAULTS
        ];
        $this->stubEntity($storedPrefs);

        $prefs = $this->service->getForUser('manager', 1, $this->year);

        // L'event inconnu est présent dans le retour
        self::assertArrayHasKey('AI_ALERT', $prefs,
            'Les events inconnus stockés en DB doivent être retournés (forward-compat)'
        );
        self::assertTrue($prefs['AI_ALERT']['email']);
        self::assertFalse($prefs['AI_ALERT']['push']);

        // Les events connus sont toujours là avec leurs defaults
        self::assertArrayHasKey('COMPLIANCE_ALERT', $prefs);
    }

    // ── YNS-P1-02 ─────────────────────────────────────────────────────────────

    /**
     * Un canal inconnu stocké en DB (ex: 'callCenter') est retourné tel quel.
     * Le service ne filtre pas les canaux à la lecture (open structure pour compatibilité).
     */
    public function testUnknownChannelInDbIsReturnedAsIs(): void
    {
        $storedPrefs = [
            'COMPLIANCE_ALERT' => [
                'email'      => false,
                'callCenter' => true, // canal inconnu, futur
            ],
        ];
        $this->stubEntity($storedPrefs);

        $prefs = $this->service->getForUser('manager', 1, $this->year);

        // canal inconnu retourné
        self::assertArrayHasKey('callCenter', $prefs['COMPLIANCE_ALERT'],
            'Les canaux inconnus stockés en DB doivent être retournés (forward-compat)'
        );
        self::assertTrue($prefs['COMPLIANCE_ALERT']['callCenter']);

        // email overridé normalement
        self::assertFalse($prefs['COMPLIANCE_ALERT']['email']);
    }

    // ── YNS-P1-03 ─────────────────────────────────────────────────────────────

    /**
     * Aucune entrée en DB → tous les events de EVENT_DEFAULTS sont retournés avec leurs valeurs par défaut.
     * Garantit qu'un nouvel utilisateur voit toujours les 7 events.
     */
    public function testNoDbEntryReturnsAllEventDefaults(): void
    {
        $this->stubNoEntity();

        $prefs = $this->service->getForUser('manager', 1, $this->year);

        foreach (array_keys(YearNotifPrefService::EVENT_DEFAULTS) as $event) {
            self::assertArrayHasKey($event, $prefs,
                "Event '{$event}' manquant quand aucune entrée en DB"
            );
            foreach (array_keys(YearNotifPrefService::EVENT_DEFAULTS[$event]) as $channel) {
                self::assertSame(
                    YearNotifPrefService::EVENT_DEFAULTS[$event][$channel],
                    $prefs[$event][$channel],
                    "Valeur par défaut incorrecte pour {$event}.{$channel}"
                );
            }
        }
    }

    // ── YNS-P1-04 ─────────────────────────────────────────────────────────────

    /**
     * Patch partiel complexe : 3 events patchés × 2 canaux chacun.
     * Seuls les champs patchés changent ; les autres restent aux defaults.
     */
    public function testComplexPartialPatchOnlyChangesRequestedFields(): void
    {
        $entity = $this->stubEntity([]);
        $this->em->method('flush');

        $patch = [
            'COMPLIANCE_ALERT'    => ['email' => false, 'push' => false],
            'MONTH_VALIDATION'    => ['email' => false, 'push' => true],
            'VALIDATION_REJECTED' => ['email' => false, 'push' => false],
        ];

        $result = $this->service->patchForUser('manager', 1, $this->year, $patch);

        // Champs patchés
        self::assertFalse($result['COMPLIANCE_ALERT']['email']);
        self::assertFalse($result['COMPLIANCE_ALERT']['push']);
        self::assertFalse($result['MONTH_VALIDATION']['email']);
        self::assertTrue($result['MONTH_VALIDATION']['push']);
        self::assertFalse($result['VALIDATION_REJECTED']['email']);

        // Events non patchés → defaults conservés
        self::assertSame(
            YearNotifPrefService::EVENT_DEFAULTS['YEAR_ENDING']['email'],
            $result['YEAR_ENDING']['email'],
            'Les events non patchés doivent conserver leurs defaults'
        );
        self::assertSame(
            YearNotifPrefService::EVENT_DEFAULTS['RESIDENT_INACTIVE']['push'],
            $result['RESIDENT_INACTIVE']['push'],
            'Les canaux non patchés doivent conserver leurs defaults'
        );

        // Canaux non patchés dans les events patchés → default conservé
        self::assertSame(
            YearNotifPrefService::EVENT_DEFAULTS['COMPLIANCE_ALERT']['sms'],
            $result['COMPLIANCE_ALERT']['sms'],
            'sms non patché doit rester au default'
        );
    }

    // ── YNS-P1-05 ─────────────────────────────────────────────────────────────

    /**
     * Double patch successif sur le même event/canal.
     * Le second patch doit écraser le premier (sémantique merge).
     */
    public function testDoubleSuccessivePatchSecondOverridesFirst(): void
    {
        $entity = $this->stubEntity([]);
        $this->em->method('flush');

        // Premier patch : email=false
        $this->service->patchForUser('manager', 1, $this->year, [
            'COMPLIANCE_ALERT' => ['email' => false],
        ]);

        // Deuxième patch : email=true
        $result = $this->service->patchForUser('manager', 1, $this->year, [
            'COMPLIANCE_ALERT' => ['email' => true],
        ]);

        self::assertTrue($result['COMPLIANCE_ALERT']['email'],
            'Le second patch doit écraser le premier : email=true attendu'
        );
    }

    // ── YNS-P1-08 ─────────────────────────────────────────────────────────────

    /**
     * JSON DB corrompu : valeur canal = string ("yes") au lieu de bool.
     * Attendu : cast silencieux (bool)"yes" = true — pas de crash.
     * Justification : protège contre des données corrompues en prod sans interrompre le service.
     */
    public function testCorruptedDbStringValueIsCastToBool(): void
    {
        $storedPrefs = [
            'COMPLIANCE_ALERT' => [
                'email' => 'yes',  // string au lieu de bool — JSON corrompu
                'push'  => 'no',   // "no" → (bool)"no" = true (string non-vide)
                'sms'   => '',     // '' → (bool)'' = false
            ],
        ];
        $this->stubEntity($storedPrefs);

        $prefs = $this->service->getForUser('manager', 1, $this->year);

        self::assertIsBool($prefs['COMPLIANCE_ALERT']['email'],
            'Le canal email doit être un bool après cast'
        );
        self::assertTrue($prefs['COMPLIANCE_ALERT']['email'],
            '"yes" casté en bool = true'
        );
        self::assertTrue($prefs['COMPLIANCE_ALERT']['push'],
            '"no" casté en bool = true (string non-vide)'
        );
        self::assertFalse($prefs['COMPLIANCE_ALERT']['sms'],
            '"" casté en bool = false'
        );
    }

    // ── YNS-P1-09 ─────────────────────────────────────────────────────────────

    /**
     * JSON DB corrompu : la valeur d'un event est une string (pas un array de canaux).
     * Attendu : ignoré silencieusement → l'event retourne ses valeurs par défaut.
     * Le guard `if (!is_array($channels)) continue` protège le foreach.
     */
    public function testCorruptedDbNonArrayChannelsUsesDefaults(): void
    {
        $storedPrefs = [
            'COMPLIANCE_ALERT' => 'not_an_array',   // event corrompu
            'MONTH_VALIDATION' => ['email' => false], // event sain
        ];
        $this->stubEntity($storedPrefs);

        $prefs = $this->service->getForUser('manager', 1, $this->year);

        // COMPLIANCE_ALERT corrompu → defaults utilisés (guard: !is_array → continue)
        self::assertSame(
            YearNotifPrefService::EVENT_DEFAULTS['COMPLIANCE_ALERT']['email'],
            $prefs['COMPLIANCE_ALERT']['email'],
            'Event corrompu (non-array) doit retourner les defaults sans crash'
        );

        // MONTH_VALIDATION sain → pris en compte normalement
        self::assertFalse($prefs['MONTH_VALIDATION']['email'],
            'Event sain doit être pris en compte normalement'
        );
    }
}
