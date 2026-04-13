<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ManagerMonthValidation;

use App\Entity\PeriodValidation;
use App\Entity\Years;
use App\Repository\PeriodValidationRepository;
use App\Services\ManagerMonthValidation\PeriodChecker;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class PeriodCheckerTest extends TestCase
{
    /** @var PeriodValidationRepository&MockObject */
    private PeriodValidationRepository $repository;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $entityManager;

    private PeriodChecker $checker;

    protected function setUp(): void
    {
        $this->repository    = $this->createMock(PeriodValidationRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);

        $this->checker = new PeriodChecker($this->repository, $this->entityManager);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * Build a Years stub with the given start/end date strings (Y-m-d).
     */
    private function makeYear(string $start, string $end): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getDateOfStart')->willReturn(new DateTime($start));
        $year->method('getDateOfEnd')->willReturn(new DateTime($end));
        return $year;
    }

    /**
     * Build a PeriodValidation stub whose getMonth/getYearNb return the given values.
     */
    private function makePeriod(int $month, int $yearNb): PeriodValidation
    {
        $period = $this->createMock(PeriodValidation::class);
        $period->method('getMonth')->willReturn($month);
        $period->method('getYearNb')->willReturn($yearNb);
        return $period;
    }

    // ── happy paths ───────────────────────────────────────────────────────────

    public function testCreatesAllMissingPeriodsForSingleMonthYear(): void
    {
        // Year covering only November 2023 (1 month → 1 missing period expected)
        $year = $this->makeYear('2023-11-01', '2023-11-30');

        $this->repository
            ->expects($this->once())
            ->method('findBy')
            ->willReturn([]);   // no existing periods

        // persist must be called exactly once (one missing month)
        $this->entityManager
            ->expects($this->once())
            ->method('persist')
            ->with($this->isInstanceOf(PeriodValidation::class));

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $this->checker->updatePeriodsForYear($year);
    }

    public function testCreatesAllMissingPeriodsForMultiMonthYear(): void
    {
        // Year covering Oct–Dec 2023 → 3 months, all missing
        $year = $this->makeYear('2023-10-01', '2023-12-31');

        $this->repository
            ->expects($this->once())
            ->method('findBy')
            ->willReturn([]);

        $persistCount = 0;
        $this->entityManager
            ->expects($this->exactly(3))
            ->method('persist')
            ->willReturnCallback(function () use (&$persistCount): void {
                $persistCount++;
            });

        $this->entityManager->expects($this->once())->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertSame(3, $persistCount);
    }

    public function testDoesNotCreatePeriodsWhenAllAlreadyExist(): void
    {
        // Year covering Jan–Mar 2024, all three periods already exist
        $year = $this->makeYear('2024-01-15', '2024-03-10');

        $existingPeriods = [
            $this->makePeriod(1, 2024),
            $this->makePeriod(2, 2024),
            $this->makePeriod(3, 2024),
        ];

        $this->repository
            ->expects($this->once())
            ->method('findBy')
            ->willReturn($existingPeriods);

        // persist must never be called
        $this->entityManager
            ->expects($this->never())
            ->method('persist');

        // flush is still called (harmless flush after the loop)
        $this->entityManager->expects($this->once())->method('flush');

        $this->checker->updatePeriodsForYear($year);
    }

    public function testCreatesOnlyMissingPeriodsWhenSomeAlreadyExist(): void
    {
        // Year covers Jan–Mar 2024; Feb already exists → only Jan and Mar created
        $year = $this->makeYear('2024-01-01', '2024-03-31');

        $existingPeriods = [
            $this->makePeriod(2, 2024), // February already present
        ];

        $this->repository
            ->expects($this->once())
            ->method('findBy')
            ->willReturn($existingPeriods);

        $persisted = [];
        $this->entityManager
            ->expects($this->exactly(2))
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$persisted): void {
                $persisted[] = $pv;
            });

        $this->entityManager->expects($this->once())->method('flush');

        $this->checker->updatePeriodsForYear($year);

        // Collect months that were persisted
        $persistedMonths = array_map(fn (PeriodValidation $pv) => $pv->getMonth(), $persisted);
        $this->assertContains(1, $persistedMonths, 'January should be created');
        $this->assertContains(3, $persistedMonths, 'March should be created');
        $this->assertNotContains(2, $persistedMonths, 'February should NOT be created again');
    }

    // ── period field values ───────────────────────────────────────────────────

    public function testCreatedPeriodHasCorrectMonthAndYear(): void
    {
        // Year covers only February 2022
        $year = $this->makeYear('2022-02-01', '2022-02-28');

        $this->repository->method('findBy')->willReturn([]);

        /** @var PeriodValidation|null $captured */
        $captured = null;
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$captured): void {
                $captured = $pv;
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertNotNull($captured);
        $this->assertSame(2, $captured->getMonth(), 'Month should be 2 (February)');
        $this->assertSame(2022, $captured->getYearNb(), 'Year number should be 2022');
    }

    public function testCreatedPeriodIsNotValidatedByDefault(): void
    {
        $year = $this->makeYear('2022-05-01', '2022-05-31');

        $this->repository->method('findBy')->willReturn([]);

        /** @var PeriodValidation|null $captured */
        $captured = null;
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$captured): void {
                $captured = $pv;
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertNotNull($captured);
        $this->assertFalse($captured->getValidated(), 'Newly created period must have validated=false');
    }

    public function testCreatedPeriodEndLimiteIsLastDayOfMonthAt235959(): void
    {
        // March 2023 → last day is 31st
        $year = $this->makeYear('2023-03-01', '2023-03-31');

        $this->repository->method('findBy')->willReturn([]);

        /** @var PeriodValidation|null $captured */
        $captured = null;
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$captured): void {
                $captured = $pv;
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertNotNull($captured);
        $endLimite = $captured->getEndLimite();
        $this->assertNotNull($endLimite);
        $this->assertSame('2023-03-31', $endLimite->format('Y-m-d'));
        $this->assertSame('23:59:59', $endLimite->format('H:i:s'));
    }

    public function testCreatedPeriodEndLimiteIsLastDayOfFebruaryInLeapYear(): void
    {
        // February 2024 is a leap year → last day is 29th
        $year = $this->makeYear('2024-02-01', '2024-02-29');

        $this->repository->method('findBy')->willReturn([]);

        /** @var PeriodValidation|null $captured */
        $captured = null;
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$captured): void {
                $captured = $pv;
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertNotNull($captured);
        $endLimite = $captured->getEndLimite();
        $this->assertNotNull($endLimite);
        $this->assertSame('2024-02-29', $endLimite->format('Y-m-d'));
    }

    public function testCreatedPeriodEndLimiteIsLastDayOfFebruaryInNonLeapYear(): void
    {
        // February 2023 is NOT a leap year → last day is 28th
        $year = $this->makeYear('2023-02-01', '2023-02-28');

        $this->repository->method('findBy')->willReturn([]);

        /** @var PeriodValidation|null $captured */
        $captured = null;
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$captured): void {
                $captured = $pv;
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertNotNull($captured);
        $endLimite = $captured->getEndLimite();
        $this->assertNotNull($endLimite);
        $this->assertSame('2023-02-28', $endLimite->format('Y-m-d'));
    }

    // ── edge cases ────────────────────────────────────────────────────────────

    public function testStartDateInMidMonthIsNormalisedToFirstOfMonth(): void
    {
        // Start date is 15th: the service normalises it to the 1st, so July must still
        // be included in the month list and a period must be created for it.
        $year = $this->makeYear('2023-07-15', '2023-07-31');

        $this->repository->method('findBy')->willReturn([]);

        $persistedMonths = [];
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$persistedMonths): void {
                $persistedMonths[] = $pv->getMonth();
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertContains(7, $persistedMonths, 'July should be covered even when start is mid-month');
    }

    public function testEndDateInMidMonthStillCoversFullEndMonth(): void
    {
        // End date is the 10th of August — the service calls "last day of this month"
        // on the end date so August must be included.
        $year = $this->makeYear('2023-07-01', '2023-08-10');

        $this->repository->method('findBy')->willReturn([]);

        $persistedMonths = [];
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$persistedMonths): void {
                $persistedMonths[] = $pv->getMonth();
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertContains(7, $persistedMonths, 'July should be covered');
        $this->assertContains(8, $persistedMonths, 'August should be covered even though end is mid-month');
    }

    public function testYearSpanningTwoCalendarYears(): void
    {
        // Nov 2023 – Jan 2024 → 3 months across two calendar years
        $year = $this->makeYear('2023-11-01', '2024-01-31');

        $this->repository->method('findBy')->willReturn([]);

        $persisted = [];
        $this->entityManager
            ->method('persist')
            ->willReturnCallback(function (PeriodValidation $pv) use (&$persisted): void {
                $persisted[] = ['month' => $pv->getMonth(), 'yearNb' => $pv->getYearNb()];
            });
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);

        $this->assertCount(3, $persisted);
        $this->assertContains(['month' => 11, 'yearNb' => 2023], $persisted, 'November 2023 expected');
        $this->assertContains(['month' => 12, 'yearNb' => 2023], $persisted, 'December 2023 expected');
        $this->assertContains(['month' => 1,  'yearNb' => 2024], $persisted, 'January 2024 expected');
    }

    public function testFlushIsAlwaysCalledEvenWhenNothingCreated(): void
    {
        // All months already exist — flush must still be called once.
        $year = $this->makeYear('2024-06-01', '2024-06-30');

        $this->repository->method('findBy')->willReturn([
            $this->makePeriod(6, 2024),
        ]);

        $this->entityManager->expects($this->never())->method('persist');
        $this->entityManager->expects($this->once())->method('flush');

        $this->checker->updatePeriodsForYear($year);
    }

    public function testRepositoryIsCalledWithTheCorrectYearObject(): void
    {
        $year = $this->makeYear('2024-01-01', '2024-01-31');

        $this->repository
            ->expects($this->once())
            ->method('findBy')
            ->with(['year' => $year])
            ->willReturn([]);

        $this->entityManager->method('persist');
        $this->entityManager->method('flush');

        $this->checker->updatePeriodsForYear($year);
    }
}
