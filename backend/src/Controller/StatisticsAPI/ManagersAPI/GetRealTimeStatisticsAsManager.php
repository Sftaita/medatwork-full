<?php

declare(strict_types=1);

namespace App\Controller\StatisticsAPI\ManagersAPI;

use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ManagerYearsRepository;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\Statistics\ResidentStatisticsBuilder;
use App\Services\Statistics\StatisticTools;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class GetRealTimeStatisticsAsManager extends AbstractController
{
    #[Route('/api/managers/statistics/{month}/{yearId}', name: 'realtimeView', methods: ['GET'])]
    public function realtime(
        int $month,
        int $yearId,
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

        $dates = $statisticTools->boudariesDates($month);
        $year  = $yearsRepository->findOneBy(['id' => $yearId]);

        if ($year === null) {
            return $this->json(['error' => 'Year not found'], Response::HTTP_NOT_FOUND);
        }

        $residents = $yearsResidentRepository->findYearResidents($yearId);

        if ($residents === []) {
            return $this->json([], Response::HTTP_OK);
        }

        // Preload all related data in bulk to avoid N+1 queries
        $yearResidentsById  = $yearsResidentRepository->findByIds(array_column($residents, 'id'));
        $absencesByResident = $absenceRepository->findByYearGroupedByResident($yearId);

        $timesheetRequests         = $timesheetRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $guardSheetRequests        = $gardeRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $absenceRequests           = $absenceRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCalendarRequests = $residentYearCalendarRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

        $response     = [];
        $processedIds = [];

        foreach ($residents as $resident) {
            $residentId = $resident['residentId'];
            if (in_array($residentId, $processedIds, true)) {
                continue;
            }
            $processedIds[] = $residentId;

            $yearResident = $yearResidentsById[$resident['id']] ?? null;
            if ($yearResident === null) {
                continue;
            }

            $yearAbsence      = $absencesByResident[$residentId] ?? [];
            $processedAbsence = $statisticTools->yearAbsenceProcessing($yearAbsence);
            $processedAbsence['yearScheduledAbsences'] = $statsBuilder->buildScheduledAbsences($yearResident);

            $monthStats = $statsBuilder->computeMonthStats(
                array_values(array_filter($timesheetRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($guardSheetRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($absenceRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($scheduledCalendarRequests, fn ($r) => $r['id'] == $residentId)),
                $dates,
            );

            $response[] = $statsBuilder->buildSummary(
                $resident['firstname'],
                $resident['lastname'],
                $year->getTitle(),
                $yearId,
                $residentId,
                $monthStats,
                $processedAbsence,
            );
        }

        return $this->json($response, Response::HTTP_OK);
    }

    #[Route('/api/managers/statisticsFirstload/{month}', name: 'firstload', methods: ['GET'])]
    public function firstload(
        int $month,
        YearsResidentRepository $yearsResidentRepository,
        TimesheetRepository $timesheetRepository,
        AbsenceRepository $absenceRepository,
        ManagerYearsRepository $managerYearsRepository,
        GardeRepository $gardeRepository,
        YearsRepository $yearsRepository,
        ResidentYearCalendarRepository $residentYearCalendarRepository,
        StatisticTools $statisticTools,
        ResidentStatisticsBuilder $statsBuilder,
    ): Response {
        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Invalid month parameter (expected 1–12)'], Response::HTTP_BAD_REQUEST);
        }

        $dates   = $statisticTools->boudariesDates($month);
        $manager = $this->getUser();
        $data    = [];

        $yearsList = $managerYearsRepository->findBy(['manager' => $manager, 'dataAccess' => true], ['years' => 'DESC']);
        $yearList  = [];
        foreach ($yearsList as $my) {
            $year = $yearsRepository->findOneBy(['id' => $my->getYears()]);
            if ($year === null) {
                continue;
            }
            $yearList[] = ['yearId' => $year->getId(), 'title' => $year->getTitle(), 'location' => $year->getLocation()];
        }
        $data['years'] = $yearList;

        if (empty($data['years'])) {
            $data['statistics'] = [];

            return $this->json($data, Response::HTTP_OK);
        }

        $currentYear = $data['years'][0];
        $yearId      = $currentYear['yearId'];
        $residents   = $yearsResidentRepository->findYearAllowedResidents($yearId);

        if (count($residents) === 0) {
            $data['statistics'] = [];

            return $this->json($data, Response::HTTP_OK);
        }

        // Preload all related data in bulk to avoid N+1 queries
        $yearResidentsById  = $yearsResidentRepository->findByIds(array_column($residents, 'id'));
        $absencesByResident = $absenceRepository->findByYearGroupedByResident($yearId);

        $timesheetRequests         = $timesheetRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $gardeRequests             = $gardeRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $absenceRequests           = $absenceRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);
        $scheduledCalendarRequests = $residentYearCalendarRepository->ManagerfindByMonth($yearId, $dates['startFromWeek'], $dates['endOfTheLastWeek']);

        $statistics = [];
        foreach ($residents as $resident) {
            $residentId   = $resident['residentId'];
            $yearResident = $yearResidentsById[$resident['id']] ?? null;
            if ($yearResident === null) {
                continue;
            }

            $yearAbsence      = $absencesByResident[$residentId] ?? [];
            $processedAbsence = $statisticTools->yearAbsenceProcessing($yearAbsence);
            $processedAbsence['yearScheduledAbsences'] = $statsBuilder->buildScheduledAbsences($yearResident);

            $monthStats = $statsBuilder->computeMonthStats(
                array_values(array_filter($timesheetRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($gardeRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($absenceRequests, fn ($r) => $r['id'] == $residentId)),
                array_values(array_filter($scheduledCalendarRequests, fn ($r) => $r['id'] == $residentId)),
                $dates,
            );

            $statistics[] = $statsBuilder->buildSummary(
                $resident['firstname'],
                $resident['lastname'],
                $currentYear['title'],
                $yearId,
                $residentId,
                $monthStats,
                $processedAbsence,
            );
        }

        $data['statistics'] = $statistics;

        return $this->json($data, Response::HTTP_OK);
    }
}
