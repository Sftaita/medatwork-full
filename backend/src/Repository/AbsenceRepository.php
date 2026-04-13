<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Absence;
use App\Entity\Resident;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Absence>
 */
class AbsenceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Absence::class);
    }


    /**
     * Check if the sent data hasn't already been registered.
     */
    public function checkForDuplicate(\App\Entity\Resident $user, \App\Entity\Years $year, \DateTime $start, ?\DateTime $end): bool
    {
        if ($end !== null) {
            $condition = '(a.dateOfStart <= :start AND a.dateOfEnd >=:start) OR (a.dateOfStart <= :end AND a.dateOfEnd >=:end) OR (a.dateOfStart >= :start AND a.dateOfEnd <=:end) OR (a.dateOfStart >= :start AND a.dateOfStart <=:end)';

            $check = $this->createQueryBuilder('a')
            ->andWhere('a.resident = :user')
            ->andwhere('a.year = :year')
            ->andWhere($condition)
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult()
            ;
        } else {
            $condition = '(a.dateOfStart = :start) OR (a.dateOfStart <:start AND a.dateOfEnd >=:start)';

            $check = $this->createQueryBuilder('a')
            ->andWhere('a.resident = :user')
            ->andwhere('a.year = :year')
            ->andWhere($condition)
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->getQuery()
            ->getResult();
        }
        if ($check) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Return the absence list of the user.
     *
     * @return array<int,array<string,mixed>>
     */
    public function search(\App\Entity\Resident $user): array
    {

        return $this->createQueryBuilder('a')
            ->leftJoin('a.year', 'year')
            ->andWhere('a.resident = :user')
            ->setParameter('user', $user)
            ->orderBy('a.dateOfStart', 'DESC')
            ->select('a.id,a.isEditable, a.dateOfStart, a.dateOfEnd, a.type, year.title')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function findByMonth(Resident $user, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.resident = :user')
            ->andWhere('(a.dateOfStart <= :start AND a.dateOfEnd >:start) OR (a.dateOfStart < :end AND a.dateOfEnd >=:end) OR (a.dateOfStart >= :start AND a.dateOfEnd <=:end) OR (a.dateOfStart >= :start AND a.dateOfStart <=:end AND a.dateOfEnd IS NULL)')
            ->setParameter('user', $user)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('a.dateOfStart', 'ASC')
            ->select('a.id, a.dateOfStart, a.dateOfEnd, a.type')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function findByMonthAndByYear(Resident $user, Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.resident = :user')
            ->andWhere('a.year = :year')
            ->andWhere('(a.dateOfStart <= :start AND a.dateOfEnd >:start) OR (a.dateOfStart < :end AND a.dateOfEnd >=:end) OR (a.dateOfStart >= :start AND a.dateOfEnd <=:end) OR (a.dateOfStart >= :start AND a.dateOfStart <=:end AND a.dateOfEnd IS NULL)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('a.dateOfStart', 'ASC')
            ->select('a.id, a.dateOfStart, a.dateOfEnd, a.type')
            ->getQuery()
            ->getResult()
        ;
    }


    // *************  Managers  **************************//

    /** @return list<array<string, mixed>> */
    public function searchByMonth(Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->leftJoin('a.year', 'year')
            ->leftJoin('a.resident', 'resident')
            ->where('year= :yearId')
            ->andWhere('(a.dateOfStart >= :start AND a.dateOfStart <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('resident.lastname', 'ASC')
            ->addOrderBy('a.dateOfStart', 'DESC')
            ->select('a.id, a.dateOfStart, a.dateOfEnd, a.type,a.isEditable, resident.firstname, resident.lastname, year.title, year.speciality')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonth(int $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->leftJoin('a.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('(a.dateOfStart <= :start AND a.dateOfEnd >:start) OR (a.dateOfStart < :end AND a.dateOfEnd >=:end) OR (a.dateOfStart >= :start AND a.dateOfEnd <=:end) OR (a.dateOfStart >= :start AND a.dateOfStart <=:end AND a.dateOfEnd IS NULL)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->leftJoin('a.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('a.dateOfStart, a.dateOfEnd, a.type, resident.id, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonthAndResident(Years $year, Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->leftJoin('a.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('a.resident = :resident')
            ->andWhere(
                '(a.dateOfStart >= :startDate AND a.dateOfStart <= :endDate) OR 
                (a.dateOfEnd >= :startDate AND a.dateOfEnd <= :endDate) OR 
                (a.dateOfEnd IS NULL AND a.dateOfStart >= :startDate AND a.dateOfStart <= :endDate) OR
                (a.dateOfStart <= :startDate AND a.dateOfEnd >= :endDate)'
            )
            ->setParameter('yearId', $year)
            ->setParameter('startDate', $start)
            ->setParameter('endDate', $end)
            ->setParameter('resident', $resident)
            ->leftJoin('a.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('a.dateOfStart, a.dateOfEnd, a.type, resident.id, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    public function updateIsEditableForResidentInPeriod(int $residentId, int $yearId, \DateTime $startDate, \DateTime $endDate, bool $validated): void
    {
        $queryBuilder = $this->createQueryBuilder('a');

        $queryBuilder->update()
            ->set('a.isEditable', ':isEditable')
            ->where('a.resident = :residentId')
            ->andWhere('a.year = :yearId')
            ->andWhere(
                '(a.dateOfStart >= :startDate AND a.dateOfStart <= :endDate) OR 
                (a.dateOfEnd >= :startDate AND a.dateOfEnd <= :endDate) OR 
                (a.dateOfEnd IS NULL AND a.dateOfStart >= :startDate AND a.dateOfStart <= :endDate) OR
                (a.dateOfStart <= :startDate AND a.dateOfEnd >= :endDate)'
            )
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('residentId', $residentId)
            ->setParameter('yearId', $yearId)
            ->setParameter('isEditable', ! $validated)  // si validé, mettre à false, sinon mettre à true
            ->getQuery()
            ->execute();
    }

    /**
     * Load all Absence entities for a year with their Resident eagerly fetched,
     * then group them by resident ID — eliminates the N+1 per-resident findBy
     * in the statistics controllers.
     *
     * @return array<int, list<Absence>> resident ID → Absence[]
     */
    public function findByYearGroupedByResident(int $yearId): array
    {
        /** @var Absence[] $absences */
        $absences = $this->createQueryBuilder('a')
            ->innerJoin('a.resident', 'r')
            ->addSelect('r')
            ->where('a.year = :year')
            ->setParameter('year', $yearId)
            ->getQuery()
            ->getResult();

        $grouped = [];
        foreach ($absences as $absence) {
            $grouped[$absence->getResident()->getId()][] = $absence;
        }

        return $grouped;
    }

    /**
     * Returns Absence entities (not scalars) for a resident within a date range.
     * Used by the compliance system.
     *
     * @return Absence[]
     */
    public function findByResidentAndPeriod(Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.resident = :resident')
            ->andWhere('a.dateOfStart >= :start')
            ->andWhere('a.dateOfStart <= :end')
            ->setParameter('resident', $resident)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('a.dateOfStart', 'ASC')
            ->getQuery()
            ->getResult();
    }

}
