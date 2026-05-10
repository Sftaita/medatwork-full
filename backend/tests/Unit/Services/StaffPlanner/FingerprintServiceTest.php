<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Services\StaffPlanner\FingerprintService;
use App\Services\StaffPlanner\GetDataByMonth;
use PHPUnit\Framework\TestCase;

/**
 * Tests for FingerprintService::hashData().
 *
 * Covers:
 * - Same data in different order → same fingerprint (stable sort)
 * - Timesheet change → different fingerprint
 * - Garde hospital change → different fingerprint
 * - Absence change → different fingerprint
 * - Callable garde excluded → fingerprint unchanged
 * - Non-métier fields (id, createdAt) do not affect fingerprint
 * - Empty data → deterministic hash
 */
final class FingerprintServiceTest extends TestCase
{
    private FingerprintService $service;

    protected function setUp(): void
    {
        // GetDataByMonth is not called in hashData() — mock is unused.
        $this->service = new FingerprintService($this->createMock(GetDataByMonth::class));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private function baseData(): array
    {
        return [
            'timesheets' => [
                ['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 18:00:00', 'pause' => 30, 'scientific' => 0, 'called' => false],
            ],
            'gardes'     => [
                ['start' => '2024-11-10 20:00:00', 'end' => '2024-11-11 08:00:00', 'type' => 'hospital'],
            ],
            'absences'   => [
                ['start' => '2024-11-20 00:00:00', 'end' => '2024-11-20 23:59:59', 'type' => 'annualLeave'],
            ],
        ];
    }

    // ── stable sort (order independence) ─────────────────────────────────────

    public function testSameDataDifferentOrderProducesSameFingerprint(): void
    {
        $data1 = [
            'timesheets' => [
                ['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 18:00:00', 'pause' => 30, 'scientific' => 0, 'called' => false],
                ['start' => '2024-11-05 08:00:00', 'end' => '2024-11-05 17:00:00', 'pause' => 0, 'scientific' => 60, 'called' => false],
            ],
            'gardes'  => [],
            'absences' => [],
        ];

        $data2 = [
            'timesheets' => [
                // Same rows, reversed order
                ['start' => '2024-11-05 08:00:00', 'end' => '2024-11-05 17:00:00', 'pause' => 0, 'scientific' => 60, 'called' => false],
                ['start' => '2024-11-04 08:00:00', 'end' => '2024-11-04 18:00:00', 'pause' => 30, 'scientific' => 0, 'called' => false],
            ],
            'gardes'  => [],
            'absences' => [],
        ];

        $this->assertSame($this->service->hashData($data1), $this->service->hashData($data2));
    }

    // ── timesheet changes ─────────────────────────────────────────────────────

    public function testTimesheetModificationChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['timesheets'][0]['pause'] = 60; // changed from 30 to 60

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    public function testTimesheetAdditionChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['timesheets'][] = ['start' => '2024-11-06 08:00:00', 'end' => '2024-11-06 16:00:00', 'pause' => 0, 'scientific' => 0, 'called' => false];

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    public function testTimesheetDeletionChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['timesheets'] = [];

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    // ── garde hospital changes ────────────────────────────────────────────────

    public function testGardeHospitalModificationChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['gardes'][0]['end'] = '2024-11-11 12:00:00'; // different end time

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    public function testGardeHospitalAdditionChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['gardes'][] = ['start' => '2024-11-15 20:00:00', 'end' => '2024-11-16 08:00:00', 'type' => 'hospital'];

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    // ── callable garde excluded ───────────────────────────────────────────────

    public function testCallableGardeDoesNotAffectFingerprint(): void
    {
        $without = $this->baseData();

        $withCallable           = $this->baseData();
        $withCallable['gardes'][] = ['start' => '2024-11-12 20:00:00', 'end' => '2024-11-13 08:00:00', 'type' => 'callable'];

        // Callable gardes are not written to Staff Planner — fingerprint must be the same.
        $this->assertSame($this->service->hashData($without), $this->service->hashData($withCallable));
    }

    public function testOnlyCallableGardesResultsInEmptyGardeSection(): void
    {
        $onlyCallable = [
            'timesheets' => [],
            'gardes'     => [
                ['start' => '2024-11-12 20:00:00', 'end' => '2024-11-13 08:00:00', 'type' => 'callable'],
                ['start' => '2024-11-14 20:00:00', 'end' => '2024-11-15 08:00:00', 'type' => 'callable'],
            ],
            'absences' => [],
        ];

        $empty = ['timesheets' => [], 'gardes' => [], 'absences' => []];

        $this->assertSame($this->service->hashData($empty), $this->service->hashData($onlyCallable));
    }

    // ── absence changes ───────────────────────────────────────────────────────

    public function testAbsenceModificationChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['absences'][0]['type'] = 'sickLeave'; // changed type

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    public function testAbsenceAdditionChangesFingerprint(): void
    {
        $before = $this->baseData();
        $after  = $this->baseData();
        $after['absences'][] = ['start' => '2024-11-25 00:00:00', 'end' => '2024-11-25 23:59:59', 'type' => 'sickLeave'];

        $this->assertNotSame($this->service->hashData($before), $this->service->hashData($after));
    }

    // ── non-métier fields ignored ─────────────────────────────────────────────

    public function testNonMetierFieldsDoNotAffectFingerprint(): void
    {
        $clean = $this->baseData();

        // Add non-métier fields (id, createdAt, isEditable) — should be ignored.
        $withExtra              = $this->baseData();
        $withExtra['timesheets'][0]['id']         = 9999;
        $withExtra['timesheets'][0]['createdAt']  = '2024-01-01 00:00:00';
        $withExtra['timesheets'][0]['isEditable'] = false;
        $withExtra['gardes'][0]['id']             = 1234;
        $withExtra['absences'][0]['isEditable']   = true;

        $this->assertSame($this->service->hashData($clean), $this->service->hashData($withExtra));
    }

    // ── determinism ───────────────────────────────────────────────────────────

    public function testEmptyDataIsDeterministic(): void
    {
        $empty = ['timesheets' => [], 'gardes' => [], 'absences' => []];
        $this->assertSame($this->service->hashData($empty), $this->service->hashData($empty));
        $this->assertSame(64, strlen($this->service->hashData($empty))); // SHA-256 hex = 64 chars
    }

    public function testHashIsSha256Length(): void
    {
        $hash = $this->service->hashData($this->baseData());
        $this->assertSame(64, strlen($hash));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $hash);
    }
}
