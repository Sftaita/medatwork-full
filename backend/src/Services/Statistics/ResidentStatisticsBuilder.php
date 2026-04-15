<?php

declare(strict_types=1);

namespace App\Services\Statistics;

use App\Entity\YearsResident;
use App\Services\Utils\Tools;

/**
 * Encapsulates the per-resident monthly statistics calculation pipeline,
 * which was duplicated across 4 controller methods.
 *
 * Responsibilities:
 *  - Aggregate scheduled absences (legal leaves, scientific leaves, etc.)
 *  - Run the hours-counting pipeline (separate by day → count hours)
 *  - Assemble the final summary array returned to the frontend
 */
class ResidentStatisticsBuilder
{
    public function __construct(
        private Tools $tools,
        private StatisticTools $statisticTools,
    ) {
    }

    /**
     * Extract scheduled leave counts from a YearsResident entity.
     *
     * @return array{legalLeaves:int, scientificLeaves:int, paternityLeave:int,
     *               maternityLeave:int, unpaidLeave:int, totalScheduledLeaves:int}
     */
    public function buildScheduledAbsences(YearsResident $yearResident): array
    {
        $legalLeaves     = $yearResident->getLegalLeaves()     ?? 0;
        $scientificLeaves = $yearResident->getScientificLeaves() ?? 0;
        $paternityLeave  = $yearResident->getPaternityLeave()  ?? 0;
        $maternityLeave  = $yearResident->getMaternityLeave()  ?? 0;
        $unpaidLeave     = $yearResident->getUnpaidLeave()     ?? 0;

        return [
            'legalLeaves'          => $legalLeaves,
            'scientificLeaves'     => $scientificLeaves,
            'paternityLeave'       => $paternityLeave,
            'maternityLeave'       => $maternityLeave,
            'unpaidLeave'          => $unpaidLeave,
            'totalScheduledLeaves' => $legalLeaves + $scientificLeaves + $paternityLeave + $maternityLeave + $unpaidLeave,
        ];
    }

    /**
     * Run the full monthly statistics pipeline for one resident.
     *
     * @param array $timesheets        Raw timesheet rows for this resident
     * @param array $gardes            Raw garde rows for this resident
     * @param array $absences          Raw absence rows for this resident
     * @param array $scheduledCalendar Raw scheduled-calendar rows for this resident
     * @param array $dates             Date boundaries: start, end, startFromWeek, endOfTheLastWeek
     *
     * @param list<array<string, mixed>> $timesheets
     * @param list<array<string, mixed>> $gardes
     * @param list<array<string, mixed>> $absences
     * @param list<array<string, mixed>> $scheduledCalendar
     * @param array<string, mixed> $dates
     * @return array<string, mixed> Flat stats: totalHours, hardHours, veryHardHours, pause, week,
     *               scheduledWeek, scheduledMonth, callableGardeNb, hospitalGardeNb,
     *               hospitalGardeHoursNb, monthNbOfAbsences
     */
    public function computeMonthStats(
        array $timesheets,
        array $gardes,
        array $absences,
        array $scheduledCalendar,
        array $dates,
    ): array {
        $timesheetPeriods        = $this->tools->separateByDay($timesheets);
        $gardePeriods            = $this->tools->separateGardeByDay($gardes);
        $absencePeriods          = $this->tools->separateAbsenceByDay($absences);
        $scheduledCalendarPeriods = $this->tools->separateScheduledCalendarByDay($scheduledCalendar);

        $counters = $this->statisticTools->hoursCounter(
            $timesheetPeriods,
            $gardePeriods,
            $absencePeriods,
            $dates['start'],
            $dates['end'],
            $dates['startFromWeek'],
            $dates['endOfTheLastWeek'],
        );

        $scheduledCounters = $this->statisticTools->scheduledHoursCounter(
            $scheduledCalendarPeriods,
            $dates['start'],
            $dates['end'],
            $dates['startFromWeek'],
            $dates['endOfTheLastWeek'],
        );

        $callableGardeNb = $this->tools->divideCallableGardeByPeriods($gardePeriods, $dates['start'], $dates['end']);
        $hospitalGardeNb = $this->statisticTools->countNbOfHospitalGarde($gardes, $dates['start'], $dates['end']);

        return [
            'pause'                 => $counters['break'],
            'totalHours'            => $counters['totalHours'],
            'hardHours'             => $counters['hardHours'],
            'veryHardHours'         => $counters['veryHardHours'],
            'week'                  => $counters['weeks'],
            'scheduledWeek'         => $scheduledCounters['weeks'],
            'scheduledMonth'        => $scheduledCounters['totalHours'],
            'callableGardeNb'       => $callableGardeNb,
            'hospitalGardeNb'       => $hospitalGardeNb,
            'hospitalGardeHoursNb'  => $counters['hospitalGardeHoursNb'],
            'monthNbOfAbsences'     => $counters['monthNbOfAbsences'],
        ];
    }

    /**
     * Assemble the final summary array returned in the API response.
     *
     * @param array<string, mixed> $monthStats        Output of computeMonthStats()
     * @param array<string, mixed> $processedAbsence  Output of StatisticTools::yearAbsenceProcessing() + yearScheduledAbsences
     *
     * @return array<string, mixed>
     */
    public function buildSummary(
        string $firstname,
        string $lastname,
        string $yearTitle,
        int $yearId,
        int $residentId,
        array $monthStats,
        array $processedAbsence,
    ): array {
        return array_merge(
            [
                'firstname'  => $firstname,
                'lastname'   => $lastname,
                'yearTitle'  => $yearTitle,
                'yearId'     => $yearId,
                'residentId' => $residentId,
            ],
            $monthStats,
            ['absences' => $processedAbsence],
        );
    }
}
