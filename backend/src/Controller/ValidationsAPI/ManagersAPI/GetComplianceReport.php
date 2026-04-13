<?php

declare(strict_types=1);

namespace App\Controller\ValidationsAPI\ManagersAPI;

use App\Compliance\ResidentWorkComplianceService;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\ManagerMonthValidation\LegalPeriodsCalculator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/managers/compliance/{yearId}
 *
 * Returns the full compliance audit for all allowed residents of a year,
 * across all their 13-week legal periods.
 *
 * Response shape:
 * [
 *   {
 *     "residentId": 12,
 *     "residentFirstname": "Alice",
 *     "residentLastname": "Martin",
 *     "optingOut": false,
 *     "periods": [
 *       {
 *         "periodStart": "2025-10-06",
 *         "periodEnd":   "2026-01-04",
 *         "issues": [
 *           {
 *             "type":        "minimum_rest_violated",
 *             "severity":    "critical",
 *             "weekStart":   "2025-11-17",
 *             "description": "...",
 *             "context":     { ... }
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */
class GetComplianceReport extends AbstractController
{
    public function __construct(
        private readonly YearsRepository $yearsRepository,
        private readonly ResidentWorkComplianceService $complianceService,
        private readonly LegalPeriodsCalculator $periodsCalculator,
    ) {
    }

    #[Route('/api/managers/compliance/{yearId}', name: 'getComplianceReport', methods: ['GET'])]
    public function getComplianceReport(int $yearId): JsonResponse
    {
        $year = $this->yearsRepository->find($yearId);

        if (!$year) {
            return $this->json(['message' => 'Année introuvable.'], 404);
        }

        if (!$this->isGranted(YearAccessVoter::DATA_ACCESS, $year)) {
            return $this->json(['message' => "Vous n'avez pas accès à ces données."], 403);
        }

        $yearStart = $year->getDateOfStart();
        $yearEnd   = $year->getDateOfEnd();

        $results = [];

        foreach ($year->getResidents() as $yearsResident) {
            if (!$yearsResident->getAllowed()) {
                continue;
            }

            $resident = $yearsResident->getResident();
            if ($resident === null) {
                continue;
            }

            $periods = $this->periodsCalculator->getLegalPeriods($year, (int) $resident->getId());

            $residentPeriods = [];
            foreach ($periods as $period) {
                $report = $this->complianceService->auditResident(
                    resident: $resident,
                    periodStart: new \DateTimeImmutable($period['start']),
                    periodEnd: new \DateTimeImmutable($period['end']),
                );

                $residentPeriods[] = [
                    'periodStart' => $report->periodStart,
                    'periodEnd'   => $report->periodEnd,
                    'issues'      => array_map(
                        static fn ($issue) => [
                            'type'        => $issue->type->value,
                            'severity'    => $issue->severity->value,
                            'weekStart'   => $issue->weekStart,
                            'description' => $issue->description,
                            'context'     => $issue->context,
                        ],
                        $report->issues,
                    ),
                ];
            }

            $results[] = [
                'residentId'        => $resident->getId(),
                'residentFirstname' => $resident->getFirstname(),
                'residentLastname'  => $resident->getLastname(),
                'optingOut'         => $yearsResident->getOptingOut() ?? false,
                'periods'           => $residentPeriods,
            ];
        }

        return $this->json($results);
    }
}
