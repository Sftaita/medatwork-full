<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Services\StaffPlanner\StaffPlannerLineParser;
use PHPUnit\Framework\TestCase;

/**
 * Tests for StaffPlannerLineParser.
 *
 * Covers:
 * - parse() — happy path, empty, malformed, partial
 * - lineKey() — stable key format
 * - indexByKey() — grouping and overwrite
 * - diffIndexes() — added, removed, modified detection
 * - Order independence — no false positives when lines are reordered
 */
final class StaffPlannerLineParserTest extends TestCase
{
    private StaffPlannerLineParser $parser;

    protected function setUp(): void
    {
        $this->parser = new StaffPlannerLineParser();
    }

    // ── parse() ───────────────────────────────────────────────────────────────

    public function testParseValidLine(): void
    {
        $lines = "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n";
        $result = $this->parser->parse($lines);

        $this->assertCount(1, $result);
        $this->assertSame('W001',          $result[0]['workerHRID']);
        $this->assertSame('S001',          $result[0]['sectionHRID']);
        $this->assertSame('2024-11-04',    $result[0]['date']);
        $this->assertSame('activeShifts',  $result[0]['code']);
        $this->assertSame(28800,           $result[0]['start']);
        $this->assertSame(64800,           $result[0]['end']);
        $this->assertSame(36000,           $result[0]['duration']);
        $this->assertSame(0,               $result[0]['lunch']);
    }

    public function testParseMultipleLines(): void
    {
        $lines = implode('', [
            "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
            "AS=|W001|S001|2024-11-05|1|ill|0|86400|86400|0||\n",
            "AS=|W001|S001|2024-11-10|1|activeShifts|72000|108000|36000|1800||\n",
        ]);

        $result = $this->parser->parse($lines);
        $this->assertCount(3, $result);
        $this->assertSame('2024-11-04', $result[0]['date']);
        $this->assertSame('2024-11-05', $result[1]['date']);
        $this->assertSame('ill',        $result[1]['code']);
        $this->assertSame(1800,         $result[2]['lunch']);
    }

    public function testParseEmptyStringReturnsEmpty(): void
    {
        $this->assertSame([], $this->parser->parse(''));
    }

    public function testParseMalformedLineSkipped(): void
    {
        $lines = "SEPARATOR=|\nAS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n";
        $result = $this->parser->parse($lines);
        $this->assertCount(1, $result);
    }

    public function testParseShortLineSkipped(): void
    {
        $lines = "AS=|W001|S001\n";
        $result = $this->parser->parse($lines);
        $this->assertSame([], $result);
    }

    public function testParsePreservesRawLine(): void
    {
        $raw    = 'AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||';
        $result = $this->parser->parse($raw . "\n");
        $this->assertSame($raw, $result[0]['raw']);
    }

    // ── lineKey() ─────────────────────────────────────────────────────────────

    public function testLineKeyFormat(): void
    {
        $line = ['date' => '2024-11-04', 'start' => 28800, 'code' => 'activeShifts'];
        $key  = $this->parser->lineKey($line);
        $this->assertSame('2024-11-04|28800|activeShifts', $key);
    }

    public function testLineKeyDifferentCodesProduceDifferentKeys(): void
    {
        $lineA = ['date' => '2024-11-04', 'start' => 0, 'code' => 'ill'];
        $lineB = ['date' => '2024-11-04', 'start' => 0, 'code' => 'holidays'];
        $this->assertNotSame($this->parser->lineKey($lineA), $this->parser->lineKey($lineB));
    }

    // ── diffIndexes() — order independence (no false positives) ───────────────

    public function testReorderedLinesProduceNoDiff(): void
    {
        $linesA = $this->parser->parse(implode('', [
            "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
            "AS=|W001|S001|2024-11-05|1|ill|0|86400|86400|0||\n",
        ]));
        $linesB = $this->parser->parse(implode('', [
            "AS=|W001|S001|2024-11-05|1|ill|0|86400|86400|0||\n",  // reversed
            "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
        ]));

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertSame([], $diff['added']);
        $this->assertSame([], $diff['removed']);
        $this->assertSame([], $diff['modified']);
    }

    // ── diffIndexes() — added ─────────────────────────────────────────────────

    public function testAddedLineDetected(): void
    {
        $linesA = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");
        $linesB = $this->parser->parse(
            "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n" .
            "AS=|W001|S001|2024-11-05|1|ill|0|86400|86400|0||\n"              // new line
        );

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertCount(1, $diff['added']);
        $this->assertSame('ill', $diff['added'][0]['code']);
        $this->assertSame([], $diff['removed']);
        $this->assertSame([], $diff['modified']);
    }

    // ── diffIndexes() — removed ───────────────────────────────────────────────

    public function testRemovedLineDetected(): void
    {
        $linesA = $this->parser->parse(
            "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n" .
            "AS=|W001|S001|2024-11-05|1|ill|0|86400|86400|0||\n"
        );
        $linesB = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertCount(1, $diff['removed']);
        $this->assertSame('ill', $diff['removed'][0]['code']);
        $this->assertSame([], $diff['added']);
        $this->assertSame([], $diff['modified']);
    }

    // ── diffIndexes() — modified ──────────────────────────────────────────────

    public function testModifiedLineDetectedWhenEndChanges(): void
    {
        $linesA = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");
        $linesB = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|72000|43200|0||\n"); // end changed

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertCount(1, $diff['modified']);
        $this->assertSame(64800, $diff['modified'][0]['from']['end']);
        $this->assertSame(72000, $diff['modified'][0]['to']['end']);
        $this->assertSame([], $diff['added']);
        $this->assertSame([], $diff['removed']);
    }

    public function testModifiedLineDetectedWhenLunchChanges(): void
    {
        $linesA = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");
        $linesB = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|1800||\n"); // lunch added

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertCount(1, $diff['modified']);
    }

    public function testHridChangeAloneDoesNotProduceModified(): void
    {
        // Same date/start/code/end/duration/lunch — only HRID differs
        // Since lineKey does not include HRIDs, and lineValueChanged checks end/duration/lunch,
        // a HRID-only change produces no diff entry.
        $linesA = $this->parser->parse("AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n");
        $linesB = $this->parser->parse("AS=|W999|S999|2024-11-04|1|activeShifts|28800|64800|36000|0||\n"); // HRID only

        $diff = $this->parser->diffIndexes(
            $this->parser->indexByKey($linesA),
            $this->parser->indexByKey($linesB),
        );

        $this->assertSame([], $diff['added']);
        $this->assertSame([], $diff['removed']);
        $this->assertSame([], $diff['modified']);
    }
}
