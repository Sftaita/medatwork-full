<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Repository\YearsRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Single entry point for creating an academic year.
 *
 * Responsibilities:
 *   - Generate a unique token
 *   - Build the Years entity
 *   - Build the YearsWeekIntervals
 *   - Persist all entities via the EntityManager
 *
 * This service does NOT flush — the calling controller must call flush() after
 * adding any additional entities (e.g. ManagerYears for a Manager creator).
 * This gives the controller full control over transaction boundaries.
 *
 * What does NOT belong here:
 *   - HTTP input parsing (DTO) → controller
 *   - Permission checks (canCreateYear, role) → controller
 *   - ManagerYears creation → Manager controller only
 *   - Audit logging → HospitalAdmin controller only
 */
class YearCreationService
{
    public function __construct(
        private readonly YearsRepository       $yearsRepository,
        private readonly EntityManagerInterface $em,
        private readonly WeekIntervals         $weekIntervals,
    ) {
    }

    /**
     * Prepares and persists (but does not flush) a Years entity and its week intervals.
     *
     * @throws \InvalidArgumentException if dates are invalid
     */
    public function create(YearCreationInput $input): Years
    {
        $token = $this->generateUniqueToken();

        $tz    = new DateTimeZone('Europe/Paris');
        $start = new DateTime($input->dateOfStart, $tz);
        $end   = new DateTime($input->dateOfEnd, $tz);

        $year = new Years();
        $year->setTitle($input->title)
             ->setSpeciality($input->speciality)
             ->setPeriod($input->period)
             ->setDateOfStart($start)
             ->setDateOfEnd($end)
             ->setHospital($input->hospital)
             ->setStatus($input->status)
             ->setComment($input->comment ?? '')
             ->setCreatedAt(new DateTime('now', $tz))
             ->setToken($token);

        $this->buildWeekIntervals($year, $start, $end);

        $this->em->persist($year);

        return $year;
    }

    // ── private ───────────────────────────────────────────────────────────────

    private function generateUniqueToken(): string
    {
        do {
            $token = strtoupper(bin2hex(random_bytes(4)));
        } while ($this->yearsRepository->findOneBy(['token' => $token]) !== null);

        return $token;
    }

    private function buildWeekIntervals(Years $year, DateTime $start, DateTime $end): void
    {
        $intervals = $this->weekIntervals->createWeekIntervals($start, $end);

        foreach ($intervals as $interval) {
            $wi = (new YearsWeekIntervals())
                ->setDateOfStart(new DateTime($interval['dateOfStart']))
                ->setDateOfEnd(new DateTime($interval['dateOfEnd']))
                ->setWeekNumber((int) $interval['weekNumber'])
                ->setMonthNumber((int) $interval['monthNumber'])
                ->setYearNumber((int) $interval['yearNumber'])
                ->setDeleted($interval['deleted'])
                ->setYear($year);

            $year->addYearsWeekInterval($wi);
            $this->em->persist($wi);
        }
    }
}
