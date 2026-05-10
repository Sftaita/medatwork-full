<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentValidationRepository;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Business logic for Staff Planner month/MACCS export tracking.
 *
 * Source de base : YearsResident (tous les MACCS actifs de l'année).
 * Enrichissement : ResidentValidation si elle existe (validatedByMds).
 * Statut traité  : StaffPlannerExportStatus keyed on (yearsResident, month, calendarYear).
 *
 * Champs exposés dans l'API (par item) :
 *   - hasResidentValidation  : true si une ResidentValidation existe pour ce MACCS × mois
 *   - residentValidationId   : son ID, null si absent
 *   - validatedByMds         : ResidentValidation.validated si RV existe, false sinon
 *   - treated / treatedAt / treatedByType
 *   - downloadCount          : nb de fois inclus dans un export Staff Planner
 *   - lastGeneratedAt        : date du dernier export (null si jamais exporté)
 */
class StaffPlannerMonthsService
{
    private const MONTHS_FR = [
        1  => 'Janvier',  2  => 'Février',  3  => 'Mars',
        4  => 'Avril',    5  => 'Mai',       6  => 'Juin',
        7  => 'Juillet',  8  => 'Août',      9  => 'Septembre',
        10 => 'Octobre',  11 => 'Novembre',  12 => 'Décembre',
    ];

    public function __construct(
        private readonly StaffPlannerExportStatusRepository $exportStatusRepo,
        private readonly ResidentValidationRepository $rvRepo,
        private readonly YearsResidentRepository $yrRepo,
        private readonly EntityManagerInterface $em,
        private readonly FingerprintService $fingerprintService,
        private readonly string $apiUrl = '',
    ) {
    }

    /**
     * Returns all months × all active MACCS for the year.
     *
     * Each item is present regardless of whether a ResidentValidation exists.
     * validatedByMds = ResidentValidation.validated if RV exists, false otherwise.
     *
     * @return list<array{
     *   month: int,
     *   calendarYear: int,
     *   label: string,
     *   items: list<array{
     *     yearResidentId: int,
     *     hasResidentValidation: bool,
     *     residentValidationId: int|null,
     *     residentId: int|null,
     *     residentFirstname: string|null,
     *     residentLastname: string|null,
     *     residentEmail: string|null,
     *     residentAvatarUrl: string|null,
     *     validatedByMds: bool,
     *     treated: bool,
     *     treatedAt: string|null,
     *     treatedByType: string|null,
     *     downloadCount: int,
     *     lastGeneratedAt: string|null
     *   }>
     * }>
     */
    public function listMonthsForYear(Years $year): array
    {
        // ── 1. Collect active MACCS ─────────────────────────────────────────
        $activeYrs = [];
        foreach ($year->getResidents() as $yr) {
            if ($yr->getAllowed() && $yr->getResident() !== null && $yr->getId() !== null) {
                $activeYrs[] = $yr;
            }
        }

        if (empty($activeYrs)) {
            return $this->emptyMonths($year);
        }

        // ── 2. Load PeriodValidations indexed by "calendarYear-month" ───────
        $pvByMonth = [];
        foreach ($year->getPeriodValidations() as $pv) {
            $key             = $pv->getYearNb() . '-' . $pv->getMonth();
            $pvByMonth[$key][] = $pv;
        }

        // ── 3. Load ALL ResidentValidations for this year (1 query) ─────────
        //    indexed by "residentId-pvId"
        $rvIndex = $this->rvRepo->findAllForYearIndexed($year);

        // ── 4. Load ALL export statuses for this year (1 query) ─────────────
        //    indexed by "yrId-month-calendarYear"
        $statusIndex = $this->exportStatusRepo->findAllForYear($year);

        // ── 5. Build month × MACCS grid ──────────────────────────────────────
        $months  = [];
        $current = new \DateTime($year->getDateOfStart()->format('Y-m-01'));
        $end     = new \DateTime($year->getDateOfEnd()->format('Y-m-01'));

        while ($current <= $end) {
            $m   = (int) $current->format('n');
            $y   = (int) $current->format('Y');
            $key = $y . '-' . $m;
            $pvs = $pvByMonth[$key] ?? [];

            $items = [];
            foreach ($activeYrs as $yr) {
                $resident = $yr->getResident();

                // Find ResidentValidation for this resident in this month (any PV of the month)
                $rv = null;
                foreach ($pvs as $pv) {
                    $rvKey = $resident->getId() . '-' . $pv->getId();
                    if (isset($rvIndex[$rvKey])) {
                        $rv = $rvIndex[$rvKey];
                        break;
                    }
                }

                $statusKey = $yr->getId() . '-' . $m . '-' . $y;
                $status    = $statusIndex[$statusKey] ?? null;

                $items[] = [
                    'yearResidentId'        => $yr->getId(),
                    'hasResidentValidation' => $rv !== null,
                    'residentValidationId'  => $rv?->getId(),
                    'residentId'            => $resident->getId(),
                    'residentFirstname'     => $resident->getFirstname(),
                    'residentLastname'      => $resident->getLastname(),
                    'residentEmail'         => $resident->getEmail(),
                    'residentAvatarUrl'     => $this->buildAvatarUrl($resident->getAvatarPath()),
                    'validatedByMds'        => $rv !== null && (bool) $rv->getValidated(),
                    'treated'               => $status?->isTreated() ?? false,
                    'treatedAt'             => $status?->getTreatedAt()?->format(\DateTimeInterface::ATOM),
                    'treatedByType'         => $status?->getTreatedByType(),
                    'downloadCount'         => $status?->getDownloadCount() ?? 0,
                    'lastGeneratedAt'       => $status?->getLastGeneratedAt()?->format(\DateTimeInterface::ATOM),
                    // Phase 1 V2 — dirty flag + fingerprint
                    'dirtySinceExport'      => $status?->isDirtySinceExport() ?? false,
                    'dirtyAt'               => $status?->getDirtyAt()?->format(\DateTimeInterface::ATOM),
                    'dirtyReason'           => $status?->getDirtyReason(),
                    'dataFingerprint'       => $status?->getDataFingerprint(),
                    // Phase 5 — Lock RH
                    'locked'                => $status?->isLocked() ?? false,
                    'lockedAt'              => $status?->getLockedAt()?->format(\DateTimeInterface::ATOM),
                    'lockedByType'          => $status?->getLockedByType(),
                    'lockReason'            => $status?->getLockReason(),
                ];
            }

            $months[] = [
                'month'        => $m,
                'calendarYear' => $y,
                'label'        => (self::MONTHS_FR[$m] ?? '') . ' ' . $y,
                'items'        => $items,
            ];

            $current->modify('+1 month');
        }

        return $months;
    }

    /**
     * Upsert treated status for a (yearsResident, month, calendarYear) triplet.
     * Does NOT increment downloadCount — only generation does.
     */
    public function setItemTreated(
        YearsResident $yr,
        int $month,
        int $calendarYear,
        bool $treated,
        ?UserInterface $by = null,
    ): StaffPlannerExportStatus {
        $status = $this->exportStatusRepo->findForItem($yr, $month, $calendarYear);

        if ($status === null) {
            $status = (new StaffPlannerExportStatus())
                ->setYearsResident($yr)
                ->setMonth($month)
                ->setCalendarYear($calendarYear);
            $this->em->persist($status);
        }

        if ($treated) {
            [$type, $id] = $this->resolveActor($by);
            if ($type !== null && $id !== null) {
                $status->markTreated($type, $id);
            } else {
                $status->setTreated(true)->setTreatedAt(new \DateTime())->touch();
            }
        } else {
            $status->markUntreated();
        }

        $this->em->flush();

        return $status;
    }

    /**
     * Marks all exported items as treated after a successful Staff Planner generation.
     * Also increments downloadCount and records lastGeneratedAt for each item.
     *
     * @param list<array{yearResidentId: int, month: int, calendarYear: int}> $items
     */
    public function markItemsTreatedAfterGeneration(array $items, ?UserInterface $by = null): void
    {
        if (empty($items)) {
            return;
        }

        [$type, $id] = $this->resolveActor($by);
        $now = new \DateTime();

        foreach ($items as $item) {
            $yr = $this->yrRepo->find($item['yearResidentId']);
            if ($yr === null) {
                continue;
            }

            $status = $this->exportStatusRepo->findForItem($yr, $item['month'], $item['calendarYear']);
            if ($status === null) {
                $status = (new StaffPlannerExportStatus())
                    ->setYearsResident($yr)
                    ->setMonth($item['month'])
                    ->setCalendarYear($item['calendarYear']);
                $this->em->persist($status);
            }

            // Mark as treated
            if ($type !== null && $id !== null) {
                $status->markTreated($type, $id);
            } else {
                $status->setTreated(true)->setTreatedAt($now)->touch();
            }

            // Record the generation (increments downloadCount, updates lastGeneratedAt, clears dirty flag).
            $status->recordGeneration();

            // Compute and store the fingerprint immediately after export.
            // This gives us a baseline to detect future modifications.
            $fingerprint = $this->fingerprintService->compute($yr, $item['month'], $item['calendarYear']);
            $status->updateFingerprint($fingerprint);
        }

        $this->em->flush();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** @return array{string|null, int|null} */
    private function resolveActor(?UserInterface $user): array
    {
        return match (true) {
            $user instanceof Manager       => ['manager',        $user->getId()],
            $user instanceof HospitalAdmin => ['hospital_admin', $user->getId()],
            $user instanceof AppAdmin      => ['app_admin',      $user->getId()],
            default                        => [null, null],
        };
    }

    private function buildAvatarUrl(?string $avatarPath): ?string
    {
        if ($avatarPath === null || $avatarPath === '') {
            return null;
        }
        $base = rtrim(preg_replace('#/api/?$#', '', rtrim($this->apiUrl, '/')), '/');
        return $base . '/uploads/avatars/' . $avatarPath;
    }

    /** @return list<array{month: int, calendarYear: int, label: string, items: list<mixed>}> */
    private function emptyMonths(Years $year): array
    {
        $months  = [];
        $current = new \DateTime($year->getDateOfStart()->format('Y-m-01'));
        $end     = new \DateTime($year->getDateOfEnd()->format('Y-m-01'));
        while ($current <= $end) {
            $m        = (int) $current->format('n');
            $y        = (int) $current->format('Y');
            $months[] = ['month' => $m, 'calendarYear' => $y, 'label' => (self::MONTHS_FR[$m] ?? '') . ' ' . $y, 'items' => []];
            $current->modify('+1 month');
        }
        return $months;
    }
}
