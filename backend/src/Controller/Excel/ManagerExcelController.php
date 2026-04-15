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
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Throwable;

class ManagerExcelController extends AbstractExcelController
{
    public function __construct(private readonly LoggerInterface $logger)
    {
    }

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
        $this->logger->info('ExcelGenerator (manager): export requested', [
            'year_id'     => $year,
            'resident_id' => $resident,
        ]);

        try {
            $yearEntity = $yearsRepository->findOneBy(['id' => $year]);

            if (! $this->isGranted(YearAccessVoter::ADMIN, $yearEntity)
                && ! $this->isGranted(YearAccessVoter::DATA_DOWNLOAD, $yearEntity)
            ) {
                $this->logger->warning('ExcelGenerator (manager): access denied', [
                    'year_id'     => $year,
                    'resident_id' => $resident,
                ]);
                return new JsonResponse(
                    ['message' => "Vous n'avez pas les droits nécessaires afin de télécharger ces données."],
                    Response::HTTP_UNAUTHORIZED,
                );
            }

            $residentEntity = $residentRepository->findOneBy(['id' => $resident]);
            $yearResident   = $yearsResidentRepository->findOneBy(['resident' => $residentEntity, 'year' => $yearEntity]);

            if ($yearResident === null) {
                $this->logger->warning('ExcelGenerator (manager): resident not enrolled in year', [
                    'year_id'     => $year,
                    'resident_id' => $resident,
                ]);
                return new JsonResponse(['message' => "Ce résident n'est pas inscrit à cette année"], Response::HTTP_BAD_REQUEST);
            }

            $residentInfo = $infoAssembler->build($residentEntity, $yearEntity, $yearResident);
            $data         = $fetchingData->getExcelTransformedData($yearEntity, $residentEntity);

            $this->logger->info('ExcelGenerator (manager): data fetched', [
                'year_id'     => $year,
                'resident_id' => $resident,
                'timesheets'  => count($data['timesheets']),
                'gardes'      => count($data['gardes']),
                'absences'    => count($data['absences']),
            ]);

            $spreadsheet    = $this->loadTemplate();
            $monthIntervals = $monthBuilder->buildMonthSheets(
                $spreadsheet,
                $yearEntity->getDateOfStart(),
                $yearEntity->getDateOfEnd(),
                $residentInfo,
            );

            $this->logger->info('ExcelGenerator (manager): month sheets built', [
                'year_id' => $year,
                'months'  => count($monthIntervals),
            ]);

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

            $this->logger->info('ExcelGenerator (manager): export completed successfully', [
                'year_id'     => $year,
                'resident_id' => $resident,
            ]);

            return $this->streamExcel($spreadsheet);

        } catch (Throwable $e) {
            $this->logger->error('ExcelGenerator (manager): export failed', [
                'year_id'     => $year,
                'resident_id' => $resident,
                'exception'   => $e->getMessage(),
                'file'        => $e->getFile(),
                'line'        => $e->getLine(),
            ]);

            throw $e;
        }
    }
}
