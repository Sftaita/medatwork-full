<?php

declare(strict_types=1);

namespace App\Controller\StatisticsAPI\ResidentsAPI;

use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ResidentRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use App\Services\Utils\Tools;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class GetRealTimeStatisticController extends AbstractController
{
    /**
     * @deprecated Since 2.4.1 — use getStatisticsFirstload() and residentRealtime() instead.
     */
    #[Route('/api/residents/timesheets/monthStatistics/{month}', name: 'residentsStats', methods: ['GET'])]
    public function getStatistics(
        int $month,
        ResidentRepository $residentRepository,
        TimesheetRepository $timesheetRepository,
        GardeRepository $gardeRepository,
        AbsenceRepository $absenceRepository,
        ResidentYearCalendarRepository $residentYearCalendarRepository,
        Tools $tools,
        StatisticTools $statisticTools,
    ): Response {
        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Invalid month parameter (expected 1–12)'], Response::HTTP_BAD_REQUEST);
        }

        $dates    = $statisticTools->boudariesDates($month);
        /** @var \App\Entity\Resident $user */
        $user     = $this->getUser();
        $resident = $residentRepository->find($user);

        if ($resident === null) {
            return $this->json(['error' => 'Resident not found'], Response::HTTP_NOT_FOUND);
        }

        $timesheets        = $timesheetRepository->findByMonth($user, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $gardes            = $gardeRepository->findByMonth($user, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $absences          = $absenceRepository->findByMonth($user, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCalendar = $residentYearCalendarRepository->findByMonth($user, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

        $timesheetPeriods         = $tools->separateTimesheetsByDay($timesheets);
        $gardePeriods             = $tools->separateGardeByDay($gardes);
        $absencePeriods           = $tools->separateAbsenceByDay($absences);
        $scheduledCalendarPeriods = $tools->separateScheduledCalendarByDay($scheduledCalendar);

        $counter           = $statisticTools->hoursCounter($timesheetPeriods, $gardePeriods, $absencePeriods, $dates['start'], $dates['end'], $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCounters = $statisticTools->scheduledHoursCounter($scheduledCalendarPeriods, $dates['start'], $dates['end'], $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $callableGardeNb   = $tools->divideCallableGardeByPeriods($gardePeriods, $dates['start'], $dates['end']);
        $hospitalGardeNb   = $statisticTools->countNbOfHospitalGarde($gardes, $dates['start'], $dates['end']);

        $summary = [
            'firstname'            => $resident->getFirstname(),
            'lastname'             => $resident->getLastname(),
            'totalHours'           => $counter['totalHours'],
            'hardHours'            => $counter['hardHours'],
            'veryHardHours'        => $counter['veryHardHours'],
            'week'                 => $counter['weeks'],
            'scheduledWeek'        => $scheduledCounters['weeks'],
            'scheduledMonth'       => $scheduledCounters['totalHours'],
            'callableGardeNb'      => $callableGardeNb,
            'hospitalGardeNb'      => $hospitalGardeNb,
            'hospitalGardeHoursNb' => $counter['hospitalGardeHoursNb'],
        ];

        return $this->json($summary, Response::HTTP_OK);
    }

    #[Route('/api/residents/statisticsFirstload/{month}', name: 'residentsFirstLoadStat', methods: ['GET'])]
    public function getStatisticsFirstload(
        int $month,
        ResidentRepository $residentRepository,
        YearsRepository $yearsRepository,
        YearsResidentRepository $yearsResidentRepository,
        TimesheetRepository $timesheetRepository,
        GardeRepository $gardeRepository,
        AbsenceRepository $absenceRepository,
        ResidentYearCalendarRepository $residentYearCalendarRepository,
        StatisticTools $statisticTools,
        ResidentStatisticsBuilder $statsBuilder,
    ): Response {
        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Invalid month parameter (expected 1–12)'], Response::HTTP_BAD_REQUEST);
        }

        $dates    = $statisticTools->boudariesDates($month);
        /** @var \App\Entity\Resident $user */
        $user     = $this->getUser();
        $resident = $residentRepository->findOneBy(['id' => $user]);
        $data     = [];

        if ($resident === null) {
            return $this->json(['error' => 'Resident not found'], Response::HTTP_NOT_FOUND);
        }

        $yearsList = $yearsResidentRepository->findBy(['resident' => $resident, 'allowed' => true], ['year' => 'DESC']);
        $yearList  = [];
        foreach ($yearsList as $yr) {
            $year = $yearsRepository->findOneBy(['id' => $yr->getYear()]);
            if ($year === null) {
                continue;
            }
            $yearList[] = ['yearId' => $year->getId(), 'title' => $year->getTitle(), 'location' => $year->getLocation()];
        }
        $data['years'] = $yearList;

        $currentYear = $data['years'][0] ?? null;
        if ($currentYear === null) {
            $data['statistics'] = [];

            return $this->json($data, Response::HTTP_OK);
        }

        $yearId       = $currentYear['yearId'];
        $yearResident = $yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $yearId]);

        /** @var \App\Entity\Years $yearEntity */
        $yearEntity        = $yearResident?->getYear();
        /** @var \App\Entity\Resident $resident */
        $timesheets        = $timesheetRepository->findByMonthAndByYear($resident, $yearEntity, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $gardes            = $gardeRepository->findByMonthAndByYear($resident, $yearEntity, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $absences          = $absenceRepository->findByMonthAndByYear($resident, $yearEntity, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCalendar = $residentYearCalendarRepository->findByMonthAndYear($resident, $yearEntity, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

        $yearAbsence      = $absenceRepository->findBy(['resident' => $resident->getId(), 'year' => $yearId]);
        $processedAbsence = $statisticTools->yearAbsenceProcessing($yearAbsence);
        $processedAbsence['yearScheduledAbsences'] = $statsBuilder->buildScheduledAbsences($yearResident);

        $monthStats = $statsBuilder->computeMonthStats($timesheets, $gardes, $absences, $scheduledCalendar, $dates);

        $data['statistics'] = [
            $statsBuilder->buildSummary(
                $resident->getFirstname(),
                $resident->getLastname(),
                $currentYear['title'],
                $yearId,
                $resident->getId(),
                $monthStats,
                $processedAbsence,
            ),
        ];

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('/api/residents/statistics/{month}/{yearId}', name: 'realtimeResidentView', methods: ['GET'])]
    public function residentRealtime(
        int $month,
        int $yearId,
        ResidentRepository $residentRepository,
        YearsRepository $yearsRepository,
        YearsResidentRepository $yearsResidentRepository,
        TimesheetRepository $timesheetRepository,
        AbsenceRepository $absenceRepository,
        GardeRepository $gardeRepository,
        ResidentYearCalendarRepository $residentYearCalendarRepository,
        StatisticTools $statisticTools,
        ResidentStatisticsBuilder $statsBuilder,
    ): Response {
        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Invalid month parameter (expected 1–12)'], Response::HTTP_BAD_REQUEST);
        }

        $dates    = $statisticTools->boudariesDates($month);
        /** @var \App\Entity\Resident $user */
        $user     = $this->getUser();
        $resident = $residentRepository->findOneBy(['id' => $user]);
        $year     = $yearsRepository->findOneBy(['id' => $yearId]);

        if ($resident === null) {
            return $this->json(['error' => 'Resident not found'], Response::HTTP_NOT_FOUND);
        }

        if ($year === null) {
            return $this->json(['error' => 'Year not found'], Response::HTTP_NOT_FOUND);
        }

        $yearResident = $yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $year]);

        $timesheets        = $timesheetRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $gardes            = $gardeRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $absences          = $absenceRepository->findByMonthAndByYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCalendar = $residentYearCalendarRepository->findByMonthAndYear($resident, $year, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

        $yearAbsence      = $absenceRepository->findBy(['resident' => $resident->getId(), 'year' => $yearId]);
        $processedAbsence = $statisticTools->yearAbsenceProcessing($yearAbsence);
        $processedAbsence['yearScheduledAbsences'] = $statsBuilder->buildScheduledAbsences($yearResident);

        $monthStats = $statsBuilder->computeMonthStats($timesheets, $gardes, $absences, $scheduledCalendar, $dates);

        return $this->json(
            $statsBuilder->buildSummary(
                $resident->getFirstname(),
                $resident->getLastname(),
                $year->getTitle(),
                $yearId,
                $resident->getId(),
                $monthStats,
                $processedAbsence,
            ),
            Response::HTTP_OK,
        );
    }
}
