<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\Repository\ManagerRepository;
use App\Repository\ManagerYearsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class DeleteYearController extends AbstractController
{
    public function __construct(
        private readonly ManagerRepository $managerRepository,
    ) {
    }

    /**
     * Deletes a year and ensures there is at least one admin left.
     * If the current manager is the only admin, another manager is assigned as an admin randomly.
     *
     *
     * @param int $yearId The ID of the year to delete.
     * @param Security $security Security service to get the current user.
     * @param EntityManagerInterface $entityManager The entity manager for database operations.
     * @param ManagerYearsRepository $managerYearsRepository Repository for ManagerYear entities.
     * @return Response A Symfony response object with the outcome of the operation.
     *
     */
    #[Route('/api/managers/deleteYear/{yearId}', name: 'deleteYear', methods: ['DELETE'])]
    public function delete(int $yearId, Security $security, EntityManagerInterface $entityManager, ManagerYearsRepository $managerYearsRepository): Response
    {
        // Get the currently authenticated manager.
        $user = $security->getUser();

        $currentManager = $this->managerRepository->find($user);

        if ($currentManager === null) {
            return $this->json(['message' => 'Manager not found'], Response::HTTP_NOT_FOUND);
        }

        // Find the ManagerYear association for the current manager and year.
        $managerYear = $managerYearsRepository->findOneBy(['manager' => $currentManager, 'years' => $yearId]);

        // If no association is found, the year does not exist for the manager.
        if (! $managerYear) {
            return $this->json(['message' => 'Year not found'], Response::HTTP_NOT_FOUND);
        }

        // Check if the current manager is an admin.
        $isAdmin = $managerYear->getAdmin();

        if ($isAdmin) {
            // Retrieve all managers for the year.
            $yearManagers = $managerYearsRepository->findBy(['years' => $yearId]);

            // Initialize as no other admin available.
            $adminAvailable = false;

            // Check among year managers if another admin exists.
            foreach ($yearManagers as $yearManager) {
                if ($yearManager->getManager()->getId() !== $currentManager->getId() && $yearManager->getAdmin() === true) {
                    $adminAvailable = true;
                    break;
                }


            }

            // If no other admin is available, randomly select a new admin from the managers.
            if (! $adminAvailable) {
                foreach ($yearManagers as $yearManager) {
                    if ($yearManager->getManager()->getId() !== $currentManager->getId()) {
                        $yearManager->setAdmin(true);
                        $entityManager->persist($yearManager);
                        $entityManager->flush();
                    }
                }
            }
        }

        // Remove the association of the manager and the year from the database.
        $entityManager->remove($managerYear);
        $entityManager->flush();

        // Return a success response indicating the year was deleted.
        return $this->json(['message' => 'Year deleted successfully'], Response::HTTP_OK, [
        ]);
    }
}
