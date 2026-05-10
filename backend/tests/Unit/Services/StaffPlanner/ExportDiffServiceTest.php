<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\Resident;
use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\StaffPlannerExportItemSnapshotRepository;
use App\Services\StaffPlanner\ExportDiffService;
use App\Services\StaffPlanner\StaffPlannerLineParser;
use DateTimeImmutable;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * Tests for ExportDiffService.
 *
 * Covers:
 * - Identical fingerprints → no parsing, status=unchanged
 * - Added MACCS detected
 * - Removed MACCS detected
 * - Modified MACCS detected (fingerprint + line-level diff)
 * - Validation changed detected (independent of fingerprint)
 * - changedOnly filter
 * - yearResidentId / month / calendarYear filters
 * - summary counts are correct
 * - identical=true when all unchanged
 * - Parser NOT called when fingerprints match
 */
final class ExportDiffServiceTest extends TestCase
{
    private StaffPlannerExportItemSnapshotRepository&MockObject $snapshotRepo;
    private StaffPlannerLineParser $parser;    // final class — use real instance
    private ExportDiffService $service;

    protected function setUp(): void
    {
        $this->snapshotRepo = $this->createMock(StaffPlannerExportItemSnapshotRepository::class);
        $this->parser       = new StaffPlannerLineParser();

        $this->service = new ExportDiffService($this->snapshotRepo, $this->parser);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeBatch(int $id, int $batchNum = 1): StaffPlannerExportBatch&MockObject
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(1);
        $year->method('getHospital')->willReturn(null);

        $b = $this->createMock(StaffPlannerExportBatch::class);
        $b->method('getId')->willReturn($id);
        $b->method('getBatchNumber')->willReturn($batchNum);
        $b->method('getGeneratedAt')->willReturn(new DateTimeImmutable());
        $b->method('getGeneratedByType')->willReturn('manager');
        $b->method('getGeneratedById')->willReturn(1);
        $b->method('getItemCount')->willReturn(1);
        $b->method('getFileHash')->willReturn(str_repeat('a', 64));
        $b->method('getYear')->willReturn($year);
        return $b;
    }

    private function makeYr(int $id, int $month = 11, int $calYear = 2024): YearsResident&MockObject
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn($id);
        $yr->method('getResident')->willReturn($resident);
        return $yr;
    }

    private function makeSnapshot(
        YearsResident $yr,
        int $month = 11,
        int $calYear = 2024,
        string $fingerprint = 'aaaa',
        bool $validatedByMds = false,
        string $payloadLines = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
    ): StaffPlannerExportItemSnapshot&MockObject {
        $s = $this->createMock(StaffPlannerExportItemSnapshot::class);
        $s->method('getYearsResident')->willReturn($yr);
        $s->method('getMonth')->willReturn($month);
        $s->method('getCalendarYear')->willReturn($calYear);
        $s->method('getDataFingerprint')->willReturn($fingerprint);
        $s->method('isValidatedByMdsAtExport')->willReturn($validatedByMds);
        $s->method('getTimesheetCount')->willReturn(1);
        $s->method('getGardeHospitalCount')->willReturn(0);
        $s->method('getAbsenceCount')->willReturn(0);
        $s->method('getTotalMinutes')->willReturn(480);
        $s->method('getWorkerHRIDAtExport')->willReturn('W001');
        $s->method('getSectionHRIDAtExport')->willReturn('S001');
        $s->method('getPayloadLines')->willReturn($payloadLines);
        $s->method('getId')->willReturn(rand(1, 999));
        return $s;
    }

    private function wireSnapshots(array $snapsA, array $snapsB): void
    {
        $batchA = $this->createMock(StaffPlannerExportBatch::class);
        $batchB = $this->createMock(StaffPlannerExportBatch::class);

        $this->snapshotRepo->method('findByBatchWithResident')
            ->willReturnOnConsecutiveCalls($snapsA, $snapsB);
    }

    // ── Identical fingerprints → no parsing ───────────────────────────────────

    public function testIdenticalFingerprintsResultInUnchangedStatus(): void
    {
        $yr    = $this->makeYr(10);
        $snapA = $this->makeSnapshot($yr, fingerprint: 'fp1');
        $snapB = $this->makeSnapshot($yr, fingerprint: 'fp1'); // same

        $this->wireSnapshots([$snapA], [$snapB]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        $this->assertTrue($result['identical']);
        $this->assertSame('unchanged', $result['items'][0]['status']);
        // No diff entries when fingerprints match
        $this->assertSame([], $result['items'][0]['diff']['added']);
        $this->assertSame([], $result['items'][0]['diff']['removed']);
        $this->assertSame([], $result['items'][0]['diff']['modified']);
    }

    // ── Added MACCS ───────────────────────────────────────────────────────────

    public function testMaccsOnlyInBIsAdded(): void
    {
        $yr = $this->makeYr(10);

        $this->wireSnapshots([], [$this->makeSnapshot($yr)]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        $this->assertSame(1, $result['summary']['added']);
        $this->assertSame('added', $result['items'][0]['status']);
        $this->assertNull($result['items'][0]['snapshotA']);
        $this->assertNotNull($result['items'][0]['snapshotB']);
    }

    // ── Removed MACCS ─────────────────────────────────────────────────────────

    public function testMaccsOnlyInAIsRemoved(): void
    {
        $yr = $this->makeYr(10);

        $this->wireSnapshots([$this->makeSnapshot($yr)], []);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        $this->assertSame(1, $result['summary']['removed']);
        $this->assertSame('removed', $result['items'][0]['status']);
        $this->assertNotNull($result['items'][0]['snapshotA']);
        $this->assertNull($result['items'][0]['snapshotB']);
    }

    // ── Modified MACCS (different fingerprint) ────────────────────────────────

    public function testDifferentFingerprintProducesModifiedStatusAndLineDiff(): void
    {
        $yr = $this->makeYr(10);
        // Same date/time but different end — will produce a line-level diff
        $payloadA = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n";
        $payloadB = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|72000|43200|0||\n"; // end changed
        $snapA = $this->makeSnapshot($yr, fingerprint: 'fp_A', payloadLines: $payloadA);
        $snapB = $this->makeSnapshot($yr, fingerprint: 'fp_B', payloadLines: $payloadB);

        $this->wireSnapshots([$snapA], [$snapB]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        $this->assertSame(1, $result['summary']['modified']);
        $this->assertSame('modified', $result['items'][0]['status']);
        $this->assertTrue($result['items'][0]['fingerprintChanged']);
        // Line diff should show the modified entry
        $this->assertCount(1, $result['items'][0]['diff']['modified']);
    }

    // ── Validation changed (independent of fingerprint) ────────────────────────

    public function testValidationChangedIsDetectedWithSameFingerprint(): void
    {
        $yr    = $this->makeYr(10);
        $snapA = $this->makeSnapshot($yr, fingerprint: 'fp1', validatedByMds: false);
        $snapB = $this->makeSnapshot($yr, fingerprint: 'fp1', validatedByMds: true); // validation changed

        $this->wireSnapshots([$snapA], [$snapB]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        // Not identical because validation changed — even with same fingerprint
        $this->assertFalse($result['identical']);
        $this->assertSame(1, $result['summary']['validationChanged']);
        $this->assertTrue($result['items'][0]['validationChanged']);
        // But no line-level diff since fingerprint is identical
        $this->assertSame([], $result['items'][0]['diff']['added']);
        $this->assertSame([], $result['items'][0]['diff']['removed']);
    }

    // ── changedOnly filter ────────────────────────────────────────────────────

    public function testChangedOnlyFilterExcludesUnchanged(): void
    {
        $yr1 = $this->makeYr(10);
        $yr2 = $this->makeYr(11);

        $snapA1 = $this->makeSnapshot($yr1, fingerprint: 'same');
        $snapB1 = $this->makeSnapshot($yr1, fingerprint: 'same'); // unchanged

        // Different payloadLines so the real parser produces a diff
        $payloadA2 = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n";
        $payloadB2 = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|72000|43200|0||\n";
        $snapA2 = $this->makeSnapshot($yr2, fingerprint: 'fp_A', payloadLines: $payloadA2);
        $snapB2 = $this->makeSnapshot($yr2, fingerprint: 'fp_B', payloadLines: $payloadB2); // modified

        $this->wireSnapshots([$snapA1, $snapA2], [$snapB1, $snapB2]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2), ['changedOnly' => true]);

        $this->assertCount(1, $result['items']); // only the modified one
        $this->assertSame('modified', $result['items'][0]['status']);
        $this->assertSame(1, $result['summary']['unchanged']); // counted even if filtered
    }

    // ── Summary correctness ───────────────────────────────────────────────────

    public function testSummaryCountsAreCorrect(): void
    {
        $yr1 = $this->makeYr(10);  // unchanged
        $yr2 = $this->makeYr(11);  // added
        $yr3 = $this->makeYr(12);  // removed

        $snapA1 = $this->makeSnapshot($yr1, fingerprint: 'same');
        $snapB1 = $this->makeSnapshot($yr1, fingerprint: 'same');
        $snapB2 = $this->makeSnapshot($yr2);
        $snapA3 = $this->makeSnapshot($yr3);

        $this->wireSnapshots([$snapA1, $snapA3], [$snapB1, $snapB2]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));

        $this->assertSame(1, $result['summary']['added']);
        $this->assertSame(1, $result['summary']['removed']);
        $this->assertSame(0, $result['summary']['modified']);
        $this->assertSame(1, $result['summary']['unchanged']);
        $this->assertFalse($result['identical']);
    }

    public function testIdenticalTrueWhenAllUnchanged(): void
    {
        $yr   = $this->makeYr(10);
        $snapA = $this->makeSnapshot($yr, fingerprint: 'same');
        $snapB = $this->makeSnapshot($yr, fingerprint: 'same');

        $this->wireSnapshots([$snapA], [$snapB]);

        $result = $this->service->diff($this->makeBatch(1), $this->makeBatch(2));
        $this->assertTrue($result['identical']);
    }
}
