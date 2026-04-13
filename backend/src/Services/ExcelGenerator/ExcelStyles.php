<?php

declare(strict_types=1);

namespace App\Services\ExcelGenerator;

use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Shared PhpSpreadsheet style arrays used across the Excel export pipeline.
 */
final class ExcelStyles
{
    public const HIGHLIGHT = [
        'fill' => [
            'fillType'   => Fill::FILL_SOLID,
            'startColor' => ['rgb' => '8abaf2'],
        ],
    ];

    public const RESET = [
        'fill' => ['fillType' => Fill::FILL_NONE],
    ];

    /** Absence type → Excel column code mapping. */
    public const LEAVE_CODES = [
        'annualLeave'     => 'B',
        'paidLeave'       => 'A',
        'sickLeave'       => 'K',
        'paternityLeave'  => 'VV',
        'maternityLeave'  => 'C',
        'scientificLeave' => 'CSc',
        'casualLeave'     => 'D',
        'recovery'        => '/',
    ];
}
