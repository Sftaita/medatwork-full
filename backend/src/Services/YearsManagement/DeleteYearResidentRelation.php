<?php

declare(strict_types=1);

namespace App\Services\YearsManagement;

use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class DeleteYearResidentRelation
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
        private readonly YearsResidentRepository $yearsResidentRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly AuthorizationCheckerInterface $authorizationChecker,
    ) {
    }

    public function deleteRelation(int $id): void
    {
        $relation = $this->yearsResidentRepository->findOneBy(['id' => $id]);

        if (! $relation) {
            throw new \InvalidArgumentException('Relation introuvable.');
        }

        $year = $this->yearsRepository->findOneBy(['id' => $relation->getYear()]);

        if (! $this->authorizationChecker->isGranted(YearAccessVoter::ADMIN, $year)) {
            throw new AccessDeniedException("Vous n'avez pas les droits requis pour cette action.");
        }

        $this->entityManager->remove($relation);
        $this->entityManager->flush();
    }
}
