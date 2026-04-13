<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\DTO\YearResidentStatusInputDTO;
use App\Services\YearsManagement\DeleteYearResidentRelation;
use App\Services\YearsManagement\JoinYearRequestManagement;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class YearResidentValidationController extends AbstractController
{
    #[Route('/api/managers/residentValidation', name: 'residentAllowedToJoinYear', methods: ['POST'])]
    public function managerDemand(Request $request, JoinYearRequestManagement $joinYearRequestManagement): JsonResponse|Response
    {
        try {
            $dto = YearResidentStatusInputDTO::fromRequest($request);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);
        }

        $joinYearRequestManagement->updateYearResidentStatus($dto->yearId, $dto->residentId, $dto->status);

        return new Response('ok', 200);
    }

    #[Route('/api/managers/residentValidation/{id}', name: 'deleteYearResidentRelation', methods: ['DELETE'])]
    public function deleteRelation(int $id, DeleteYearResidentRelation $deleteYearResidentRelation): Response
    {
        $deleteYearResidentRelation->deleteRelation($id);

        return new Response('ok', 200);
    }
}
