<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerMonthStatus;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffPlannerMonthStatus>
 */
class StaffPlannerMonthStatusRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffPlannerMonthStatus::class);
    }

    public function findForMonth(Years $year, int $month, int $calendarYear): ?StaffPlannerMonthStatus
    {
        return $this->findOneBy([
            'year'         => $year,
            'month'        => $month,
            'calendarYear' => $calendarYear,
        ]);
    }

    /**
     * Returns all statuses for a given year, indexed by "calendarYear-month".
     *
     * @return array<string, StaffPlannerMonthStatus>
     */
    public function findAllForYear(Years $year): array
    {
        $statuses = $this->findBy(['year' => $year]);
        $indexed  = [];
        foreach ($statuses as $s) {
            $indexed[$s->getCalendarYear() . '-' . $s->getMonth()] = $s;
        }
        return $indexed;
    }
}
