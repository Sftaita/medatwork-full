<?php

declare(strict_types=1);

namespace App\Enum;

enum ManagerStatus: string
{
    case PendingHospital = 'pending_hospital'; // hospital request submitted, waiting for super-admin
    case Active          = 'active';           // fully operational
    case Inactive        = 'inactive';         // manually deactivated by super-admin
}
