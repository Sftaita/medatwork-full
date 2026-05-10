<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\StaffPlannerExportBatch;
use App\Entity\StaffPlannerExportItemSnapshot;
use App\Repository\StaffPlannerExportItemSnapshotRepository;

/**
 * Compares two StaffPlannerExportBatch instances and returns a structured diff.
 *
 * Performance strategy:
 *  1. Load all snapshots for both batches (2 JOIN FETCH queries — zero N+1).
 *  2. For each MACCS pair, compare fingerprints first (O(1) per pair).
 *  3. Parse payloadLines ONLY when fingerprints differ (lazy parsing).
 *
 * If a MACCS exists only in A → "removed".
 * If a MACCS exists only in B → "added".
 * If fingerprints differ → "modified" (with line-level diff).
 * If fingerprints identical → "unchanged".
 */
final class ExportDiffService
{
    public function __construct(
        private readonly StaffPlannerExportItemSnapshotRepository $snapshotRepo,
        private readonly StaffPlannerLineParser $parser,
    ) {
    }

    /**
     * Computes the full diff between batchA and batchB.
     *
     * @param array{
     *   changedOnly?: bool,
     *   yearResidentId?: int|null,
     *   month?: int|null,
     *   calendarYear?: int|null,
     * } $options
     *
     * @return array{
     *   batchA: array<string, mixed>,
     *   batchB: array<string, mixed>,
     *   identical: bool,
     *   summary: array{added: int, removed: int, modified: int, unchanged: int, validationChanged: int},
     *   items: list<array<string, mixed>>,
     * }
     */
    public function diff(
        StaffPlannerExportBatch $batchA,
        StaffPlannerExportBatch $batchB,
        array $options = [],
    ): array {
        // ── 1. Load all snapshots — 2 queries, each with JOIN FETCH on resident ──
        $snapsA = $this->snapshotRepo->findByBatchWithResident($batchA);
        $snapsB = $this->snapshotRepo->findByBatchWithResident($batchB);

        // ── 2. Index by stable MACCS key (yearResidentId-month-calendarYear) ────
        $indexA = $this->indexByMaccs($snapsA);
        $indexB = $this->indexByMaccs($snapsB);

        $allKeys = array_unique(array_merge(array_keys($indexA), array_keys($indexB)));

        // ── 3. Compare each MACCS ─────────────────────────────────────────────
        $items   = [];
        $summary = ['added' => 0, 'removed' => 0, 'modified' => 0, 'unchanged' => 0, 'validationChanged' => 0];

        foreach ($allKeys as $key) {
            $snapA = $indexA[$key] ?? null;
            $snapB = $indexB[$key] ?? null;

            $item = $this->compareSnapshots($snapA, $snapB);

            // Apply optional filters
            if (($options['changedOnly'] ?? false) && $item['status'] === 'unchanged') {
                $summary['unchanged']++;
                continue;
            }
            if (!empty($options['yearResidentId']) && $item['yearResidentId'] !== (int) $options['yearResidentId']) {
                continue;
            }
            if (!empty($options['month']) && $item['month'] !== (int) $options['month']) {
                continue;
            }
            if (!empty($options['calendarYear']) && $item['calendarYear'] !== (int) $options['calendarYear']) {
                continue;
            }

            $summary[$item['status']]++;
            if ($item['validationChanged']) {
                $summary['validationChanged']++;
            }

            $items[] = $item;
        }

        $identical = $summary['added'] === 0
            && $summary['removed'] === 0
            && $summary['modified'] === 0
            && $summary['validationChanged'] === 0;

        return [
            'batchA'    => $this->serializeBatch($batchA),
            'batchB'    => $this->serializeBatch($batchB),
            'identical' => $identical,
            'summary'   => $summary,
            'items'     => $items,
        ];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @return array<string, array<string, mixed>> */
    private function compareSnapshots(?StaffPlannerExportItemSnapshot $snapA, ?StaffPlannerExportItemSnapshot $snapB): array
    {
        // ── MACCS only in B → added ──
        if ($snapA === null && $snapB !== null) {
            return $this->buildItem($snapA, $snapB, 'added', false, null);
        }

        // ── MACCS only in A → removed ──
        if ($snapA !== null && $snapB === null) {
            return $this->buildItem($snapA, $snapB, 'removed', false, null);
        }

        assert($snapA !== null && $snapB !== null);

        $fingerprintChanged = $snapA->getDataFingerprint() !== $snapB->getDataFingerprint();
        $validationChanged  = $snapA->isValidatedByMdsAtExport() !== $snapB->isValidatedByMdsAtExport();

        // ── Fingerprints identical → unchanged (O(1), no parsing) ──
        if (!$fingerprintChanged && !$validationChanged) {
            return $this->buildItem($snapA, $snapB, 'unchanged', false, null);
        }

        // ── Data or validation changed → modified ──
        $lineDiff = null;
        if ($fingerprintChanged) {
            // Lazy: parse payloadLines only when fingerprint actually differs
            $linesA   = $this->parser->parse($snapA->getPayloadLines());
            $linesB   = $this->parser->parse($snapB->getPayloadLines());
            $indexA   = $this->parser->indexByKey($linesA);
            $indexB   = $this->parser->indexByKey($linesB);
            $lineDiff = $this->parser->diffIndexes($indexA, $indexB);
        }

        return $this->buildItem(
            $snapA,
            $snapB,
            'modified',
            $validationChanged,
            $lineDiff,
        );
    }

    /**
     * @param array{added: list<mixed>, removed: list<mixed>, modified: list<mixed>}|null $lineDiff
     * @return array<string, mixed>
     */
    private function buildItem(
        ?StaffPlannerExportItemSnapshot $snapA,
        ?StaffPlannerExportItemSnapshot $snapB,
        string $status,
        bool $validationChanged,
        ?array $lineDiff,
    ): array {
        // Use whichever snapshot exists for resident info
        $ref      = $snapA ?? $snapB;
        $yr       = $ref->getYearsResident();
        $resident = $yr->getResident();

        return [
            'yearResidentId'     => $yr->getId(),
            'residentFirstname'  => $resident?->getFirstname(),
            'residentLastname'   => $resident?->getLastname(),
            'month'              => $ref->getMonth(),
            'calendarYear'       => $ref->getCalendarYear(),
            'status'             => $status,            // added | removed | modified | unchanged
            'fingerprintChanged' => ($snapA !== null && $snapB !== null)
                ? $snapA->getDataFingerprint() !== $snapB->getDataFingerprint()
                : false,
            'validationChanged'  => $validationChanged,
            'hridChanged'        => ($snapA !== null && $snapB !== null) && (
                $snapA->getWorkerHRIDAtExport()  !== $snapB->getWorkerHRIDAtExport() ||
                $snapA->getSectionHRIDAtExport() !== $snapB->getSectionHRIDAtExport()
            ),
            'snapshotA'          => $snapA !== null ? $this->serializeSnapshotSummary($snapA) : null,
            'snapshotB'          => $snapB !== null ? $this->serializeSnapshotSummary($snapB) : null,
            'diff'               => $lineDiff ?? ['added' => [], 'removed' => [], 'modified' => []],
        ];
    }

    /**
     * @param StaffPlannerExportItemSnapshot[] $snapshots
     * @return array<string, StaffPlannerExportItemSnapshot>
     */
    private function indexByMaccs(array $snapshots): array
    {
        $index = [];
        foreach ($snapshots as $s) {
            $key         = $s->getYearsResident()->getId() . '-' . $s->getMonth() . '-' . $s->getCalendarYear();
            $index[$key] = $s;
        }
        return $index;
    }

    private function serializeBatch(StaffPlannerExportBatch $batch): array
    {
        return [
            'id'              => $batch->getId(),
            'batchNumber'     => $batch->getBatchNumber(),
            'generatedAt'     => $batch->getGeneratedAt()->format(\DateTimeInterface::ATOM),
            'generatedByType' => $batch->getGeneratedByType(),
            'generatedById'   => $batch->getGeneratedById(),
            'itemCount'       => $batch->getItemCount(),
            'fileHash'        => $batch->getFileHash(),
        ];
    }

    private function serializeSnapshotSummary(StaffPlannerExportItemSnapshot $s): array
    {
        return [
            'id'                     => $s->getId(),
            'dataFingerprint'        => $s->getDataFingerprint(),
            'validatedByMdsAtExport' => $s->isValidatedByMdsAtExport(),
            'timesheetCount'         => $s->getTimesheetCount(),
            'gardeHospitalCount'     => $s->getGardeHospitalCount(),
            'absenceCount'           => $s->getAbsenceCount(),
            'totalMinutes'           => $s->getTotalMinutes(),
            'workerHRIDAtExport'     => $s->getWorkerHRIDAtExport(),
            'sectionHRIDAtExport'    => $s->getSectionHRIDAtExport(),
        ];
    }
}
