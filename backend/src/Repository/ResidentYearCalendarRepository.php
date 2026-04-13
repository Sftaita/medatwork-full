<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Resident;
use App\Entity\ResidentYearCalendar;
use App\Entity\Years;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ResidentYearCalendar>
 */
class ResidentYearCalendarRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ResidentYearCalendar::class);
    }

    public function findOverlappingEvents(\DateTime $start, \DateTime $end, int $yearsResidentId, ?int $eventId = null): bool
    {
        $query = $this->createQueryBuilder('g')
            ->where('g.yearsResident = :yearsResidentId')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd > :start) OR (g.dateOfStart < :end AND g.dateOfEnd >= :end) OR (g.dateOfStart >= :start AND g.dateOfEnd <= :end)')
            ->setParameter('yearsResidentId', $yearsResidentId)
            ->setParameter('start', $start)
            ->setParameter('end', $end);

        // If an event ID is provided, exclude it from the overlapping events
        if ($eventId) {
            $query->andWhere('g.id != :eventId')
                ->setParameter('eventId', $eventId);
        }

        $check = $query->getQuery()->getResult();

        return ! empty($check);
    }

    /** @return list<array<string, mixed>> */
    public function findByMonth(Resident $user, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.yearsResident', 'yearsResident')
            ->leftJoin('yearsResident.year', 'year')
            ->leftJoin('yearsResident.resident', 'resident')
            ->andWhere('resident = :user')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('g.dateOfStart', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function findByMonthAndYear(Resident $user, Years $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.yearsResident', 'yearsResident')
            ->leftJoin('yearsResident.year', 'year')
            ->leftJoin('yearsResident.resident', 'resident')
            ->andWhere('resident = :user')
            ->andWhere('year = :year')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('user', $user)
            ->setParameter('year', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('g.dateOfStart', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

    /** @return list<array<string, mixed>> */
    public function ManagerfindByMonth(int $year, string $start, string $end): array
    {
        return $this->createQueryBuilder('g')
            ->leftJoin('g.yearsResident', 'yearsResident')
            ->leftJoin('yearsResident.year', 'year')
            ->andWhere('year = :yearId')
            ->andWhere('(g.dateOfStart <= :start AND g.dateOfEnd >:start) OR (g.dateOfStart < :end AND g.dateOfEnd >=:end) OR (g.dateOfStart >= :start AND g.dateOfEnd <=:end)')
            ->setParameter('yearId', $year)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->leftJoin('yearsResident.resident', 'resident')
            ->orderBy('resident.lastname', 'ASC')
            ->select('g.dateOfStart, g.dateOfEnd, g.type, resident.id, resident.firstname, resident.lastname, year.title, year.id as yearId')
            ->getQuery()
            ->getResult()
        ;
    }

}
