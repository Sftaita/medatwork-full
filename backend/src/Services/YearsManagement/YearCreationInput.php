<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Hospital;
use App\Enum\YearStatus;

/**
 * Value object passed to YearCreationService::create().
 * Decoupled from HTTP — the controller is responsible for building this from the request.
 */
final class YearCreationInput
{
    public function __construct(
        public readonly string     $title,
        public readonly string     $speciality,
        public readonly string     $period,
        public readonly string     $dateOfStart,
        public readonly string     $dateOfEnd,
        public readonly Hospital   $hospital,
        public readonly YearStatus $status   = YearStatus::Active,
        public readonly ?string    $comment  = null,
    ) {
    }
}
