<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

/**
 * Parses the payloadLines stored in StaffPlannerExportItemSnapshot into
 * structured arrays comparable across exports.
 *
 * Input format (one line per shift):
 *   AS=|workerHRID|sectionHRID|date|1|code|start|end|duration|lunch||
 *
 * Where:
 *   - code     : 'activeShifts' | 'ill' | 'holidays' | 'abs'
 *   - start    : seconds from midnight (e.g. 28800 = 08:00)
 *   - end      : seconds from midnight (e.g. 64800 = 18:00)
 *   - duration : end - start (seconds)
 *   - lunch    : pause in seconds (timesheets only, 0 for gardes/absences)
 *
 * Comparison key: date|start|code — uniquely identifies a medical event
 * (HRIDs are administrative and excluded from the key to avoid false positives
 * when only HRIDs change between exports while data stays identical).
 */
final class StaffPlannerLineParser
{
    /**
     * Parses a payloadLines string into an array of structured shift maps.
     *
     * @return list<array{
     *   workerHRID: string,
     *   sectionHRID: string,
     *   date: string,
     *   code: string,
     *   start: int,
     *   end: int,
     *   duration: int,
     *   lunch: int,
     *   raw: string,
     * }>
     */
    public function parse(string $payloadLines): array
    {
        $result = [];

        foreach (explode("\n", $payloadLines) as $raw) {
            $line = trim($raw);
            if ($line === '' || !str_starts_with($line, 'AS=|')) {
                continue;
            }

            $parts = explode('|', $line);
            // Minimum: AS= | workerHRID | sectionHRID | date | 1 | code | start | end | duration | lunch = 10 parts (indices 0–9)
            if (count($parts) < 10) {
                continue;
            }

            $result[] = [
                'workerHRID'  => $parts[1],
                'sectionHRID' => $parts[2],
                'date'        => $parts[3],
                'code'        => $parts[5],
                'start'       => (int) $parts[6],
                'end'         => (int) $parts[7],
                'duration'    => (int) $parts[8],
                'lunch'       => (int) $parts[9],
                'raw'         => $line,
            ];
        }

        return $result;
    }

    /**
     * Stable comparison key for a parsed line.
     * Uses (date, start, code) — HRIDs intentionally excluded.
     *
     * @param array{date: string, start: int, code: string, ...} $line
     */
    public function lineKey(array $line): string
    {
        return $line['date'] . '|' . $line['start'] . '|' . $line['code'];
    }

    /**
     * Indexes a list of parsed lines by their comparison key.
     * If two lines share the same key (theoretically impossible given scheduling rules),
     * the last one wins.
     *
     * @param list<array<string, mixed>> $lines
     * @return array<string, array<string, mixed>>
     */
    public function indexByKey(array $lines): array
    {
        $index = [];
        foreach ($lines as $line) {
            $index[$this->lineKey($line)] = $line;
        }
        return $index;
    }

    /**
     * Compares two indexed line sets and returns { added, removed, modified }.
     * Two lines are "modified" if they share the same key but differ in end/duration/lunch.
     *
     * @param array<string, array<string, mixed>> $indexA
     * @param array<string, array<string, mixed>> $indexB
     * @return array{
     *   added: list<array<string, mixed>>,
     *   removed: list<array<string, mixed>>,
     *   modified: list<array{from: array<string, mixed>, to: array<string, mixed>}>,
     * }
     */
    public function diffIndexes(array $indexA, array $indexB): array
    {
        $added    = [];
        $removed  = [];
        $modified = [];

        foreach ($indexB as $key => $lineB) {
            if (!isset($indexA[$key])) {
                $added[] = $lineB;
            } elseif ($this->lineValueChanged($indexA[$key], $lineB)) {
                $modified[] = ['from' => $indexA[$key], 'to' => $lineB];
            }
        }

        foreach ($indexA as $key => $lineA) {
            if (!isset($indexB[$key])) {
                $removed[] = $lineA;
            }
        }

        return compact('added', 'removed', 'modified');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /** Returns true if any time-related field differs between two lines with the same key. */
    private function lineValueChanged(array $lineA, array $lineB): bool
    {
        return $lineA['end']      !== $lineB['end']
            || $lineA['duration'] !== $lineB['duration']
            || $lineA['lunch']    !== $lineB['lunch'];
    }
}
