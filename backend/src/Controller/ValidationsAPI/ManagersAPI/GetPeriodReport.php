<?php

declare(strict_types=1);

namespace App\Controller\ValidationsAPI\ManagersAPI;

use App\Services\ManagerMonthValidation\GetPeriodSummary;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class GetPeriodReport extends AbstractController
{
    #[Route('/api/managers/periodReport/{periodId}', name: 'getPeriodReport', methods: ['GET'])]
    public function getPeriodReport(int $periodId, GetPeriodSummary $getPeriodSummary): JsonResponse
    {
        if (! $this->getUser()) {
            throw new AccessDeniedException('Aucun utilisateur connecté.');
        }

        $data = $getPeriodSummary->generateResidentPeriodData($periodId);

        return $this->json($data);
    }
}
 