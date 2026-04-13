<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\ManagersAPI;

use App\DTO\IntegerIdsInputDTO;
use App\Services\StaffPlanner\GenerateStaffPlannerExport;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Timesheets customized APIs
 */
class StaffPlannerAPIController extends AbstractController
{
    #[Route('/api/managers/SPImport', name: 'createTxtFile', methods: ['POST'])]
    public function createTxtFile(Request $request, GenerateStaffPlannerExport $exporter): Response
    {
        try {
            $dto = IntegerIdsInputDTO::fromRequest($request, 'periodsId');
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }

        $result = $exporter->generate($dto->ids);

        if (! empty($result['alerts'])) {
            return new JsonResponse(['errors' => $result['alerts']], Response::HTTP_BAD_REQUEST);
        }

        $filePath = $result['filePath'];

        $response = new BinaryFileResponse($filePath);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, 'Horaire.txt');
        $response->headers->set('Expires', '0');
        $response->headers->set('Cache-Control', 'must-revalidate');
        $response->headers->set('Pragma', 'public');
        $response->headers->set('Content-Length', (string) (filesize($filePath) ?: 0));
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }
}
