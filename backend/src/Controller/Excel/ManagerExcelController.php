<?php

declare(strict_types=1);

namespace App\Controller\Excel;

use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\ExcelGenerator\CallableGardeMapper;
use App\Services\ExcelGenerator\FetchingData;
use App\Services\ExcelGenerator\ResidentInfoAssembler;
use App\Services\ExcelGenerator\SpreadsheetDataWriter;
use App\Services\ExcelGenerator\SpreadsheetMonthBuilder;
use App\Services\Utils\Tools;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ManagerExcelController extends AbstractExcelController
{
    #[Route('/api/managers/ExcelGenerator/{year}/{resident}', name: 'timesheetsExcelRequestManager', methods: ['GET'])]
    public function generateExcel(
        int $year,
        int $resident,
        YearsRepository $yearsRepository,
        ResidentRepository $residentRepository,
        YearsResidentRepository $yearsResidentRepository,
        FetchingData $fetchingData,
        Tools $tools,
        ResidentInfoAssembler $infoAssembler,
        SpreadsheetMonthBuilder $monthBuilder,
        SpreadsheetDataWriter $dataWriter,
        CallableGardeMapper $callableGardeMapper,
    ): Response {
        $yearEntity = $yearsRepository->findOneBy(['id' => $year]);

        if (! $this->isGranted(YearAccessVoter::ADMIN, $yearEntity)
            && ! $this->isGranted(YearAccessVoter::DATA_DOWNLOAD, $yearEntity)
        ) {
            return new JsonResponse(
                ['message' => "Vous n'avez pas les droits nécessaires afin de télécharger ces données."],
                Response::HTTP_UNAUTHORIZED,
            );
        }

        $residentEntity = $residentRepository->findOneBy(['id' => $resident]);
        $yearResident   = $yearsResidentRepository->findOneBy(['resident' => $residentEntity, 'year' => $yearEntity]);

        if ($yearResident === null) {
            return new JsonResponse(['message' => "Ce résident n'est pas inscrit à cette année"], Response::HTTP_BAD_REQUEST);
        }

        $residentInfo = $infoAssembler->build($residentEntity, $yearEntity, $yearResident);
        $data         = $fetchingData->getExcelTransformedData($yearEntity, $residentEntity);

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
