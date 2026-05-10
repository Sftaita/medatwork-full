<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\Resident;
use App\Entity\Years;
use App\Exception\PeriodLockedException;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;

/**
 * Centralized service that guards against modifications on RH-locked periods.
 *
 * Usage in controllers:
 *   $this->lockGuard->assertNotLocked($resident, $year, $date);   // by date
 *   $this->lockGuard->assertNotLockedPeriod($resident, $year, $month, $calYear); // explicit
 *
 * Throws PeriodLockedException (HTTP 422) if the period is locked.
 * Returns silently if not locked or if no StaffPlannerExportStatus exists.
 *
 * Designed to be injected into controllers via Symfony DI.
 * NOT Doctrine-aware — does not flush, does not modify state.
 */
class LockGuardService
{
    public function __construct(
        private readonly StaffPlannerExportStatusRepository $statusRepo,
        private readonly YearsResidentRepository $yrRepo,
    ) {
    }

    /**
     * Checks if the period containing $date is locked for this (resident, year).
     *
     * @throws PeriodLockedException if the period is locked
     */
    public function assertNotLocked(Resident $resident, Years $year, \DateTimeInterface $date): void
    {
        $this->assertNotLockedPeriod($resident, $year, (int) $date->format('n'), (int) $date->format('Y'));
    }

    /**
     * Checks if the explicit (month, calendarYear) period is locked.
     *
     * @throws PeriodLockedException if the period is locked
     */
    public function assertNotLockedPeriod(Resident $resident, Years $year, int $month, int $calYear): void
    {
        $yr = $this->yrRepo->findOneBy(['resident' => $resident, 'year' => $year]);
        if ($yr === null) {
            return; // no YearsResident → no lock possible
        }

        $status = $this->statusRepo->findForItem($yr, $month, $calYear);
        if ($status === null || !$status->isLocked()) {
            return;
        }

        throw new PeriodLockedException(
            sprintf(
                'La période %02d/%d est officiellement clôturée RH. Toute modification est interdite. Raison : %s',
                $month,
                $calYear,
                $status->getLockReason() ?? 'Clôture RH',
            )
        );
    }
}
