<?php

declare(strict_types=1);

namespace App\Services\Resident;

use App\Entity\Resident;
use App\Repository\ResidentRepository;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;

class UpdateResident
{
    public function __construct(
        private readonly ResidentRepository $residentRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }


    /**
     * Update Resident
     *
     */
    /** @param array<string, mixed> $data */
    public function updateResident(Resident $residentId, array $data): Resident
    {
        // 1. Get Resident
        $resident = $this->residentRepository->findOneBy(['id' => $residentId]);

        if ($resident === null) {
            throw new \RuntimeException('Resident not found for id: ' . $residentId->getId());
        }

        // 2. Update
        $target = $data['target'];

        if ($target === 'firstname') {
            $resident->setFirstname($data['newValue']);
        }

        if ($target === 'lastname') {
            $resident->setLastname($data['newValue']);
        }

        if ($target === 'sexe') {
            $resident->setSexe(\App\Enum\Sexe::from($data['newValue']));
        }

        if ($target === 'dateOfMaster') {
            $resident->setDateOfMaster(new DateTime($data['newValue'], new DateTimeZone('Europe/Paris')));
        }

        if ($target === 'speciality') {
            $resident->setSpeciality($data['newValue']);
        }

        if ($target === 'dateOfBirth') {
            $resident->setDateOfBirth(new DateTime($data['newValue'], new DateTimeZone('Europe/Paris')));
        }

        if ($target === 'university') {
            $resident->setUniversity($data['newValue']);
        }


        $this->entityManager->persist($resident);
        $this->entityManager->flush();

        return $resident;

    }
}
