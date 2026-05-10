<?php

declare(strict_types=1);

namespace App\Controller\StaffPlannerAPI\HospitalAdminAPI;

use App\Entity\AppAdmin;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\StaffPlannerAuditEvent;
use App\Entity\Years;
use App\Enum\ManagerJob;
use App\Repository\StaffPlannerExportStatusRepository;
use App\Repository\YearsResidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Lock/Unlock RH endpoint for Staff Planner export items (Phase 5).
 *
 * PATCH /api/hospital-admin/staff-planner-items/{yrId}/{month}/{calYear}/lock
 * Body: { "locked": bool, "reason": string }
 *
 * Access: HospitalAdmin, AppAdmin, Manager RH only.
 */
#[Route('/api/hospital-admin')]
class LockController extends AbstractController
{
    public function __construct(
        private readonly StaffPlannerExportStatusRepository $statusRepo,
        private readonly YearsResidentRepository $yrRepo,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route(
        '/staff-planner-items/{yearResidentId}/{month}/{calendarYear}/lock',
        name: 'sp_item_lock',
        requirements: ['yearResidentId' => '\d+', 'month' => '\d+', 'calendarYear' => '\d+'],
        methods: ['PATCH'],
    )]
    public function lock(
        int $yearResidentId,
        int $month,
        int $calendarYear,
        Request $request,
    ): JsonResponse {
        $yr = $this->yrRepo->find($yearResidentId);
        if ($yr === null) {
            return new JsonResponse(['message' => 'MACCS introuvable'], Response::HTTP_NOT_FOUND);
        }

        $year = $yr->getYear();
        if ($year === null || !$this->canLock($year)) {
            return new JsonResponse(['message' => 'Accès refusé — lock réservé aux RH'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('locked', $data)) {
            return new JsonResponse(['message' => 'Corps JSON invalide — champ "locked" requis'], Response::HTTP_BAD_REQUEST);
        }

        $shouldLock = (bool) $data['locked'];
        $reason     = isset($data['reason']) && is_string($data['reason']) ? trim($data['reason']) : null;

        if ($shouldLock && ($reason === null || $reason === '')) {
            return new JsonResponse(['message' => 'Une raison est obligatoire pour verrouiller une période.'], Response::HTTP_BAD_REQUEST);
        }

        $status = $this->statusRepo->findForItem($yr, $month, $calendarYear);
        if ($status === null) {
            return new JsonResponse(['message' => 'Aucun statut export trouvé pour ce MACCS × mois.'], Response::HTTP_NOT_FOUND);
        }

        [$actorType, $actorId] = $this->resolveActor();

        if ($shouldLock) {
            $status->lock($actorType, $actorId, $reason);
            $eventType = 'rh_lock_applied';
        } else {
            $status->unlock();
            $eventType = 'rh_lock_removed';
        }

        // Append-only audit event
        $audit = (new StaffPlannerAuditEvent($eventType, $actorType, $actorId, [
            'reason'       => $reason,
            'month'        => $month,
            'calendarYear' => $calendarYear,
        ]))
            ->setYearsResident($yr)
            ->setMonth($month)
            ->setCalendarYear($calendarYear);

        $this->em->persist($audit);
        $this->em->flush();

        return $this->json([
            'yearResidentId' => $yearResidentId,
            'month'          => $month,
            'calendarYear'   => $calendarYear,
            'locked'         => $status->isLocked(),
            'lockedAt'       => $status->getLockedAt()?->format(\DateTimeInterface::ATOM),
            'lockedByType'   => $status->getLockedByType(),
            'lockedById'     => $status->getLockedById(),
            'lockReason'     => $status->getLockReason(),
        ]);
    }

    // ── Security ──────────────────────────────────────────────────────────────

    /** Only AppAdmin, HospitalAdmin, or Manager RH can lock/unlock. */
    private function canLock(Years $year): bool
    {
        $user     = $this->getUser();
        $hospital = $year->getHospital();
        if ($hospital === null) {
            return false;
        }

        if ($user instanceof AppAdmin) {
            return true;
        }

        if ($user instanceof HospitalAdmin) {
            return $user->getHospital()->getId() === $hospital->getId();
        }

        if ($user instanceof Manager) {
            if ($user->getAdminHospital() !== null) {
                return $user->getAdminHospital()->getId() === $hospital->getId();
            }
            if ($user->getJob() === ManagerJob::HumanResources) {
                foreach ($user->getHospitals() as $h) {
                    if ($h->getId() === $hospital->getId()) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /** @return array{string, int} */
    private function resolveActor(): array
    {
        $user = $this->getUser();
        return match (true) {
            $user instanceof Manager       => ['manager',        $user->getId()],
            $user instanceof HospitalAdmin => ['hospital_admin', $user->getId()],
            $user instanceof AppAdmin      => ['app_admin',      $user->getId()],
            default                        => ['system',         0],
        };
    }
}
