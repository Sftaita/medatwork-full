<?php

declare(strict_types=1);

namespace App\Services\Schedule\ManagerSchedule;

use App\Entity\ResidentYearCalendar;
use App\Entity\YearsResident;

class CalendarEventFormatter
{
    private const COLORS = [
        '#FF0000', // Rouge
        '#FF7F00', // Orange
        '#FFFF00', // Jaune
        '#00FF00', // Vert
        '#0000FF', // Bleu
        '#4B0082', // Indigo
        '#9400D3', // Violet
        '#FFD700', // Or
        '#C0C0C0', // Argent
        '#FFC0CB', // Rose
    ];

    /**
     * Returns the color assigned to a resident at position $index.
     */
    public function colorForIndex(int $index): string
    {
        return self::COLORS[$index % count(self::COLORS)];
    }

    /**
     * Formats a resident summary (id, names, color).
     */
    /** @return array<string, mixed> */
    public function formatResident(YearsResident $yearResident, string $color): array
    {
        $resident = $yearResident->getResident();
        if ($resident === null) {
            return [];
        }

        return [
            'residentId'        => $resident->getId(),
            'residentFirstname' => $resident->getFirstname(),
            'residentLastname'  => $resident->getLastname(),
            'residentColor'     => $color,
        ];
    }

    /**
     * Formats a calendar event for the first-load view (no residentName field).
     */
    /** @return array<string, mixed> */
    public function formatEventFirstLoad(ResidentYearCalendar $calendar, YearsResident $yearResident, string $color): array
    {
        $resident = $yearResident->getResident();
        if ($resident === null) {
            return [];
        }
        $dateOfStart = $calendar->getDateOfStart();
        $dateOfEnd   = $calendar->getDateOfEnd();

        return [
            'residentYearCalendarId' => $calendar->getId(),
            'title'                  => $calendar->getTitle(),
            'description'            => $calendar->getDescription(),
            'residentFirstname'      => $resident->getFirstname(),
            'residentLastname'       => $resident->getLastname(),
            'residentColor'          => $color,
            'start'                  => $dateOfStart !== null ? $dateOfStart->format('Y-m-d H:i') : null,
            'end'                    => $dateOfEnd !== null ? $dateOfEnd->format('Y-m-d H:i') : null,
            'extendedProps'          => ['residentId' => $resident->getId()],
        ];
    }

    /**
     * Formats a calendar event for a specific-year view (includes residentName).
     */
    /** @return array<string, mixed> */
    public function formatEventByYear(ResidentYearCalendar $calendar, YearsResident $yearResident, string $color): array
    {
        $resident = $yearResident->getResident();
        if ($resident === null) {
            return [];
        }
        $dateOfStart = $calendar->getDateOfStart();
        $dateOfEnd   = $calendar->getDateOfEnd();

        return [
            'residentYearCalendarId' => $calendar->getId(),
            'title'                  => $calendar->getTitle(),
            'description'            => $calendar->getDescription(),
            'residentFirstname'      => $resident->getFirstname(),
            'residentLastname'       => $resident->getLastname(),
            'residentColor'          => $color,
            'start'                  => $dateOfStart !== null ? $dateOfStart->format('Y-m-d H:i') : null,
            'end'                    => $dateOfEnd !== null ? $dateOfEnd->format('Y-m-d H:i') : null,
            'residentName'           => $resident->getLastname().' '.$resident->getFirstname(),
            'extendedProps'          => ['residentId' => $resident->getId()],
        ];
    }
}
