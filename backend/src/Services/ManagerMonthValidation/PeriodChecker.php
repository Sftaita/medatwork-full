<?php

declare(strict_types=1);

namespace App\Services\ManagerMonthValidation;

use App\Entity\PeriodValidation;
use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use DateInterval;
use DatePeriod;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;

class PeriodChecker
{
    public function __construct(
        private readonly PeriodValidationRepository $periodValidationRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
    * Update periods for a year
    * The purpose of this function is to check if there is a period for each month between the start and end date of the year.
    * If a period for a month does not exist, this function will create it.
    * @param Years $year The year object
    */
    public function updatePeriodsForYear(Years $year): void
    {
        // Get the start and end date of the year
        $startDate = new DateTime($year->getDateOfStart()->format('Y-m-d'));
        $startDate->setDate((int) $startDate->format('Y'), (int) $startDate->format('m'), 1);

        $endDate = new DateTime($year->getDateOfEnd()->format('Y-m-d'));
        $endDate->modify('last day of this month');

        // Create an array that contains all the months between these two dates in the format 'monthyear'. Eg january 2022 will be 12022
        $months = [];
        $interval = new DateInterval('P1M');
        $dateRange = new DatePeriod($startDate, $interval, $endDate);
        foreach ($dateRange as $date) {
            $monthNumber = $date->format('n');
            $yearNumber = $date->format('Y');
            $months[] = $monthNumber . $yearNumber;
        }

        // Get a list of all existing periods for the year
        $existingPeriods = $this->periodValidationRepository->findBy(['year' => $year]);

        // Create an array of all existing months in the format 'monthyear'
        $existingMonths = [];

        foreach ($existingPeriods as $existingPeriod) {
            $month = $existingPeriod->getMonth();
            $yearNumber2 = $existingPeriod->getYearNb();
            $existingMonths[] = $month . $yearNumber2;
        }

        // Get the missing months by comparing $months and $existingMonths arrays
        $missingMonths = array_diff($months, $existingMonths);

        // For each missing month, create a new period and save it to the database
        foreach ($missingMonths as $missingMonth) {
            $yearNumber3 = intval(substr($missingMonth, -4));
            $monthNumber2 = intval(substr($missingMonth, 0, -4));

            $dateEndLimit = new \DateTime((new \DateTime($yearNumber3. '/'.$monthNumber2.'/01'))->modify('last day of this month')->format('Y-m-d 23:59:59'), new DateTimeZone('Europe/Paris'));

            $periodValidation = new PeriodValidation();
            $periodValidation->setYear($year)
                            ->setMonth($monthNumber2)
                            ->setYearNb($yearNumber3)
                            ->setValidated(false)
                            ->setEndLimite($dateEndLimit)
            ;

            $this->entityManager->persist($periodValidation);
        }
        $this->entityManager->flush();
    }
}
