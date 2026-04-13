<?php

declare(strict_types=1);

namespace App\Controller\YearsAPI\ManagersAPI;

use App\DTO\MonthValidationStatusInputDTO;
use App\Entity\Manager;
use App\Exceptions\InvalidYearException;
use App\Repository\ManagerRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentValidationRepository;
use App\Services\ManagerMonthValidation\GetMonthStatus;
use App\Services\ManagerMonthValidation\GetPeriodSummary;
use App\Services\ManagerMonthValidation\UpdateMonthStatus;
use App\Services\ManagerMonthValidation\ValidationPeriodFetcher;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class MonthValidationController extends AbstractController
{
    #[Route('/api/managers/validationList/{yearId}', name: 'validationStatus', methods: ['GET'])]
    public function getValidationStatus(string $yearId, GetMonthStatus $getMonthStatus): Response
    {
        if (! ctype_digit($yearId) || strlen($yearId) > 8) {
            throw new InvalidYearException('Invalid yearId');
        }

        return $this->json($getMonthStatus->getMonthPeriods((int) $yearId), 200);
    }

    #[Route('/api/managers/validationStatus', name: 'changeValidationStatus', methods: ['POST'])]
    public function validateMonth(Request $request, UpdateMonthStatus $updateMonthStatus, Security $security): Response
    {
        $dto = MonthValidationStatusInputDTO::fromRequest($request);

        /** @var Manager $manager */
        $manager = $security->getUser();
        $updateMonthStatus->updateValidationStatus($dto->periodId, $dto->status, $manager);

        return new Response('ok', 200);
    }

    #[Route('/api/managers/monthSummary/{periodId}', name: 'monthSummary', methods: ['GET'])]
    public function monthSummary(string $periodId, GetPeriodSummary $getPeriodSummary): Response
    {
        if (! is_numeric($periodId) || strlen($periodId) > 7) {
            throw new \InvalidArgumentException('periodId invalide.');
        }

        return $this->json($getPeriodSummary->getResidentSummary((int) $periodId), 200);
    }

    #[Route('/api/managers/validation/inWaitingList/{activeYear}', name: 'periodInWaitingOfValidation', methods: ['GET'])]
    public function inWaintingList(string $activeYear, Security $security, ValidationPeriodFetcher $fetcher): Response
    {
        if (strlen($activeYear) > 5) {
            throw new \InvalidArgumentException('activeYear invalide.');
        }

        $user = $security->getUser();
        if (! $user instanceof Manager) {
            throw new AccessDeniedException();
        }
        $data = $fetcher->fetchForManager($user, $activeYear !== 'false', 'waiting');

        return $this->json($data, 200);
    }

    #[Route('/api/managers/validation/validatedList/{activeYear}', name: 'periodValidated', methods: ['GET'])]
    public function ValidatedList(string $activeYear, Security $security, ValidationPeriodFetcher $fetcher): Response
    {
        if (strlen($activeYear) > 5) {
            throw new \InvalidArgumentException('activeYear invalide.');
        }

        $user = $security->getUser();
        if (! $user instanceof Manager) {
            throw new AccessDeniedException();
        }
        $data = $fetcher->fetchForManager($user, $activeYear !== 'false', 'validated');

        return $this->json($data, 200);
    }

    #[Route('/api/managers/validation/residentValidatedList/{activeYear}', name: 'residentPeriodValidated', methods: ['GET'])]
    public function ResidentValidatedList(string $activeYear, Security $security, ResidentValidationRepository $residentValidationRepository, ManagerRepository $managerRepository, PeriodValidationRepository $periodValidationRepository): Response
    {
        if (! in_array($activeYear, ['active', 'inactive'], true)) {
            return $this->json(['error' => 'Invalid activeYear value. It must be either "active" or "inactive".'], 400);
        }

        $user    = $security->getUser();
        $manager = $managerRepository->find($user);

        if ($manager === null) {
            return $this->json(['error' => 'Manager not found'], 404);
        }

        $today   = date('Y-m-d');
        $raw     = [];

        foreach ($manager->getManagerYears()->getValues() as $yearRelation) {
            $year     = $yearRelation->getYears();
            $masterId = $year->getMaster();

            if ($masterId !== null) {
                $master = $managerRepository->findOneBy(['id' => $masterId]);
                $masterFirstname = $master !== null ? $master->getFirstname() : null;
                $masterLastname  = $master !== null ? $master->getLastname() : null;
            } else {
                $masterFirstname = null;
                $masterLastname  = null;
            }

            $periods = $activeYear === 'active'
                ? $residentValidationRepository->fetchPeriodsForActiveYear($year, $today)
                : $residentValidationRepository->fetchAllPeriodsYear($year);

            $raw[] = [
                'yearId'            => $year->getId(),
                'yearTitle'         => $year->getTitle(),
                'masterId'          => $masterId,
                'masterFirstname'   => $masterFirstname,
                'masterLastname'    => $masterLastname,
                'speciality'        => $year->getSpeciality(),
                'validationPeriods' => $periods,
            ];
        }

        $data = [];
        foreach ($raw as $r) {
            $pastPeriods = array_values(array_filter(
                $r['validationPeriods'],
                fn ($p) => (new \DateTime($p['year'] . '-' . $p['month'] . '-01'))->format('Y-m-t') <= $today
            ));

            if (! empty($pastPeriods)) {
                $r['validationPeriods'] = $pastPeriods;
                $data[]                 = $r;
            }
        }

        return $this->json($data, 200);
    }
}
