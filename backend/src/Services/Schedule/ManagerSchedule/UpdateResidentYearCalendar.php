<?php

declare(strict_types=1);

namespace App\Services\Schedule\ManagerSchedule;

use App\Entity\Resident;
use App\Entity\ResidentWeeklySchedule;
use App\Entity\ResidentYearCalendar;
use App\Entity\Years;
use App\Entity\YearsWeekIntervals;
use App\Entity\YearsWeekTemplates;
use App\Repository\ResidentYearCalendarRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;

class UpdateResidentYearCalendar
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly ResidentYearCalendarRepository $residentYearCalendarRepository,
    ) {
    }

    /**
     * Adds tasks to the resident's calendar for a given week.
     *
     * This function fetches all tasks associated with the provided week template
     * and creates new tasks in the ResidentYearCalendar. The tasks are scheduled
     * based on the start and end dates of the provided week interval.
     *
     * @param Years $year The year to which the tasks are added
     * @param Resident $resident The resident for whom the tasks are added
     * @param YearsWeekIntervals $weekInterval The week interval within which the tasks are scheduled
     * @param YearsWeekTemplates $weekTemplate The week template from which tasks are fetched
     * @param ResidentWeeklySchedule $weeklySchedule The resident's weekly schedule to which the tasks are added
     * @throws \Exception If the start or end time of a task is not in the expected format
     */
    public function addTasksToCalendar(Years $year, Resident $resident, YearsWeekIntervals $weekInterval, YearsWeekTemplates $weekTemplate, ResidentWeeklySchedule $weeklySchedule): void
    {
        // Find the associated year for the resident
        $yearResident = $this->yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $year]);

        if ($yearResident) {
            // Get all tasks associated with this week template
            $innerWeekTemplate = $weekTemplate->getWeekTemplate();
            if ($innerWeekTemplate === null) {
                $this->entityManager->flush();
                return;
            }
            $tasks = $innerWeekTemplate->getWeekTaskList()->getValues();

            $intervalDateOfStart = $weekInterval->getDateOfStart();
            if ($intervalDateOfStart === null) {
                $this->entityManager->flush();
                return;
            }
            $weekStart = new \DateTime('@' . $intervalDateOfStart->getTimestamp());

            foreach ($tasks as $task) {
                $title = $task->getTitle();
                $description = $task->getDescription();
                $dayOfWeek = $task->getDayOfWeek(); // Number from 1 (Monday) to 7 (Sunday)

                // Calculate the date of the task
                $taskDate = (clone $weekStart)->modify('+' . ($dayOfWeek - 1) . ' days');
                $taskStartTime = $task->getStartTime();
                $taskEndTime   = $task->getEndTime();
                if ($taskStartTime === null || $taskEndTime === null) {
                    continue;
                }
                $startTime = $taskStartTime->format('H:i');
                $endTime   = $taskEndTime->format('H:i');

                $startDateTime = new \DateTime($taskDate->format('Y-m-d') . ' ' . $startTime);
                $endDateTime = new \DateTime($taskDate->format('Y-m-d') . ' ' . $endTime);

                // Create a new task in the ResidentYearCalendar
                $newTask = new ResidentYearCalendar();
                $newTask->setYearsResident($yearResident)
                        ->setYearsWeekTemplates($weekTemplate)
                        ->setResidentWeeklySchedule($weeklySchedule)
                        ->setTitle($title)
                        ->setDescription($description)
                        ->setDateOfStart($startDateTime)
                        ->setDateOfEnd($endDateTime)
                        ->setType('scheduledTask')
                        ->setIsAllDay(false)
                        ->setColor('#fff')
                ;

                $this->entityManager->persist($newTask);
            }
        }

        $this->entityManager->flush();
    }


    /**
     * Removes tasks from the resident's calendar for a given week.
     *
     * This function fetches all tasks associated with the provided week template
     * and resident weekly schedule in the ResidentYearCalendar and removes them.
     *
     * @param ResidentWeeklySchedule $weeklySchedule The resident's weekly schedule from which the tasks are removed
     */
    public function removeTasksFromCalendar(ResidentWeeklySchedule $weeklySchedule): void
    {
        // Get all tasks associated with this weekly schedule
        $tasks = $this->residentYearCalendarRepository->findBy(['residentWeeklySchedule' => $weeklySchedule]);

        // Loop through each task and remove it
        foreach ($tasks as $task) {
            $this->entityManager->remove($task);
        }

        // Flush to execute the deletions
        $this->entityManager->flush();
    }



}
