<?php

declare(strict_types=1);

namespace App\Services\Realtime;

use App\Entity\Years;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;

/**
 * Builds the realtime MACCS payload for a manager overseeing a year.
 *
 * For each allowed resident, it runs the same statistics pipeline as the
 * resident's own view, then maps the result to the MaccsEntry shape
 * consumed by the frontend RealtimeTab component.
 */
class RealtimeManagerService
{
    public function __construct(
        private readonly YearsResidentRepository        $yearsResidentRepository,
        private readonly TimesheetRepository            $timesheetRepository,
        private readonly GardeRepository                $gardeRepository,
        private readonly AbsenceRepository              $absenceRepository,
        private readonly ResidentYearCalendarRepository $residentYearCalendarRepository,
        private readonly StatisticTools                 $statisticTools,
        private readonly ResidentStatisticsBuilder      $statsBuilder,
        private readonly Tools                          $tools,
        private readonly PeriodValidationRepository     $periodValidationRepository,
        private readonly ResidentValidationRepository   $residentValidationRepository,
    ) {
    }

    /**
     * @return array{weeks: string[], maccs: list<array<string, mixed>>, yearTitle: string}
     */
    public function buildForYear(Years $year, int $month): array
    {
        $dates      = $this->statisticTools->boudariesDates($month);
        $weekKeys   = array_keys($this->tools->getWeeksArray($dates['startFromWeek'], $dates['endOfTheLastWeek']));
        $weekLabels = array_map(static fn(int $k): string => "S{$k}", $weekKeys);

        $yearResidents = $this->yearsResidentRepository->findBy(['year' => $year, 'allowed' => true]);

        // One query to map residentId → validated for this period.
        // If no PeriodValidation exists yet for this month, everyone defaults to "À valider".
        $periodValidation      = $this->periodValidationRepository->findOneBy(['year' => $year, 'month' => $month]);
        $residentValidationMap = $periodValidation !== null
            ? $this->residentValidationRepository->findValidatedMapForPeriod($periodValidation)
            : [];

        $maccs = [];
        foreach ($yearResidents as $yr) {
            $resident = $yr->getResident();
            if ($resident === null) {
                continue;
            }

            $timesheets        = $this->timesheetRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
            $gardes            = $this->gardeRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
            $absences          = $this->absenceRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
            $scheduledCalendar = $this->residentYearCalendarRepository->findByMonthAndYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

            $monthStats        = $this->statsBuilder->computeMonthStats($timesheets, $gardes, $absences, $scheduledCalendar, $dates);
            $scheduledAbsences = $this->statsBuilder->buildScheduledAbsences($yr);

            $residentId = $resident->getId();
            $validated  = ($residentId !== null && isset($residentValidationMap[$residentId]))
                ? $residentValidationMap[$residentId]
                : false;

            $maccs[] = $this->buildEntry(
                (string) $resident->getFirstname(),
                (string) $resident->getLastname(),
                $monthStats,
                $scheduledAbsences,
                $resident->getValidatedAt(),
                $validated,
            );
        }

        return [
            'weeks'     => $weekLabels,
            'maccs'     => $maccs,
            'yearTitle' => (string) $year->getTitle(),
        ];
    }

    /**
     * Map flat statistics arrays to the MaccsEntry shape expected by the frontend.
     *
     * @param array<string, mixed>       $monthStats        Output of ResidentStatisticsBuilder::computeMonthStats()
     * @param array<string, mixed>       $scheduledAbsences Output of ResidentStatisticsBuilder::buildScheduledAbsences()
     * @param \DateTimeInterface|null    $validatedAt       Resident::getValidatedAt() — null if account not yet confirmed
     * @return array<string, mixed>
     */
    private function buildEntry(
        string $firstname,
        string $lastname,
        array $monthStats,
        array $scheduledAbsences,
        ?\DateTimeInterface $validatedAt,
        bool $validated,
    ): array {
        $totalHours     = (float) $monthStats['totalHours'];
        $scheduledMonth = (float) $monthStats['scheduledMonth'];
        $vhH            = (float) $monthStats['veryHardHours'];
        $hH             = (float) $monthStats['hardHours'];

        $prevH = $scheduledMonth > 0 ? (int) round($scheduledMonth) : null;
        $pct   = ($prevH !== null && $prevH > 0)
            ? (int) round(($totalHours / $prevH) * 100)
            : null;

        // Weekly hours: hoursCounter returns an assoc array keyed by ISO week number.
        // array_values() preserves insertion order (same as getWeeksArray).
        $weekPrest = array_map(static fn($v): int => (int) round((float) $v), array_values($monthStats['week']));
        $weekPrev  = $scheduledMonth > 0
            ? array_map(static fn($v): int => (int) round((float) $v), array_values($monthStats['scheduledWeek']))
            : null;

        // ── hasActivity : true si le résident a encodé au moins une donnée ce mois ──
        // Null coalescing : si les clés sont absentes du tableau, retourner 0 sans crash.
        $actTotalHours = (float) ($monthStats['totalHours']           ?? 0);
        $actGardeHours = (float) ($monthStats['hospitalGardeHoursNb'] ?? 0);
        $actCallable   = (int)   ($monthStats['callableGardeNb']      ?? 0);
        $actAbsences   = (int)   ($monthStats['monthNbOfAbsences']    ?? 0);

        return [
            'name'             => trim("{$firstname} {$lastname}"),
            'last'             => $lastname,
            'prevH'            => $prevH,
            'totH'             => $this->hoursStr($totalHours),
            'totVal'           => round($totalHours, 2),
            'pct'              => $pct,
            'inconf'           => $this->hoursStr($vhH),
            'inconfV'          => round($vhH, 2),
            'tres'             => $this->hoursStr($hH),
            'tresV'            => round($hH, 2),
            'app'              => (int) $monthStats['callableGardeNb'],
            'place'            => $this->hoursStr((float) $monthStats['hospitalGardeHoursNb']),
            'hasActivity'      => $actTotalHours > 0 || $actGardeHours > 0 || $actCallable > 0 || $actAbsences > 0,
            'accountActivated' => $validatedAt !== null,
            'validated'        => $validated,
            'conge'            => [
                'used'  => (int) $monthStats['monthNbOfAbsences'],
                'total' => (int) $scheduledAbsences['totalScheduledLeaves'],
                'items' => [
                    ['nm' => 'Congé annuel',  'a' => 0, 'b' => (int) $scheduledAbsences['legalLeaves']],
                    ['nm' => 'Scientifique',  'a' => 0, 'b' => (int) $scheduledAbsences['scientificLeaves']],
                    ['nm' => 'Paternité',     'a' => 0, 'b' => (int) $scheduledAbsences['paternityLeave']],
                    ['nm' => 'Maternité',     'a' => 0, 'b' => (int) $scheduledAbsences['maternityLeave']],
                    ['nm' => 'Non rémunéré',  'a' => 0, 'b' => (int) $scheduledAbsences['unpaidLeave']],
                ],
            ],
            'week'             => [
                'prest' => $weekPrest,
                'prev'  => $weekPrev,
            ],
        ];
    }

    private function hoursStr(float $h): string
    {
        $hours   = (int) floor($h);
        $minutes = (int) round(($h - $hours) * 60);
        return $minutes > 0 ? "{$hours}h{$minutes}" : "{$hours}h";
    }
}
