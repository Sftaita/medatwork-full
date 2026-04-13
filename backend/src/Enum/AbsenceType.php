<?php

declare(strict_types=1);

namespace App\Enum;

enum AbsenceType: string
{
    case AnnualLeave    = 'annualLeave';
    case PaidLeave      = 'paidLeave';
    case SickLeave      = 'sickLeave';
    case PaternityLeave = 'paternityLeave';
    case MaternityLeave = 'maternityLeave';
    case ScientificLeave = 'scientificLeave';
    case CasualLeave              = 'casualLeave';
    case Recovery                 = 'recovery';
    case CompensatoryHolidayLeave = 'compensatoryHolidayLeave';
    case UnpaidLeave              = 'unpaidLeave';
}
