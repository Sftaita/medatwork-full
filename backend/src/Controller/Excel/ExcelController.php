<?php

declare(strict_types=1);

namespace App\Controller\Excel;

use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Services\ExcelGenerator\CallableGardeMapper;
use App\Services\ExcelGenerator\FetchingData;
use App\Services\ExcelGenerator\ResidentInfoAssembler;
use App\Services\ExcelGenerator\SpreadsheetDataWriter;
use App\Services\ExcelGenerator\SpreadsheetMonthBuilder;
use App\Services\Utils\Tools;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ExcelController extends AbstractExcelController
{
    #[Route('/api/timesheets/ExcelGenerator/{year}', name: 'timesheetsRequestrtbh', methods: ['GET'])]
    public function generateExcel(
        int $year,
        Security $security,
        ResidentRepository $residentRepository,
        YearsRepository $yearsRepository,
        YearsResidentRepository $yearsResidentRepository,
        FetchingData $fetchingData,
        Tools $tools,
        ResidentInfoAssembler $infoAssembler,
        SpreadsheetMonthBuilder $monthBuilder,
        SpreadsheetDataWriter $dataWriter,
        CallableGardeMapper $callableGardeMapper,
    ): Response {
        $user     = $security->getUser();
        $yearEntity = $yearsRepository->findOneBy(['id' => $year]);
        $resident   = $residentRepository->findOneBy(['id' => $user]);

        $yearResident = $yearsResidentRepository->findOneBy(['resident' => $user, 'year' => $yearEntity]);
        if ($yearResident === null) {
            return new JsonResponse(['message' => "Vous n'êtes pas inscrit à cette année"], Response::HTTP_BAD_REQUEST);
        }

        $residentInfo = $infoAssembler->build($resident, $yearEntity, $yearResident);
        $data         = $fetchingData->getExcelTransformedData($yearEntity, $resident);

        $spreadsheet    = $this->loadTemplate();
        $monthIntervals = $monthBuilder->buildMonthSheets(
            $spreadsheet,
            $yearEntity->getDateOfStart(),
            $yearEntity->getDateOfEnd(),
            $residentInfo,
        );

        $timesheetPeriods = $tools->separateTimesheetsByDay($data['timesheets']);
        $gardePeriods     = $tools->separateGardeByDay(array_values($data['gardes']));
        $absencePeriods   = $tools->separateAbsenceByDay($data['absences']);
        $monthlyHours     = $tools->groupByMonth(array_values($monthIntervals), $timesheetPeriods, $gardePeriods, $absencePeriods);

        $dataWriter->writeMonthlyTotals($spreadsheet, $monthlyHours);
        $dataWriter->writeOnPlacePeriods(
            $spreadsheet,
            $fetchingData->createStandardizedTable($fetchingData->onPlaceDayPeriod($data['timesheets'], $data['gardes']))
        );
        $dataWriter->writeCallableGardes($spreadsheet, $callableGardeMapper->map($data['gardes']));
        $dataWriter->writeAbsences($spreadsheet, $data['absences']);

        $this->setActiveSheetToCurrentMonth($spreadsheet);

        return $this->streamExcel($spreadsheet);
    }
}
