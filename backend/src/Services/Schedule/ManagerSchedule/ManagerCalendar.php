<?php

declare(strict_types=1);

namespace App\Services\Schedule\ManagerSchedule;

use App\Entity\ResidentYearCalendar;
use App\Entity\YearsResident;
use App\Repository\ResidentYearCalendarRepository;
use Doctrine\ORM\EntityManagerInterface;

class ManagerCalendar
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ResidentYearCalendarRepository $residentYearCalendarRepository,
    ) {
    }


    /**
     * This function is used to add an event to the calendar as a manager. It checks if there is any overlap with existing events and
     * adds the new event if there is no overlap. In case of an error, it returns a relevant message to the user.
     *
     * @param $yearResident The ResidentYear object for the year and resident for which the event is to be added.
     * @param $data An array containing the data for the new event.
     *
     *
     * @param array<string, mixed> $data
     * @throws \Exception If there is a problem with the dates provided in $data, an exception will be thrown when attempting to create DateTime objects.
     * @return array<string, mixed> An associative array containing the status and a message indicating whether the event was added successfully or if there was an error.
     */
    public function addEventToCallendarAsManager(YearsResident $yearResident, array $data): array
    {

        try {
            $dateOfStart = new \DateTime($data['dateOfStart']);
            $dateOfEnd = new \DateTime($data['dateOfEnd']);

            if ($dateOfEnd < $dateOfStart) {
                return [
                    'status'  => 400,
                    'message' => 'La date de fin ne peut pas être avant la date de début.',
                ];
            }

            //Check if another event is not in the same time
            $yearResidentId = $yearResident->getId();
            if ($yearResidentId === null) {
                return ['status' => 500, 'message' => 'Relation année-MACCS non trouvée.'];
            }
            $overlap = $this->residentYearCalendarRepository->findOverlappingEvents($dateOfStart, $dateOfEnd, $yearResidentId);

            if ($overlap) {
                return [
                    'status' => 400,
                    'message' => 'Cet évènement chevauche un autre évènement du calendrier.',
                ];
            }

            // If no overlap, continue
            $event = new ResidentYearCalendar();
            $event->setYearsResident($yearResident)
                ->setTitle($data['title'])
                ->setDateOfStart($dateOfStart)
                ->setDateOfEnd($dateOfEnd)
                ->setDescription($data['description'])
                ->setType('scheduledTask')
                ->setLocation(null)
                ->setIsAllDay(false)
                ->setColor('')
                ->setYearsWeekTemplates(null)
                ->setResidentWeeklySchedule(null);



            // Save the changes
            $this->entityManager->persist($event);
            $this->entityManager->flush();

            $calendarResident = $yearResident->getResident();
            $eventDateStart   = $event->getDateOfStart();
            $eventDateEnd     = $event->getDateOfEnd();
            $schedule = [
                'residentYearCalendarId' => $event->getId(),
                'title' => $event->getTitle(),
                'description' => $event->getDescription(),
                'residentFirstname' => $calendarResident !== null ? $calendarResident->getFirstname() : null,
                'residentLastname' => $calendarResident !== null ? $calendarResident->getLastname() : null,
                'residentColor' => null,
                'start' => $eventDateStart !== null ? $eventDateStart->format('Y-m-d H:i') : null,
                'end' => $eventDateEnd !== null ? $eventDateEnd->format('Y-m-d H:i') : null,
                'residentName' => $calendarResident !== null ? $calendarResident->getLastname().' '.$calendarResident->getFirstname() : null,
                'extendedProps' => ['residentId' => $calendarResident !== null ? $calendarResident->getId() : null],
            ];
            return [
                'status' => 200,
                'message' => 'L\'événement a été ajouté avec succès',
                'event' => $schedule,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'message' => 'Une erreur est survenue lors de la création de l\'événement.',

            ];
        };
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function updateEventInCalendarAsManager(ResidentYearCalendar $event, YearsResident $yearResident, array $data): array
    {
        try {
            // Convert strings to DateTime objects
            $dateOfStart = new \DateTime($data['dateOfStart']);
            $dateOfEnd = new \DateTime($data['dateOfEnd']);

            //Check if another event is not in the same time
            $updateYearResidentId = $yearResident->getId();
            if ($updateYearResidentId === null) {
                return ['status' => 500, 'message' => 'Relation année-MACCS non trouvée.'];
            }
            $overlap = $this->residentYearCalendarRepository->findOverlappingEvents(
                $dateOfStart,
                $dateOfEnd,
                $updateYearResidentId,
                $event->getId()
            );

            if ($overlap) {
                return [
                    'status' => 400,
                    'message' => 'Cet évènement chevauche un autre évènement du calendrier.',
                ];
            }

            // If no overlap, continue
            $event->setTitle($data['title'])
                ->setDateOfStart($dateOfStart)
                ->setDateOfEnd($dateOfEnd)
                ->setDescription($data['description'])
                ->setYearsResident($yearResident);


            // Save the changes
            $this->entityManager->flush();

            return [
                'status' => 200,
                'message' => 'L\'événement a été mis à jour avec succès.',
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'message' => 'Une erreur est survenue lors de la mise à jour de l\'événement.',
            ];
        }
    }


}
