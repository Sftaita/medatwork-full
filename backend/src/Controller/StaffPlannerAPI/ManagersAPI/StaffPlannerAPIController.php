<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\ManagersAPI;

use App\Services\StaffPlanner\GenerateStaffPlannerExport;
use App\Services\StaffPlanner\StaffPlannerMonthsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;

class StaffPlannerAPIController extends AbstractController
{
    /**
     * POST /api/managers/SPImport
     *
     * Generates a Staff Planner .txt file from (yearResidentId, month, calendarYear) items.
     * Does NOT require a ResidentValidation to exist.
     *
     * Body:
     * {
     *   "items": [
     *     { "yearResidentId": 55, "month": 11, "calendarYear": 2024 }
     *   ]
     * }
     */
    #[Route('/api/managers/SPImport', name: 'createTxtFile', methods: ['POST'])]
    public function createTxtFile(
        Request $request,
        GenerateStaffPlannerExport $exporter,
        StaffPlannerMonthsService $monthsService,
    ): Response {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
            return new JsonResponse(['message' => 'Corps JSON invalide — champ "items" requis'], 400);
        }

        $items = [];
        foreach ($data['items'] as $i => $item) {
            if (!is_array($item)
                || !isset($item['yearResidentId'], $item['month'], $item['calendarYear'])
                || !is_int($item['yearResidentId']) || $item['yearResidentId'] <= 0
                || !is_int($item['month']) || $item['month'] < 1 || $item['month'] > 12
                || !is_int($item['calendarYear']) || $item['calendarYear'] < 2000
            ) {
                return new JsonResponse(
                    ['message' => sprintf('Item [%d] invalide — yearResidentId, month (1–12), calendarYear requis', $i)],
                    400,
                );
            }
            $items[] = [
                'yearResidentId' => $item['yearResidentId'],
                'month'          => $item['month'],
                'calendarYear'   => $item['calendarYear'],
            ];
        }

        if (empty($items)) {
            return new JsonResponse(['message' => '"items" ne peut pas être vide'], 400);
        }

        $result = $exporter->generateFromItems($items);

        if (!empty($result['alerts'])) {
            return new JsonResponse(['errors' => $result['alerts']], Response::HTTP_BAD_REQUEST);
        }

        // Mark each exported item as treated
        $monthsService->markItemsTreatedAfterGeneration($items, $this->getUser());

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
