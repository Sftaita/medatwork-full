<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\HospitalAdminAuditLog;
use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Records actions performed by a HospitalAdmin (or promoted Manager) for audit trail.
 */
class HospitalAdminAuditService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    /**
     * @param array<string, mixed>|null $changes
     */
    public function log(
        HospitalAdmin|Manager $actor,
        Hospital $hospital,
        string $action,
        string $entityType,
        ?int $entityId,
        string $description,
        ?array $changes = null,
        string $status = 'success',
    ): void {
        $adminId = $actor->getId() ?? 0;
        $adminName = match (true) {
            $actor instanceof HospitalAdmin => trim(($actor->getFirstname() ?? '') . ' ' . ($actor->getLastname() ?? '')),
            $actor instanceof Manager       => trim($actor->getFirstname() . ' ' . $actor->getLastname()),
        };

        $log = (new HospitalAdminAuditLog())
            ->setHospitalAdminId($adminId)
            ->setAdminName($adminName ?: $actor->getEmail())
            ->setHospitalId($hospital->getId() ?? 0)
            ->setAction($action)
            ->setEntityType($entityType)
            ->setEntityId($entityId)
            ->setDescription($description)
            ->setChanges($changes)
            ->setStatus($status);

        $this->em->persist($log);
        // Do NOT flush here — caller flushes after its own operations
    }
}
