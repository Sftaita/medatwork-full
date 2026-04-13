<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class JoinYearRequestManagement
{
    public function __construct(
        private readonly ResidentRepository $residentRepository,
        private readonly YearsRepository $yearsRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
    ) {
    }

    public function updateYearResidentStatus(int $yearId, int $residentId, bool $status): void
    {
        $year = $this->yearsRepository->findOneBy(['id' => $yearId]);

        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)) {
            throw new AccessDeniedException("Vous n'avez pas les droits requis pour cette action.");
        }

        $resident         = $this->residentRepository->findOneBy(['id' => $residentId]);
        $residentRelation = $this->yearsResidentRepository->findOneBy(['resident' => $resident, 'year' => $year]);

        if (! $residentRelation) {
            throw new \InvalidArgumentException('Relation résident↔année introuvable.');
        }

        $residentRelation->setAllowed($status);

        $this->entityManager->persist($residentRelation);
        $this->entityManager->flush();
    }
}
