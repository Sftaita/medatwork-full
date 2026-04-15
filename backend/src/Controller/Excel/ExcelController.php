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
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Throwable;

class ExcelController extends AbstractExcelController
{
    public function __construct(private readonly LoggerInterface $logger)
    {
        // AbstractExcelController → AbstractController has no constructor args
    }

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
        $user = $security->getUser();

        $this->logger->info('ExcelGenerator: export requested', [
            'year_id'  => $year,
            'user'     => $user?->getUserIdentifier(),
        ]);

        try {
            $yearEntity = $yearsRepository->findOneBy(['id' => $year]);
            $resident   = $residentRepository->findOneBy(['id' => $user]);

            $yearResident = $yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $yearEntity]);
            if ($yearResident === null) {
                $this->logger->warning('ExcelGenerator: resident not enrolled in year', [
                    'year_id'      => $year,
                    'user'         => $user?->getUserIdentifier(),
                ]);
                return new JsonResponse(['message' => "Vous n'êtes pas inscrit à cette année"], Response::HTTP_BAD_REQUEST);
            }

            $residentInfo = $infoAssembler->build($resident, $yearEntity, $yearResident);
            $data         = $fetchingData->getExcelTransformedData($yearEntity, $resident);

            $this->logger->info('ExcelGenerator: data fetched', [
                'year_id'        => $year,
                'timesheets'     => count($data['timesheets']),
                'gardes'         => count($data['gardes']),
                'absences'       => count($data['absences']),
            ]);

            $spreadsheet    = $this->loadTemplate();
            $monthIntervals = $monthBuilder->buildMonthSheets(
                $spreadsheet,
                $yearEntity->getDateOfStart(),
                $yearEntity->getDateOfEnd(),
                $residentInfo,
            );

            $this->logger->info('ExcelGenerator: month sheets built', [
                'year_id' => $year,
                'months'  => count($monthIntervals),
                'range'   => implode(', ', array_values($monthIntervals)),
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

            $this->logger->info('ExcelGenerator: export completed successfully', [
                'year_id' => $year,
                'user'    => $user?->getUserIdentifier(),
            ]);

            return $this->streamExcel($spreadsheet);

        } catch (Throwable $e) {
            $this->logger->error('ExcelGenerator: export failed', [
                'year_id'   => $year,
                'user'      => $user?->getUserIdentifier(),
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);

            throw $e;
        }
    }
}
