<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\ResidentValidation;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;

/**
 * Explicit dirty-flag notifier for ResidentValidation changes.
 *
 * Unlike Timesheet/Garde/Absence (handled by the Doctrine subscriber),
 * ResidentValidation is modified through UpdateMonthValidation (a service),
 * so we call this notifier explicitly from that service.
 *
 * Only marks dirty if the MACCS × month has been exported at least once.
 */
class ExportDirtyNotifier
{
    public function __construct(
        private readonly StaffPlannerExportStatusRepository $statusRepo,
        private readonly YearsResidentRepository $yrRepo,
    ) {
    }

    /**
     * Marks the export status dirty after a ResidentValidation change.
     * Does NOT flush — the caller's transaction already handles that.
     */
    public function notifyValidationChanged(ResidentValidation $rv, string $reason): void
    {
        $pv       = $rv->getPeriodValidation();
        $resident = $rv->getResident();

        if ($pv === null || $resident === null) {
            return;
        }

        $year    = $pv->getYear();
        $month   = $pv->getMonth();
        $calYear = $pv->getYearNb();

        if ($year === null || $month === null || $calYear === null) {
            return;
        }

        $yr = $this->yrRepo->findOneBy(['resident' => $resident, 'year' => $year]);
        if ($yr === null) {
            return;
        }

        $status = $this->statusRepo->findForItem($yr, $month, $calYear);

        // Guard: only mark dirty if there has been at least one export.
        if ($status === null || !$status->hasBeenExported()) {
            return;
        }

        $status->markDirty($reason);
        // No flush here — UpdateMonthValidation already flushes.
    }
}
