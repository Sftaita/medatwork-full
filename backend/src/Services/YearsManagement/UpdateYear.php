<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Entity\Manager;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsWeekIntervalsRepository;
use App\Security\Voter\YearAccessVoter;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateYear
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ManagerYearsRepository $managerYearsRepository,
        private readonly WeekIntervals $weekIntervals,
        private readonly YearsWeekIntervalsRepository $yearsWeekIntervalsRepository,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
    ) {
    }

    /**
     * Update Year information
     *
     * @param integer $yearId
     */
    /** @param array<string, mixed> $data */
    public function updateYear(int $yearId, Manager $manager, array $data): ?Years
    {
        $year = $this->yearsRepository->findOneBy(['id' => $yearId]);

        if ($year === null) {
            return null;
        }

        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)) {
            throw new AccessDeniedException("You don't have the required rights for this action");
        }

        $target = $data['target'];
        $updateWeekIntervals = false;

        if ($target === 'dateOfStart') {
            $newDateOfStart = new DateTime($data['newValue'], new DateTimeZone('Europe/Paris'));
            $year->setDateOfStart($newDateOfStart);
            $updateWeekIntervals = true;
        }

        if ($target === 'dateOfEnd') {
            $newDateOfEnd = new DateTime($data['newValue'], new DateTimeZone('Europe/Paris'));
            $year->setDateOfEnd($newDateOfEnd);
            $updateWeekIntervals = true;
        }

        if ($target === 'period') {
            $year->setPeriod($data['newValue']);
        }

        if ($target === 'title') {
            $year->setTitle($data['newValue']);
        }

        if ($target === 'speciality') {
            $year->setSpeciality($data['newValue']);
        }

        if ($target === 'location') {
            $year->setLocation($data['newValue']);
        }

        if ($target === 'master') {
            $year->setMaster($data['newValue']);

            $relation = $this->managerYearsRepository->findOneBy(['years' => $yearId, 'manager' => $data['newValue']]);

            if ($relation) {
                $relation->setAdmin(true)
                        ->setDataAccess(true)
                        ->setDataDownload(true)
                        ->setDataValidation(true);
                $this->entityManager->persist($relation);
                $this->entityManager->flush();
            }
        }

        $this->entityManager->persist($year);
        $this->entityManager->flush();

        if ($updateWeekIntervals) {
            $existingIntervals = $this->yearsWeekIntervalsRepository->findBy(['year' => $year]);

            $dateOfStart = $year->getDateOfStart();
            $dateOfEnd   = $year->getDateOfEnd();

            if ($dateOfStart === null || $dateOfEnd === null) {
                return $year;
            }

            $intervals = $this->weekIntervals->updateWeekIntervals(
                $existingIntervals,
                DateTime::createFromInterface($dateOfStart),
                DateTime::createFromInterface($dateOfEnd),
                $year,
            );

            foreach ($intervals as $interval) {
                $this->entityManager->persist($interval);
            }
            $this->entityManager->flush();
        }

        return $year;
    }




}
