<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Garde;
use App\Entity\Resident;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Garde>
 */
class GardeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Garde::class);
    }

    /**
     * Check if the registered dates are not in an already registered slot
     *
     * @return bool True: Slot already registered False: Free slot
     */
    public function checkIfAlreadyExist(Resident $user, \App\Entity\Years $year, \DateTime $start, \DateTime $end): bool
    {
        $check = $this->createQueryBuilder('g')
            ->where('g.resident = :user')
            ->andwhere('g.year = :year')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult()
        ;

        if ($check) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Check if the registered dates overlap with an already scheduled hospital shift.
     *
     * @return bool True if there's an overlap, False otherwise.
     */
    public function checkIfGardeOnHospitalAlreadyExist(Resident $user, \App\Entity\Years $year, \DateTime $start, \DateTime $end): bool
    {
        $count = $this->createQueryBuilder('g')
            ->select('COUNT(g)')
            ->where('g.resident = :user')
            ->andWhere('g.type = :type')
            ->andwhere('g.year = :year')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd > :start) OR (g.dateOfStart < :end AND g.dateOfEnd >= :end) OR (g.dateOfStart >= :start AND g.dateOfEnd <= :end)')
            ->setParameters([
                'user' => $user,
                'year' => $year,
                'type' => 'hospital',
                'start' => $start,
                'end' => $end,
            ])
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    /**
     * Return de garde list of the user
     *
     * @return array<int,array<string,mixed>>
     */
    public function search(Resident $user): array
    {

        return $this->createQueryBuilder('g')
            ->leftJoin('g.year', 'year')
            ->andWhere('g.resident = :user')
            ->setParameter('user', $user)
            ->orderBy('g.dateOfStart', 'DESC')
            ->select('g.id,g.isEditable, g.dateOfStart, g.dateOfEnd, g.type, g.comment, year.title')
            ->orderBy('g.dateOfStart', 'DESC')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Fetch gardes by year and resident
     *
     * @return list<array{id: int, dateOfStart: \DateTime, dateOfEnd: \DateTime, type: string}>
     */
    public function findByYear(\App\Entity\Years $year, Resident $user): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.year = :year')
            ->andWhere('g.resident = :user')
            ->setParameter('year', $year)
            ->setParameter('user', $user)
            ->orderBy('g.dateOfStart', 'ASC')
            ->select('g.id, g.dateOfStart, g.dateOfEnd, g.type')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function findByMonth(Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.resident = :user')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('user', $resident)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('g.dateOfStart', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, g.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function findByMonthAndByYear(Resident $resident, Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.resident = :user')
            ->andWhere('g.year = :year')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('user', $resident)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('g.dateOfStart', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, g.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }


    // *************  Managers  **************************//

    /** @return list<array<string, mixed>> */
    public function searchByMonth(Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.year', 'year')
            ->leftJoin('g.resident', 'resident')
            ->where('year = :yearId')
            ->andWhere('(g.dateOfStart >= :start AND g.dateOfStart <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('resident.lastname', 'ASC')
            ->addOrderBy('g.dateOfStart', 'DESC')
            ->select('g.id,g.isEditable, g.dateOfStart, g.dateOfEnd, g.type, g.comment, resident.firstname, resident.lastname, year.title, year.speciality')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonth(int $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->leftJoin('g.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonthAndResident(Years $year, Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('g.resident = :resident')
            ->andWhere('g.type = :type')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('resident', $resident)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('type', 'callable')
            ->leftJoin('g.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Returns Garde entities (not scalars) for a resident within a date range.
     * Used by the compliance system.
     *
     * @return Garde[]
     */
    public function findByResidentAndPeriod(Resident $resident, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->where('g.resident = :resident')
            ->andWhere('g.dateOfStart >= :start')
            ->andWhere('g.dateOfEnd <= :end')
            ->setParameter('resident', $resident)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('g.dateOfStart', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function updateIsEditableForResidentInPeriod(int $residentId, int $yearId, \DateTime $startDate, \DateTime $endDate, bool $validated): void
    {
        $queryBuilder = $this->createQueryBuilder('g');

        $queryBuilder->update()
            ->set('g.isEditable', ':isEditable')
            ->where('g.resident = :residentId')
            ->andWhere('g.year = :yearId')
            ->andWhere(
                '(g.dateOfStart >= :startDate AND g.dateOfStart <= :endDate) OR 
                (g.dateOfEnd >= :startDate AND g.dateOfEnd <= :endDate) OR 
                (g.dateOfStart <= :startDate AND g.dateOfEnd >= :endDate)'
            )
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('residentId', $residentId)
            ->setParameter('yearId', $yearId)
            ->setParameter('isEditable', ! $validated)  // si validé, mettre à false, sinon mettre à true
            ->getQuery()
            ->execute();
    }
}
