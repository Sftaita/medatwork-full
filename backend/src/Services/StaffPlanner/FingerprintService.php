<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\YearsResident;

/**
 * Computes a stable SHA-256 fingerprint of a MACCS's monthly data.
 *
 * The fingerprint covers the fields that matter for Staff Planner export:
 *   - timesheets  : start, end, pause, scientific, called
 *   - gardes      : start, end, type  (callable excluded — not exported to SP)
 *   - absences    : start, end, type
 *
 * Non-métier fields (id, createdAt, isEditable, updatedAt) are intentionally
 * excluded so that administrative changes don't change the fingerprint.
 *
 * Rows within each category are sorted by start date before hashing so that
 * insertion order does not affect the result.
 */
class FingerprintService
{
    public function __construct(
        private readonly GetDataByMonth $getDataByMonth,
    ) {
    }

    /**
     * Fetches data from the DB and computes the fingerprint.
     */
    public function compute(YearsResident $yr, int $month, int $calYear): string
    {
        $resident = $yr->getResident();
        $firstDay = sprintf('%04d-%02d-01 00:00:00', $calYear, $month);
        $lastDay  = (new \DateTime(sprintf('%04d-%02d-01', $calYear, $month)))->format('Y-m-t 23:59:59');

        $data = $this->getDataByMonth->fetchData($resident, $firstDay, $lastDay);

        return $this->hashData($data);
    }

    /**
     * Computes the fingerprint from already-fetched data arrays.
     * Exposed separately so unit tests can call it without mocking GetDataByMonth.
     *
     * @param array{
     *   timesheets: list<array<string,mixed>>,
     *   gardes: list<array<string,mixed>>,
     *   absences: list<array<string,mixed>>,
     * } $data
     */
    public function hashData(array $data): string
    {
        $timesheets = array_map(
            static fn(array $t): array => [
                'start'      => (string) ($t['start'] ?? ''),
                'end'        => (string) ($t['end'] ?? ''),
                'pause'      => (int) ($t['pause'] ?? 0),
                'scientific' => (int) ($t['scientific'] ?? 0),
                'called'     => (bool) ($t['called'] ?? false),
            ],
            $data['timesheets'] ?? []
        );

        // Only hospital gardes are written to Staff Planner exports.
        // Callable gardes are excluded (see GenerateStaffPlannerExport::writeEntries).
        $gardes = array_values(array_map(
            static fn(array $g): array => [
                'start' => (string) ($g['start'] ?? ''),
                'end'   => (string) ($g['end'] ?? ''),
                'type'  => (string) ($g['type'] ?? ''),
            ],
            array_filter($data['gardes'] ?? [], static fn(array $g): bool => ($g['type'] ?? '') === 'hospital')
        ));

        $absences = array_map(
            static fn(array $a): array => [
                'start' => (string) ($a['start'] ?? ''),
                'end'   => (string) ($a['end'] ?? ''),
                'type'  => (string) ($a['type'] ?? ''),
            ],
            $data['absences'] ?? []
        );

        // Stable sort by start date — insertion order must not affect the hash.
        usort($timesheets, static fn(array $a, array $b): int => strcmp($a['start'], $b['start']));
        usort($gardes,     static fn(array $a, array $b): int => strcmp($a['start'], $b['start']));
        usort($absences,   static fn(array $a, array $b): int => strcmp($a['start'], $b['start']));

        $canonical = [
            'timesheets' => $timesheets,
            'gardes'     => $gardes,
            'absences'   => $absences,
        ];

        return hash('sha256', json_encode($canonical, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }
}
