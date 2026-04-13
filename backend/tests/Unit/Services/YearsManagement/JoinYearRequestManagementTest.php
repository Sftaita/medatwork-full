<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\YearsManagement;

use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\ResidentRepository;
use App\Repository\YearsRepository;
use App\Repository\YearsResidentRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\YearsManagement\JoinYearRequestManagement;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class JoinYearRequestManagementTest extends TestCase
{
    /** @var ResidentRepository&MockObject */
    private ResidentRepository $residentRepo;

    /** @var YearsRepository&MockObject */
    private YearsRepository $yearsRepo;

    /** @var YearsResidentRepository&MockObject */
    private YearsResidentRepository $yearsResidentRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    private JoinYearRequestManagement $service;

    protected function setUp(): void
    {
        $this->residentRepo      = $this->createMock(ResidentRepository::class);
        $this->yearsRepo         = $this->createMock(YearsRepository::class);
        $this->yearsResidentRepo = $this->createMock(YearsResidentRepository::class);
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->authChecker       = $this->createMock(AuthorizationCheckerInterface::class);

        $this->service = new JoinYearRequestManagement(
            $this->residentRepo,
            $this->yearsRepo,
            $this->yearsResidentRepo,
            $this->em,
            $this->authChecker,
        );
    }

    // ─── updateYearResidentStatus ─────────────────────────────────────────────

    public function testThrowsAccessDeniedWhenNotAdmin(): void
    {
        $year = $this->createMock(Years::class);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->updateYearResidentStatus(1, 10, true);
    }

    public function testThrowsWhenRelationNotFound(): void
    {
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->yearsResidentRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\InvalidArgumentException::class);
        $this->service->updateYearResidentStatus(1, 10, true);
    }

    public function testSetsAllowedTrueAndPersists(): void
    {
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);
        $relation = $this->createMock(YearsResident::class);

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')
            ->willReturnCallback(fn (string $attr) => $attr === YearAccessVoter::ADMIN);
        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);

        $relation->expects($this->once())->method('setAllowed')->with(true);
        $this->em->expects($this->once())->method('persist')->with($relation);
        $this->em->expects($this->once())->method('flush');

        $this->service->updateYearResidentStatus(1, 10, true);
    }

    public function testSetsAllowedFalse(): void
    {
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);
        $relation = $this->createMock(YearsResident::class);

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);

        $relation->expects($this->once())->method('setAllowed')->with(false);

        $this->service->updateYearResidentStatus(1, 10, false);
    }

    public function testLooksUpYearAndResidentByCorrectIds(): void
    {
        $year     = $this->createMock(Years::class);
        $resident = $this->createMock(Resident::class);
        $relation = $this->createMock(YearsResident::class);

        $this->yearsRepo->expects($this->once())->method('findOneBy')->with(['id' => 7])->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->residentRepo->expects($this->once())->method('findOneBy')->with(['id' => 13])->willReturn($resident);
        $this->yearsResidentRepo->method('findOneBy')->willReturn($relation);
        $relation->method('setAllowed');

        $this->service->updateYearResidentStatus(7, 13, true);
    }
}
