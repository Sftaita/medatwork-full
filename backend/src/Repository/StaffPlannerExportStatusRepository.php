<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffPlannerExportStatus;
use App\Entity\Years;
use App\Entity\YearsResident;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffPlannerExportStatus>
 */
class StaffPlannerExportStatusRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffPlannerExportStatus::class);
    }

    public function findForItem(YearsResident $yr, int $month, int $calendarYear): ?StaffPlannerExportStatus
    {
        return $this->findOneBy([
            'yearsResident' => $yr,
            'month'         => $month,
            'calendarYear'  => $calendarYear,
        ]);
    }

    /**
     * Returns all statuses for all YearsResidents of a given year,
     * indexed by "{yearsResidentId}-{month}-{calendarYear}".
     *
     * @return array<string, StaffPlannerExportStatus>
     */
    public function findAllForYear(Years $year): array
    {
        $results = $this->createQueryBuilder('s')
            ->join('s.yearsResident', 'yr')
            ->where('yr.year = :year')
            ->setParameter('year', $year)
            ->getQuery()
            ->getResult();

        $indexed = [];
        foreach ($results as $s) {
            $key = $s->getYearsResident()->getId() . '-' . $s->getMonth() . '-' . $s->getCalendarYear();
            $indexed[$key] = $s;
        }
        return $indexed;
    }
}
