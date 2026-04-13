<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\StaffPlanner;

use App\Entity\StaffPlannerResources;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\StaffPlannerResourcesRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\StaffPlanner\UpdateSPResource;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class UpdateSPResourceTest extends TestCase
{
    /** @var StaffPlannerResourcesRepository&MockObject */
    private StaffPlannerResourcesRepository $resourceRepo;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    private UpdateSPResource $service;

    protected function setUp(): void
    {
        $this->resourceRepo = $this->createMock(StaffPlannerResourcesRepository::class);
        $this->authChecker  = $this->createMock(AuthorizationCheckerInterface::class);
        $this->em           = $this->createMock(EntityManagerInterface::class);

        $this->service = new UpdateSPResource($this->resourceRepo, $this->authChecker, $this->em);
    }

    private function makeResource(?string $workerHRID = null, ?string $sectionHRID = null): StaffPlannerResources&MockObject
    {
        $year        = $this->createMock(Years::class);
        $yearsResident = $this->createMock(YearsResident::class);
        $yearsResident->method('getYear')->willReturn($year);

        $r = $this->createMock(StaffPlannerResources::class);
        $r->method('getYearsResident')->willReturn($yearsResident);
        $r->method('setWorkerHRID')->willReturnSelf();
        $r->method('setSectionHRID')->willReturnSelf();

        return $r;
    }

    // ─── updateResources ──────────────────────────────────────────────────────

    public function testThrowsWhenResourceNotFound(): void
    {
        $this->resourceRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->service->updateResources(['resourceId' => 99, 'workerHRID' => 'W1', 'sectionHRID' => 'S1']);
    }

    public function testThrowsAccessDeniedWhenNotAdmin(): void
    {
        $resource = $this->makeResource();
        $this->resourceRepo->method('findOneBy')->willReturn($resource);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->updateResources(['resourceId' => 1, 'workerHRID' => 'W1', 'sectionHRID' => 'S1']);
    }

    public function testChecksAdminVoterOnYear(): void
    {
        $year          = $this->createMock(Years::class);
        $yearsResident = $this->createMock(YearsResident::class);
        $yearsResident->method('getYear')->willReturn($year);
        $resource      = $this->createMock(StaffPlannerResources::class);
        $resource->method('getYearsResident')->willReturn($yearsResident);
        $resource->method('setWorkerHRID')->willReturnSelf();
        $resource->method('setSectionHRID')->willReturnSelf();

        $this->resourceRepo->method('findOneBy')->willReturn($resource);
        $this->authChecker->expects($this->once())
            ->method('isGranted')
            ->with(YearAccessVoter::ADMIN, $year)
            ->willReturn(true);

        $this->service->updateResources(['resourceId' => 1, 'workerHRID' => 'W1', 'sectionHRID' => 'S1']);
    }

    public function testEmptyStringBecomesNull(): void
    {
        $resource = $this->createMock(StaffPlannerResources::class);
        $yearsResident = $this->createMock(YearsResident::class);
        $yearsResident->method('getYear')->willReturn($this->createMock(Years::class));
        $resource->method('getYearsResident')->willReturn($yearsResident);

        $this->resourceRepo->method('findOneBy')->willReturn($resource);
        $this->authChecker->method('isGranted')->willReturn(true);

        $resource->expects($this->once())->method('setWorkerHRID')->with(null)->willReturnSelf();
        $resource->expects($this->once())->method('setSectionHRID')->with(null)->willReturnSelf();

        $this->service->updateResources(['resourceId' => 1, 'workerHRID' => '', 'sectionHRID' => '']);
    }

    public function testNonEmptyStringKeptAsIs(): void
    {
        $resource = $this->createMock(StaffPlannerResources::class);
        $yearsResident = $this->createMock(YearsResident::class);
        $yearsResident->method('getYear')->willReturn($this->createMock(Years::class));
        $resource->method('getYearsResident')->willReturn($yearsResident);

        $this->resourceRepo->method('findOneBy')->willReturn($resource);
        $this->authChecker->method('isGranted')->willReturn(true);

        $resource->expects($this->once())->method('setWorkerHRID')->with('W-123')->willReturnSelf();
        $resource->expects($this->once())->method('setSectionHRID')->with('S-456')->willReturnSelf();

        $this->service->updateResources(['resourceId' => 1, 'workerHRID' => 'W-123', 'sectionHRID' => 'S-456']);
    }

    public function testPersistAndFlushCalledOnSuccess(): void
    {
        $resource = $this->makeResource();
        $this->resourceRepo->method('findOneBy')->willReturn($resource);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->em->expects($this->once())->method('persist')->with($resource);
        $this->em->expects($this->once())->method('flush');

        $this->service->updateResources(['resourceId' => 1, 'workerHRID' => 'W1', 'sectionHRID' => 'S1']);
    }
}
