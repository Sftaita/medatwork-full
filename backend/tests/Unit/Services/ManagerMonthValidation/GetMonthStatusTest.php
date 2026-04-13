<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use App\Services\ManagerMonthValidation\GetMonthStatus;
use App\Services\ManagerMonthValidation\PeriodChecker;
use App\Services\Utils\Tools;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class GetMonthStatusTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $periodRepo;

    /** @var YearsRepository&MockObject */
    private YearsRepository $yearsRepo;

    /** @var Tools&MockObject */
    private Tools $tools;

    /** @var PeriodChecker&MockObject */
    private PeriodChecker $periodChecker;

    /** @var AuthorizationCheckerInterface&MockObject */
    private AuthorizationCheckerInterface $authChecker;

    private GetMonthStatus $service;

    protected function setUp(): void
    {
        $this->periodRepo    = $this->createMock(PeriodValidationRepository::class);
        $this->yearsRepo     = $this->createMock(YearsRepository::class);
        $this->tools         = $this->createMock(Tools::class);
        $this->periodChecker = $this->createMock(PeriodChecker::class);
        $this->authChecker   = $this->createMock(AuthorizationCheckerInterface::class);

        $this->service = new GetMonthStatus(
            $this->periodRepo,
            $this->yearsRepo,
            $this->tools,
            $this->periodChecker,
            $this->authChecker,
        );
    }

    // ─── getMonthPeriods ──────────────────────────────────────────────────────

    public function testGetMonthPeriodsThrowsWhenNoAdminOrValidationRight(): void
    {
        $year = $this->createMock(Years::class);
        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(false);

        $this->expectException(AccessDeniedException::class);
        $this->service->getMonthPeriods(1);
    }

    public function testGetMonthPeriodsAllowedWithAdminRight(): void
    {
        $year    = $this->createMock(Years::class);
        $periods = [['month' => 3, 'validated' => false]];

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')
            ->willReturnCallback(fn (string $attribute) => $attribute === YearAccessVoter::ADMIN);
        $this->periodChecker->expects($this->once())->method('updatePeriodsForYear')->with($year);
        $this->periodRepo->method('findMonthToValidate')->willReturn($periods);

        $result = $this->service->getMonthPeriods(1);

        $this->assertSame($periods, $result);
    }

    public function testGetMonthPeriodsAllowedWithDataValidationRight(): void
    {
        $year = $this->createMock(Years::class);

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')
            ->willReturnCallback(fn (string $attribute) => $attribute === YearAccessVoter::DATA_VALIDATION);
        $this->periodRepo->method('findMonthToValidate')->willReturn([]);

        $result = $this->service->getMonthPeriods(1);

        $this->assertIsArray($result);
    }

    public function testGetMonthPeriodsCallsUpdatePeriodsForYear(): void
    {
        $year = $this->createMock(Years::class);

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->periodChecker->expects($this->once())->method('updatePeriodsForYear')->with($year);
        $this->periodRepo->method('findMonthToValidate')->willReturn([]);

        $this->service->getMonthPeriods(42);
    }

    public function testGetMonthPeriodsReturnsRepoResult(): void
    {
        $year     = $this->createMock(Years::class);
        $expected = [
            ['month' => 1, 'validated' => false],
            ['month' => 2, 'validated' => false],
        ];

        $this->yearsRepo->method('findOneBy')->willReturn($year);
        $this->authChecker->method('isGranted')->willReturn(true);
        $this->periodRepo->method('findMonthToValidate')->willReturn($expected);

        $result = $this->service->getMonthPeriods(5);

        $this->assertSame($expected, $result);
    }
}
