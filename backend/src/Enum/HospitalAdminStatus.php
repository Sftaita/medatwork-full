<?php

declare(strict_types=1);

namespace App\Enum;

enum HospitalAdminStatus: string
{
    case Invited = 'invited'; // account created by super-admin, profile not yet completed
    case Active  = 'active';  // profile completed, fully operational
}
