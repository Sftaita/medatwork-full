<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\StaffPlannerExportStatus;
use PHPUnit\Framework\TestCase;

/**
 * Tests for the Phase 1 V2 dirty-flag and fingerprint methods on StaffPlannerExportStatus.
 *
 * Covers:
 * - markDirty() sets dirtySinceExport=true, dirtyAt, dirtyReason
 * - clearDirty() resets all dirty fields to false/null
 * - updateFingerprint() stores hash + fingerprintComputedAt
 * - recordGeneration() clears dirty as a side effect
 * - hasBeenExported() guards dirty marking (downloadCount OR lastGeneratedAt)
 */
final class StaffPlannerExportStatusDirtyTest extends TestCase
{
    private function makeStatus(): StaffPlannerExportStatus
    {
        return new StaffPlannerExportStatus();
    }

    // ── markDirty ─────────────────────────────────────────────────────────────

    public function testMarkDirtySetsDirtySinceExportTrue(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('timesheet_added');
        $this->assertTrue($s->isDirtySinceExport());
    }

    public function testMarkDirtySetsReason(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('garde_modified');
        $this->assertSame('garde_modified', $s->getDirtyReason());
    }

    public function testMarkDirtySetsDirectAt(): void
    {
        $before = new \DateTime();
        $s      = $this->makeStatus();
        $s->markDirty('absence_deleted');
        $this->assertNotNull($s->getDirtyAt());
        $this->assertGreaterThanOrEqual($before, $s->getDirtyAt());
    }

    public function testMarkDirtyOverwritesPreviousReason(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('timesheet_added');
        $s->markDirty('garde_modified');
        $this->assertSame('garde_modified', $s->getDirtyReason());
        $this->assertTrue($s->isDirtySinceExport());
    }

    // ── clearDirty ────────────────────────────────────────────────────────────

    public function testClearDirtyResetsDirtySinceExportFalse(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('timesheet_added');
        $s->clearDirty();
        $this->assertFalse($s->isDirtySinceExport());
    }

    public function testClearDirtyNullsDirectAt(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('garde_modified');
        $s->clearDirty();
        $this->assertNull($s->getDirtyAt());
    }

    public function testClearDirtyNullsReason(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('absence_deleted');
        $s->clearDirty();
        $this->assertNull($s->getDirtyReason());
    }

    public function testClearDirtyIsIdempotentWhenAlreadyClean(): void
    {
        $s = $this->makeStatus();
        $s->clearDirty(); // no prior markDirty
        $this->assertFalse($s->isDirtySinceExport());
        $this->assertNull($s->getDirtyAt());
        $this->assertNull($s->getDirtyReason());
    }

    // ── updateFingerprint ─────────────────────────────────────────────────────

    public function testUpdateFingerprintStoresHash(): void
    {
        $s = $this->makeStatus();
        $s->updateFingerprint('abc123def456');
        $this->assertSame('abc123def456', $s->getDataFingerprint());
    }

    public function testUpdateFingerprintSetsFingerprintComputedAt(): void
    {
        $before = new \DateTime();
        $s      = $this->makeStatus();
        $s->updateFingerprint('hash');
        $this->assertNotNull($s->getFingerprintComputedAt());
        $this->assertGreaterThanOrEqual($before, $s->getFingerprintComputedAt());
    }

    public function testFingerprintIsNullByDefault(): void
    {
        $s = $this->makeStatus();
        $this->assertNull($s->getDataFingerprint());
        $this->assertNull($s->getFingerprintComputedAt());
    }

    // ── recordGeneration clears dirty ─────────────────────────────────────────

    public function testRecordGenerationClearsDirtyFlag(): void
    {
        $s = $this->makeStatus();
        $s->markDirty('timesheet_added');
        $s->recordGeneration();
        $this->assertFalse($s->isDirtySinceExport());
        $this->assertNull($s->getDirtyAt());
        $this->assertNull($s->getDirtyReason());
    }

    public function testRecordGenerationIncrementsDownloadCount(): void
    {
        $s = $this->makeStatus();
        $s->recordGeneration();
        $this->assertSame(1, $s->getDownloadCount());
    }

    public function testRecordGenerationSetsLastGeneratedAt(): void
    {
        $before = new \DateTime();
        $s      = $this->makeStatus();
        $s->recordGeneration();
        $this->assertGreaterThanOrEqual($before, $s->getLastGeneratedAt());
    }

    // ── hasBeenExported ───────────────────────────────────────────────────────

    public function testHasNotBeenExportedByDefault(): void
    {
        $s = $this->makeStatus();
        $this->assertFalse($s->hasBeenExported());
    }

    public function testHasBeenExportedAfterRecordGeneration(): void
    {
        $s = $this->makeStatus();
        $s->recordGeneration();
        $this->assertTrue($s->hasBeenExported());
    }
}
