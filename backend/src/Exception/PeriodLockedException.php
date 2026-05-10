<?php

declare(strict_types=1);

namespace App\Exception;

/**
 * Thrown when a modification is attempted on a period that has been
 * officially closed by RH (locked=true on StaffPlannerExportStatus).
 *
 * Callers should catch this and return HTTP 422.
 */
final class PeriodLockedException extends \DomainException
{
}
