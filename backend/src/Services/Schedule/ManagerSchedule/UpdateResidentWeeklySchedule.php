<?php

declare(strict_types=1);

namespace App\Services\Schedule\ManagerSchedule;

use App\Entity\ResidentWeeklySchedule;
use App\Entity\Years;
use App\Repository\ResidentWeeklyScheduleRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Repository\YearsWeekTemplatesRepository;
use Doctrine\ORM\EntityManagerInterface;

class UpdateResidentWeeklySchedule
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UpdateResidentYearCalendar $updateResidentYearCalendar,
        private readonly YearsWeekIntervalsRepository $yearsWeekIntervalsRepository,
        private readonly YearsWeekTemplatesRepository $yearsWeekTemplatesRepository,
        private readonly ResidentWeeklyScheduleRepository $residentWeeklyScheduleRepository,
    ) {
    }

    /**
     * Performs a bulk update operation for schedules. This function groups the given schedules by a unique combination of
     * residentId, yearWeekTemplateId and weekIntervalId, then processes each group to either delete or add schedules
     * according to the given method. For newly added schedules, it also adds associated tasks to the calendar.
     * For deleted schedules, it removes associated tasks from the calendar.
     *
     * @param Years $year The year for which the schedules are to be updated.
     * @param array<int, array<string, mixed>> $schedules The array of schedules to be updated. Each schedule is an associative array containing residentId,
     *                         yearWeekTemplateId, weekIntervalId and the method ('delete' or 'add').
     *
     * @throws \Exception if the schedule is invalid.
     */
    public function performBulkUpdate(Years $year, array $schedules): void
    {
        // Create groups of schedules based on the unique combination of residentId, yearWeekTemplateId and weekIntervalId
        $groupedSchedules = [];
        foreach ($schedules as $schedule) {
            $this->validateSchedule($schedule);
            $uniqueKey = $schedule['residentId'] . '-' . $schedule['yearWeekTemplateId'] . '-' . $schedule['weekIntervalId'];
            $groupedSchedules[$uniqueKey] = $schedule;
        }

        $schedulesToDelete = [];
        $schedulesToAdd = [];
        foreach ($groupedSchedules as $schedule) {
            if ($schedule['method'] === 'delete') {
                $schedulesToDelete[] = $schedule;
            } else {
                $schedulesToAdd[] = $schedule;
            }
        }

        // Fetch residents for this year and store them in an array
        $residentsForYear = $year->getResidents()->getValues();
        $residents = [];
        foreach ($residentsForYear as $yearResident) {
            $residents[$yearResident->getResident()->getId()] = $yearResident->getResident();
        }

        // Fetch WeekIntervals and YearWeekTemplates for this year and store them in separate arrays
        $weekIntervals = [];
        $yearWeekTemplates = [];
        foreach ($this->yearsWeekIntervalsRepository->findBy(['year' => $year->getId()]) as $interval) {
            $weekIntervals[$interval->getId()] = $interval;
        }
        foreach ($this->yearsWeekTemplatesRepository->findBy(['year' => $year->getId()]) as $template) {
            $yearWeekTemplates[$template->getId()] = $template;
        }

        // Process schedules to be added
        foreach ($schedulesToAdd as $schedule) {
            $resident = $residents[$schedule['residentId']] ?? null;
            if ($resident === null) {
                throw new \InvalidArgumentException(
                    sprintf('Resident %d does not belong to year %d', $schedule['residentId'], $year->getId())
                );
            }

            // Check if this combination already exists
            $existingSchedule = $this->residentWeeklyScheduleRepository->findOneBy([
                'resident' => $schedule['residentId'],
                'yearsWeekIntervals' => $schedule['weekIntervalId'],
                'yearsWeekTemplates' => $schedule['yearWeekTemplateId'],
            ]);

            if (! $existingSchedule) {
                // If not, create a new ResidentWeeklySchedule entity
                $newSchedule = new ResidentWeeklySchedule();
                $newSchedule->setResident($residents[$schedule['residentId']])
                            ->setYearsWeekIntervals($weekIntervals[$schedule['weekIntervalId']])
                            ->setYearsWeekTemplates($yearWeekTemplates[$schedule['yearWeekTemplateId']]);

                $this->entityManager->persist($newSchedule);
                $this->entityManager->flush();
                $this->updateResidentYearCalendar->addTasksToCalendar($year, $residents[$schedule['residentId']], $weekIntervals[$schedule['weekIntervalId']], $yearWeekTemplates[$schedule['yearWeekTemplateId']], $newSchedule);

            }
        }



        // Process schedules to be deleted
        foreach ($schedulesToDelete as $schedule) {
            // Retrieve the entity to delete
            $scheduleToDelete = $this->residentWeeklyScheduleRepository->findOneBy([
                'resident' => $schedule['residentId'],
                'yearsWeekIntervals' => $schedule['weekIntervalId'],
                'yearsWeekTemplates' => $schedule['yearWeekTemplateId'],
            ]);

            if ($scheduleToDelete) {
                $this->updateResidentYearCalendar->removeTasksFromCalendar($scheduleToDelete);
                $this->entityManager->remove($scheduleToDelete);
            }
        }

        // Execute all the operations
        $this->entityManager->flush();
    }

    /**
     * Validates a schedule array.
     *
     * This method checks if the 'method' is defined and is either 'create' or 'delete'.
     * It also checks if 'residentId', 'yearWeekTemplateId', and 'weekIntervalId' exist and are integers.
     * If any of these checks fails, it throws an InvalidArgumentException.
     *
     * @param array $schedule The schedule array to be validated.
     *
     * @throws \InvalidArgumentException If 'method' is not 'create' or 'delete', or if
     *                                 'residentId', 'yearWeekTemplateId', or 'weekIntervalId'
     *                                 do not exist or are not integers.
     *
     */
    /** @param array<string, mixed> $schedule */
    private function validateSchedule(array $schedule): void
    {
        // Check if method is either 'create' or 'delete'
        if (! isset($schedule['method']) || ! in_array($schedule['method'], ['create', 'delete'], true)) {
            throw new \InvalidArgumentException('The method should be either "create" or "delete"');
        }

        // Check if residentId, yearWeekTemplateId, and weekIntervalId are integers
        $keysToCheck = ['residentId', 'yearWeekTemplateId', 'weekIntervalId'];
        foreach ($keysToCheck as $key) {
            if (! isset($schedule[$key]) || ! is_int($schedule[$key])) {
                throw new \InvalidArgumentException("The $key should be an integer");
            }
        }
    }
}
