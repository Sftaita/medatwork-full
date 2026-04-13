<?php

declare(strict_types=1);

namespace App\Controller\Excel;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Shared utilities for Excel export controllers.
 */
abstract class AbstractExcelController extends AbstractController
{
    private const TEMPLATE_PATH  = 'Timesheet.xlsx';
    private const CONTENT_TYPE   = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    private const FILENAME        = 'export.xlsx';

    protected function loadTemplate(): Spreadsheet
    {
        return IOFactory::createReader('Xlsx')->load(self::TEMPLATE_PATH);
    }

    protected function setActiveSheetToCurrentMonth(Spreadsheet $spreadsheet): void
    {
        $currentMonth = date('Y-m');

        if (in_array($currentMonth, $spreadsheet->getSheetNames(), true)) {
            $spreadsheet->setActiveSheetIndexByName($currentMonth);
        }
    }

    protected function streamExcel(Spreadsheet $spreadsheet): StreamedResponse
    {
        $writer   = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $response = new StreamedResponse(static function () use ($writer): void {
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', self::CONTENT_TYPE);
        $response->headers->set('Content-Disposition', 'attachment;filename="' . self::FILENAME . '"');

        return $response;
    }
}
