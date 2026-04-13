<?php

declare(strict_types=1);

namespace App\Enum;

enum HospitalRequestStatus: string
{
    case Pending  = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
