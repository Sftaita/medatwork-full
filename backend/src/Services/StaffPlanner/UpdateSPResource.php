<?php

declare(strict_types=1);

namespace App\Services\StaffPlanner;

use App\Repository\StaffPlannerResourcesRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateSPResource
{
    public function __construct(
        private readonly StaffPlannerResourcesRepository $staffPlannerResourcesRepository,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Update resources.
     *
     */
    /** @param array<string, mixed> $data */
    public function updateResources(array $data): void
    {
        // 1. Find the Resource
        $resource = $this->staffPlannerResourcesRepository->findOneBy(['id' => $data['resourceId']]);

        if ($resource === null) {
            throw new \RuntimeException('StaffPlannerResources not found for id: ' . $data['resourceId']);
        }

        // 2. Find Year related to this Staff Planner Resource
        $year = $resource->getYearsResident()->getYear();

        // 3. Check managerRights on this Year
        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)) {
            throw new AccessDeniedException("Vous n'avez pas les droits requis");
        }

        // 4. Write new data
        $workerHRID = $data['workerHRID'] !== '' ? $data['workerHRID'] : null;
        $sectionHRID = $data['sectionHRID'] !== '' ? $data['sectionHRID'] : null;

        $resource
            ->setWorkerHRID($workerHRID)
            ->setSectionHRID($sectionHRID);

        $this->entityManager->persist($resource);
        $this->entityManager->flush();
    }
}
