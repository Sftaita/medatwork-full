<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Resident;
use App\Entity\Timesheet;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Timesheet>
 */
class TimesheetRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Timesheet::class);
    }


    /**
    * Finds all tasks based on a user and within a certain date range.
    *
    * @param Resident $user The user for whom to find tasks
    * @param string $start The start date for the date range
    * @param string $end The end date for the date range
    *
    * @return list<array<string, mixed>>
    */
    public function findByMonth(Resident $user, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.resident = :user')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd >:start) OR (t.dateOfStart < :end AND t.dateOfEnd >=:end) OR (t.dateOfStart >= :start AND t.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('t.dateOfStart', 'ASC')
            ->select('t.id, t.dateOfStart, t.dateOfEnd, t.pause, t.scientific, t.called')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
    * Finds all tasks based on a user and within a certain date range.
    *
    * @param Resident $user The user for whom to find tasks
    * @param Years $year The year for which to find tasks
    * @param string $start The start date for the date range
    * @param string $end The end date for the date range
    *
    * @return list<array<string, mixed>>
    */
    public function findByMonthAndByYear(Resident $user, Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.resident = :user')
            ->andWhere('t.year = :year')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd >:start) OR (t.dateOfStart < :end AND t.dateOfEnd >=:end) OR (t.dateOfStart >= :start AND t.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('t.dateOfStart', 'ASC')
            ->select('t.id, t.dateOfStart, t.dateOfEnd, t.pause, t.scientific, t.called')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Fetch data by year and user.
     *
     * @return array<int,array<string,mixed>>
     */
    public function findByYear(\App\Entity\Resident $user, \App\Entity\Years $year): array
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.year = :year')
            ->andWhere('t.resident = :user')
            ->setParameter('year', $year)
            ->setParameter('user', $user)
            ->orderBy('t.dateOfStart', 'ASC')
            ->select('t.id, t.dateOfStart, t.dateOfEnd, t.pause, t.scientific, t.called')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonth(int $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->leftJoin('t.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd >:start) OR (t.dateOfStart < :end AND t.dateOfEnd >=:end) OR (t.dateOfStart >= :start AND t.dateOfEnd <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->leftJoin('t.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('t.dateOfStart, t.dateOfEnd, t.pause, t.scientific,t.called, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonthAndResident(Years $year, Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->leftJoin('t.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('resident = :resident')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd >:start) OR (t.dateOfStart < :end AND t.dateOfEnd >=:end) OR (t.dateOfStart >= :start AND t.dateOfEnd <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('resident', $resident)
            ->leftJoin('t.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('t.dateOfStart, t.dateOfEnd, t.pause, t.scientific,t.called, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function search(Resident $user): array
    {
        return $this->createQueryBuilder('t')
            ->leftJoin('t.year', 'year')
            ->andWhere('t.resident = :user')
            ->setParameter('user', $user)
            ->orderBy('t.dateOfStart', 'DESC')
            ->select('t.id,t.isEditable, t.dateOfStart, t.dateOfEnd, t.pause, t.called, t.scientific, year.title')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function searchByMonth(Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->leftJoin('t.year', 'year')
            ->leftJoin('t.resident', 'resident')
            ->where('year = :yearId')
            ->andWhere('(t.dateOfStart >= :start AND t.dateOfStart <= :end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('resident.lastname', 'ASC')
            ->addOrderBy('t.dateOfStart', 'DESC')
            ->select('t.id, t.dateOfStart, t.dateOfEnd, t.pause, t.scientific,t.called, t.isEditable, year.title, resident.id as residentId, resident.firstname, resident.lastname, year.speciality')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Check if the registered dates are not in an already registered slot.
     *
     * @return bool True: Slot already registered, False: Free slot
     */
    public function checkIfAlreadyExist(\App\Entity\Resident $user, \App\Entity\Years $year, \DateTime $start, \DateTime $end, ?int $excludeId = null): bool
    {
        $queryBuilder = $this->createQueryBuilder('t')
            ->where('t.resident = :user')
            ->andwhere('t.year = :year')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd > :start) OR (t.dateOfStart < :end AND t.dateOfEnd >= :end) OR (t.dateOfStart >= :start AND t.dateOfEnd <= :end)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end);

        if ($excludeId !== null) {
            $queryBuilder->andWhere('t.id != :excludeId')
                        ->setParameter('excludeId', $excludeId);
        }

        $check = $queryBuilder->getQuery()->getResult();

        return ! empty($check);
    }


    /**
     * Check if the absence slot overlaps with an existing timesheet entry.
     *
     * @return bool True: Absence overlaps with an existing timesheet, False: Absence does not overlap.
     */
    public function doesAbsenceOverlapWithTimesheet(\App\Entity\Resident $user, \App\Entity\Years $year, \DateTime $start, ?\DateTime $end = null): bool
    {
        // Set times for start and end
        $start->setTime(8, 0);

        // If end is null, set it to 17:36 of the same day as start
        if ($end === null) {
            $end = clone $start;
            $end->setTime(17, 36);
        } else {
            $end->setTime(17, 36);
        }

        $overlap = $this->createQueryBuilder('t')
            ->where('t.resident = :user')
            ->andwhere('t.year = :year')
            ->andWhere('(t.dateOfStart <= :start AND t.dateOfEnd >:start) OR (t.dateOfStart < :end AND t.dateOfEnd >=:end) OR (t.dateOfStart >= :start AND t.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();

        return ! empty($overlap);
    }


    public function updateIsEditableForResidentInPeriod(int $residentId, int $yearId, \DateTime $startDate, \DateTime $endDate, bool $validated): void
    {
        $queryBuilder = $this->createQueryBuilder('t');

        $queryBuilder->update()
            ->set('t.isEditable', ':isEditable')
            ->where('t.resident = :residentId')
            ->andWhere(
                '(t.dateOfStart >= :startDate AND t.dateOfStart <= :endDate) OR 
                 (t.dateOfEnd >= :startDate AND t.dateOfEnd <= :endDate) OR 
                 (t.dateOfStart <= :startDate AND t.dateOfEnd >= :endDate)'
            )
            ->andWhere('t.year = :yearId')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('residentId', $residentId)
            ->setParameter('yearId', $yearId)
            ->setParameter('isEditable', ! $validated)  // si validé, mettre à false, sinon mettre à true
            ->getQuery()
            ->execute();
    }

    /**
     * Returns Timesheet entities (not scalars) for a resident within a date range.
     * Used by the compliance system.
     *
     * @return Timesheet[]
     */
    public function findByResidentAndPeriod(Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.resident = :resident')
            ->andWhere('t.dateOfStart >= :start')
            ->andWhere('t.dateOfEnd <= :end')
            ->setParameter('resident', $resident)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('t.dateOfStart', 'ASC')
            ->getQuery()
            ->getResult();
    }

}
