<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Statistics;

use App\Entity\YearsResident;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use PHPUnit\Framework\TestCase;

class ResidentStatisticsBuilderTest extends TestCase
{
    private ResidentStatisticsBuilder $builder;

    protected function setUp(): void
    {
        $tools          = $this->createMock(Tools::class);
        $statisticTools = $this->createMock(StatisticTools::class);

        // computeMonthStats delegates all heavy lifting to these services.
        // The tests below focus on the builder's own logic (assembly + structure).
        $tools->method('separateByDay')->willReturn([]);
        $tools->method('separateGardeByDay')->willReturn([]);
        $tools->method('separateAbsenceByDay')->willReturn([]);
        $tools->method('separateScheduledCalendarByDay')->willReturn([]);
        $tools->method('divideCallableGardeByPeriods')->willReturn(2);
        $statisticTools->method('hoursCounter')->willReturn([
            'break'                => 30,
            'totalHours'           => 150,
            'hardHours'            => 40,
            'veryHardHours'        => 10,
            'weeks'                => [1 => 30, 2 => 35, 3 => 40, 4 => 45],
            'hospitalGardeHoursNb' => 24,
            'monthNbOfAbsences'    => 1,
        ]);
        $statisticTools->method('scheduledHoursCounter')->willReturn([
            'weeks'      => [1 => 20, 2 => 20, 3 => 20, 4 => 20],
            'totalHours' => 80,
        ]);
        $statisticTools->method('countNbOfHospitalGarde')->willReturn(3);

        $this->builder = new ResidentStatisticsBuilder($tools, $statisticTools);
    }

    // ─── buildScheduledAbsences ───────────────────────────────────────────────

    public function testBuildScheduledAbsencesReturnsAllKeys(): void
    {
        $yearResident = $this->makeYearResident(5, 2, 1, 0, 0);

        $result = $this->builder->buildScheduledAbsences($yearResident);

        $this->assertArrayHasKey('legalLeaves', $result);
        $this->assertArrayHasKey('scientificLeaves', $result);
        $this->assertArrayHasKey('paternityLeave', $result);
        $this->assertArrayHasKey('maternityLeave', $result);
        $this->assertArrayHasKey('unpaidLeave', $result);
        $this->assertArrayHasKey('totalScheduledLeaves', $result);
    }

    public function testBuildScheduledAbsencesTotalIsSum(): void
    {
        $yearResident = $this->makeYearResident(5, 3, 1, 2, 4);

        $result = $this->builder->buildScheduledAbsences($yearResident);

        $this->assertSame(15, $result['totalScheduledLeaves']);
    }

    public function testBuildScheduledAbsencesNullValuesDefaultToZero(): void
    {
        $yearResident = $this->makeYearResident(null, null, null, null, null);

        $result = $this->builder->buildScheduledAbsences($yearResident);

        $this->assertSame(0, $result['totalScheduledLeaves']);
        $this->assertSame(0, $result['legalLeaves']);
    }

    // ─── computeMonthStats ────────────────────────────────────────────────────

    public function testComputeMonthStatsReturnsAllExpectedKeys(): void
    {
        $dates = [
            'start'            => '2026-03-01',
            'end'              => '2026-03-31',
            'startFromWeek'    => '2026-02-23',
            'endOfTheLastWeek' => '2026-04-05',
        ];

        $result = $this->builder->computeMonthStats([], [], [], [], $dates);

        foreach (['pause', 'totalHours', 'hardHours', 'veryHardHours', 'week',
            'scheduledWeek', 'scheduledMonth', 'callableGardeNb', 'hospitalGardeNb',
            'hospitalGardeHoursNb', 'monthNbOfAbsences'] as $key) {
            $this->assertArrayHasKey($key, $result, "Missing key: $key");
        }
    }

    public function testComputeMonthStatsMapsMockedValues(): void
    {
        $dates = [
            'start'            => '2026-03-01',
            'end'              => '2026-03-31',
            'startFromWeek'    => '2026-02-23',
            'endOfTheLastWeek' => '2026-04-05',
        ];

        $result = $this->builder->computeMonthStats([], [], [], [], $dates);

        $this->assertSame(30, $result['pause']);
        $this->assertSame(150, $result['totalHours']);
        $this->assertSame(2, $result['callableGardeNb']);
        $this->assertSame(3, $result['hospitalGardeNb']);
        $this->assertSame(80, $result['scheduledMonth']);
    }

    // ─── buildSummary ─────────────────────────────────────────────────────────

    public function testBuildSummaryContainsIdentityFields(): void
    {
        $monthStats       = ['totalHours' => 100, 'week' => []];
        $processedAbsence = ['total' => 5];

        $result = $this->builder->buildSummary('Jean', 'Dupont', 'Promo 2026', 42, $monthStats, $processedAbsence);

        $this->assertSame('Jean', $result['firstname']);
        $this->assertSame('Dupont', $result['lastname']);
        $this->assertSame('Promo 2026', $result['yearTitle']);
        $this->assertSame(42, $result['yearId']);
    }

    public function testBuildSummaryMergesMonthStats(): void
    {
        $monthStats       = ['totalHours' => 120, 'hardHours' => 30, 'week' => [1 => 30]];
        $processedAbsence = [];

        $result = $this->builder->buildSummary('A', 'B', 'Y', 1, $monthStats, $processedAbsence);

        $this->assertSame(120, $result['totalHours']);
        $this->assertSame(30, $result['hardHours']);
    }

    public function testBuildSummaryIncludesAbsences(): void
    {
        $processedAbsence = ['annualLeave' => 3, 'yearScheduledAbsences' => ['totalScheduledLeaves' => 10]];

        $result = $this->builder->buildSummary('A', 'B', 'Y', 1, [], $processedAbsence);

        $this->assertSame($processedAbsence, $result['absences']);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private function makeYearResident(?int $legal, ?int $scientific, ?int $paternity, ?int $maternity, ?int $unpaid): YearsResident
    {
        $mock = $this->createMock(YearsResident::class);
        $mock->method('getLegalLeaves')->willReturn($legal);
        $mock->method('getScientificLeaves')->willReturn($scientific);
        $mock->method('getPaternityLeave')->willReturn($paternity);
        $mock->method('getMaternityLeave')->willReturn($maternity);
        $mock->method('getUnpaidLeave')->willReturn($unpaid);
        return $mock;
    }
}
