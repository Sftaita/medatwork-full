<?php

declare(strict_types=1);

namespace App\Controller\ValidationsAPI\ManagersAPI;

use App\Services\ManagerMonthValidation\GetPeriodSummary;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class GetPeriodReport extends AbstractController
{
    #[Route('/api/managers/periodReport/{periodId}', name: 'getPeriodReport', methods: ['GET'])]
    public function getPeriodReport(int $periodId, GetPeriodSummary $getPeriodSummary): JsonResponse
    {
        $data = $getPeriodSummary->generateResidentPeriodData($periodId);

        return $this->json($data);
    }
}
