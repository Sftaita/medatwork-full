<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Hospital;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Repository\YearsRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;

class CreateYear
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly WeekIntervals $weekIntervals,
    ) {
    }

    /**
     * Creates a new year and its corresponding week intervals.
     *
     * This method generates a unique token for the year, creates a new Years instance with the provided information,
     * generates the week intervals for the given period and saves them as YearsWeekIntervals instances linked to the year.
     * It also creates a new ManagerYears instance to link the year to the manager.
     *
     * If the $isMaster parameter is true, the manager's ID is set as the master of the year.
     *
     * @param Manager $manager The manager creating the year.
     * @param string $title The title of the year.
     * @param string $speciality The specialty of the year.
     * @param string $comment A comment about the year.
     * @param string $location The location of the year.
     * @param string $dateOfStart The start date of the year (format 'YYYY-MM-DD').
     * @param string $dateOfEnd The end date of the year (format 'YYYY-MM-DD').
     * @param string $period The period of the year.
     * @param bool $isMaster Indicates whether the manager is the master of the year.
     *
     */
    public function createYear(Manager $manager, string $title, string $speciality, string $comment, string $location, string $dateOfStart, string $dateOfEnd, string $period, bool $isMaster, ?Hospital $hospital = null): void
    {

        // 1. Generate year token an check if uniq
        $token = strtoupper(bin2hex(random_bytes(4)));
        $check = $this->yearsRepository->findOneBy(['token' => $token]);

        while ($check) {
            $token = strtoupper(bin2hex(random_bytes(4)));
            $check = $this->yearsRepository->findOneBy(['token' => $token]);
        }

        // 2. Create a year object

        $year = new Years();
        $date = new DateTime('now', new DateTimeZone('Europe/Paris'));

        $weekIntervalArray = $this->weekIntervals->createWeekIntervals(new DateTime($dateOfStart, new DateTimeZone('Europe/Paris')), new DateTime($dateOfEnd, new DateTimeZone('Europe/Paris')));

        foreach ($weekIntervalArray as $weekInterval) {
            $yearWeekInterval = new YearsWeekIntervals();
            $yearWeekInterval->setDateOfStart(new DateTime($weekInterval['dateOfStart']));
            $yearWeekInterval->setDateOfEnd(new DateTime($weekInterval['dateOfEnd']));
            $yearWeekInterval->setWeekNumber($weekInterval['weekNumber']);
            $yearWeekInterval->setMonthNumber($weekInterval['monthNumber']);
            $yearWeekInterval->setYearNumber($weekInterval['yearNumber']);
            $yearWeekInterval->setDeleted($weekInterval['deleted']);
            $yearWeekInterval->setYear($year);

            $year->addYearsWeekInterval($yearWeekInterval);

            $this->entityManager->persist($yearWeekInterval);
        }

        // If a hospital is provided, use its name as location (overrides the passed $location)
        $resolvedLocation = $hospital !== null ? $hospital->getName() : $location;

        $year->setCreatedAt($date)
            ->setToken($token)
            ->setTitle($title)
            ->setSpeciality($speciality)
            ->setComment($comment)
            ->setLocation($resolvedLocation)
            ->setDateOfStart(new DateTime($dateOfStart, new DateTimeZone('Europe/Paris')))
            ->setDateOfEnd(new DateTime($dateOfEnd, new DateTimeZone('Europe/Paris')))
            ->setPeriod($period);

        if ($hospital !== null) {
            $year->setHospital($hospital);
        }

        // 3. If the current user is the master of the year, take it's id as Year Master, else let it empty
        if ($isMaster) {
            $year->setMaster($manager->getId());
        }

        $this->entityManager->persist($year);

        // 4. Link the year to the current manager and give all rights
        $relation = new ManagerYears();
        $relation->setManager($manager)
                ->setYears($year)
                ->setOwner(true)
                ->setAdmin(true)
                ->setDataAccess(true)
                ->setDataValidation(true)
                ->setDataDownload(true)
                ->setCanManageAgenda(true)
                ->setHasAgendaAccess(true)
        ;
        $this->entityManager->persist($relation);

        // Flush Year and Relation object
        $this->entityManager->flush();
    }

}
