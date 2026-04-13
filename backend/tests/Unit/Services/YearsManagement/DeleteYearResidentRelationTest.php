<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\YearsManagement\DeleteYearResidentRelation;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class DeleteYearResidentRelationTest extends TestCase
{
    /** @var YearsRepository&MockObject */
    private YearsRepository $yearsRepo;

    /** @var YearsResidentRepository&MockObject */
    private YearsResidentRepository $yearsResidentRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    private DeleteYearResidentRelation $service;

    protected function setUp(): void
    {
        $this->yearsRepo         = $this->createMock(YearsRepository::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->authChecker       = $this->createMock(AuthorizationCheckerInterface::class);

        $this->service = new DeleteYearResidentRelation(
            $this->yearsRepo,
            $this->yearsResidentRepo,
            $this->em,
            $this->authChecker,
        );
    }

    // ─── deleteRelation ───────────────────────────────────────────────────────

    public function testThrowsWhenRelationNotFound(): void
    {
        $this->yearsResidentRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->deleteRelation(99);
    }

    public function testThrowsAccessDeniedWhenNotAdmin(): void
    {
        $relation = $this->createMock(YearsResident::class);
        $year     = $this->createMock(Years::class);

        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->deleteRelation(1);
    }

    public function testChecksAdminVoterOnYear(): void
    {
        $relation = $this->createMock(YearsResident::class);
        $year     = $this->createMock(Years::class);

        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);
        $this->yearsRepo->method('findOneBy')->willReturn($year);

        $this->authChecker->expects($this->once())
            ->method('isGranted')
            ->with(YearAccessVoter::ADMIN, $year)
            ->willReturn(true);

        $this->em->method('remove');
        $this->em->method('flush');

        $this->service->deleteRelation(1);
    }

    public function testRemovesRelationAndFlushesOnSuccess(): void
    {
        $relation = $this->createMock(YearsResident::class);
        $year     = $this->createMock(Years::class);

        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);

        $this->em->expects($this->once())->method('remove')->with($relation);
        $this->em->expects($this->once())->method('flush');

        $this->service->deleteRelation(1);
    }
}
