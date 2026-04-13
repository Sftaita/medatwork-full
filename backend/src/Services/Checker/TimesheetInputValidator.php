<?php

declare(strict_types=1);

namespace App\Services\Checker;

use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Services\Utils\Tools;
use DateTime;
use DateTimeZone;

/**
 * Validates a timesheet entry (add or update) against business rules:
 *   1. Writing rights for the given year
 *   2. Period not already validated by the manager
 *   3. No overlap with existing timesheets / gardes / absences
 *   4. Duration ≤ 24 h
 *   5. Dates within the year boundaries
 *
 * Returns null when valid, or a French error message string when invalid.
 */
class TimesheetInputValidator
{
    public function __construct(
        private TimesheetChecker $timesheetChecker,
        private ResidentValidationRepository $residentValidationRepository,
        private TimesheetRepository $timesheetRepository,
        private GardeRepository $gardeRepository,
        private AbsenceRepository $absenceRepository,
        private Tools $tools,
    ) {
    }

    /**
     * @param DateTime      $dateOfStart      Start datetime (already parsed)
     * @param DateTime      $dateOfEnd        End datetime (already parsed)
     * @param string        $dateOfStartStr   Raw string (for hoursdiff)
     * @param string        $dateOfEndStr     Raw string (for hoursdiff)
     * @param int|null      $excludeId        Timesheet ID to exclude from overlap check (update only)
     *
     * @return string|null  null = valid; non-null = error message to return 400
     */
    public function validate(
        Resident $user,
        Years $year,
        DateTime $dateOfStart,
        DateTime $dateOfEnd,
        string $dateOfStartStr,
        string $dateOfEndStr,
        ?int $excludeId = null,
    ): ?string {
        if (! $this->timesheetChecker->writingRightsChecker($year, $user)) {
            return "Vous n'êtes pas encore autorisé à encoder pour l'année " . $year->getId();
        }

        $startValidated = $this->residentValidationRepository->checkIfMonthHasBeenValidated(
            (int) $dateOfStart->format('m'),
            (int) $dateOfStart->format('Y'),
            $user
        );
        $endValidated = $this->residentValidationRepository->checkIfMonthHasBeenValidated(
            (int) $dateOfEnd->format('m'),
            (int) $dateOfEnd->format('Y'),
            $user
        );

        if ($startValidated || $endValidated) {
            return "L'intervalle chevauche un mois déjà validé. Veuillez consulter votre maître de stage.";
        }

        $overlapChecks = [
            ['Un horaire a déjà été enregistré pour cette période', fn () =>
                $this->timesheetRepository->checkIfAlreadyExist($user, $year, $dateOfStart, $dateOfEnd, $excludeId)],
            ['Une garde sur place enregistrée chevauche cette période', fn () =>
                $this->gardeRepository->checkIfGardeOnHospitalAlreadyExist($user, $year, $dateOfStart, $dateOfEnd)],
            ['Un congé enregistré chevauche cette période', fn () =>
                $this->absenceRepository->checkForDuplicate($user, $year, $dateOfStart, $dateOfEnd)],
        ];

        foreach ($overlapChecks as [$message, $check]) {
            if ($check()) {
                return $message;
            }
        }

        if (ceil($this->tools->hoursdiff($dateOfStartStr, $dateOfEndStr)) > 24) {
            return "Une période de travail de >24 heures n'est pas autorisée !";
        }

        if ($dateOfStart < $year->getDateOfStart() || $dateOfEnd > $year->getDateOfEnd()) {
            return "Les dates de début et de fin doivent être dans l'intervalle de l'année en cours";
        }

        return null;
    }

    public function parseDateTime(string $rawDate): DateTime
    {
        $timestamp = strtotime($rawDate);

        if ($timestamp === false) {
            throw new \InvalidArgumentException(sprintf('Invalid date string: "%s"', $rawDate));
        }

        return new DateTime(date('Y-m-d H:i:0', $timestamp), new DateTimeZone('Europe/Paris'));
    }
}
