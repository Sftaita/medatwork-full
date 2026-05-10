<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\ManagersAPI;

use App\Repository\YearsResidentRepository;
use App\Services\StaffPlanner\ExportBatchService;
use App\Services\StaffPlanner\GenerateStaffPlannerExport;
use App\Services\StaffPlanner\StaffPlannerMonthsService;
use Psr\Log\LoggerInterface;
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
     * Phase 2: creates an immutable StaffPlannerExportBatch + item snapshots BEFORE
     * returning the file. If batch persistence fails, the file is NOT returned (audit trail
     * is mandatory for legal/hospital compliance).
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
        ExportBatchService $batchService,
        YearsResidentRepository $yrRepo,
        LoggerInterface $logger,
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

        // ── 1. Generate .txt file ──────────────────────────────────────────────
        $result = $exporter->generateFromItems($items);

        if (!empty($result['alerts'])) {
            @unlink($result['filePath']);
            return new JsonResponse(['errors' => $result['alerts']], Response::HTTP_BAD_REQUEST);
        }

        $filePath       = $result['filePath'];
        $capturedItems  = $result['capturedItems'];

        // ── 2. Persist immutable export batch (Phase 2) ───────────────────────
        if ($capturedItems !== []) {
            // Resolve year from the first successfully captured MACCS
            $year = $capturedItems[0]['yearsResident']->getYear();

            if ($year !== null) {
                try {
                    $fileContent = (string) file_get_contents($filePath);
                    $batchService->recordBatch($year, $fileContent, $capturedItems, $this->getUser());
                } catch (\Throwable $e) {
                    @unlink($filePath);
                    $logger->error('ExportBatch persistence failed — file NOT delivered', [
                        'exception' => $e->getMessage(),
                        'yearId'    => $year->getId(),
                        'itemCount' => count($capturedItems),
                    ]);
                    return new JsonResponse(
                        ['message' => 'Export généré mais impossible de créer l\'enregistrement d\'audit. Réessayez.'],
                        Response::HTTP_INTERNAL_SERVER_ERROR,
                    );
                }
            }
        }

        // ── 3. Mark items treated + update dirty/fingerprint (Phase 1) ────────
        // Only runs if batch persistence succeeded (or no capturedItems).
        $monthsService->markItemsTreatedAfterGeneration($items, $this->getUser());

        // ── 4. Return file ─────────────────────────────────────────────────────
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
