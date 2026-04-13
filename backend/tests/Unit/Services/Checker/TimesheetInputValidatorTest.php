<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Checker;

use App\Entity\Resident;
use App\Entity\Years;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Services\Checker\TimesheetChecker;
use App\Services\Checker\TimesheetInputValidator;
use App\Services\Utils\Tools;
use DateTime;
use DateTimeZone;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class TimesheetInputValidatorTest extends TestCase
{
    private TimesheetInputValidator $validator;

    private TimesheetChecker&MockObject $checker;
    private ResidentValidationRepository&MockObject $residentValidationRepo;
    private TimesheetRepository&MockObject $timesheetRepo;
    private GardeRepository&MockObject $gardeRepo;
    private AbsenceRepository&MockObject $absenceRepo;
    private Tools&MockObject $tools;

    protected function setUp(): void
    {
        $this->checker               = $this->createMock(TimesheetChecker::class);
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
        $this->timesheetRepo         = $this->createMock(TimesheetRepository::class);
        $this->gardeRepo             = $this->createMock(GardeRepository::class);
        $this->absenceRepo           = $this->createMock(AbsenceRepository::class);
        $this->tools                 = $this->createMock(Tools::class);

        $this->validator = new TimesheetInputValidator(
            $this->checker,
            $this->residentValidationRepo,
            $this->timesheetRepo,
            $this->gardeRepo,
            $this->absenceRepo,
            $this->tools,
        );
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private function makeYear(string $start = '2026-01-01 00:00:00', string $end = '2026-12-31 23:59:59'): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(1);
        $year->method('getDateOfStart')->willReturn(new DateTime($start, new DateTimeZone('Europe/Paris')));
        $year->method('getDateOfEnd')->willReturn(new DateTime($end, new DateTimeZone('Europe/Paris')));

        return $year;
    }

    private function makeUser(): Resident
    {
        return $this->createMock(Resident::class);
    }

    private function passingChecks(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(false);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(false);
        $this->absenceRepo->method('checkForDuplicate')->willReturn(false);
        $this->tools->method('hoursdiff')->willReturn(8.0);
    }

    // ─── writing rights ───────────────────────────────────────────────────────

    public function testReturnsErrorWhenNoWritingRights(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(false);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('autorisé', $result ?? '');
    }

    // ─── period already validated ─────────────────────────────────────────────

    public function testReturnsErrorWhenStartMonthValidated(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturnOnConsecutiveCalls(true, false);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('validé', $result ?? '');
    }

    // ─── overlaps ─────────────────────────────────────────────────────────────

    public function testReturnsErrorOnTimesheetOverlap(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(true);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('horaire', $result ?? '');
    }

    public function testReturnsErrorOnGardeOverlap(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(false);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(true);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('garde', $result ?? '');
    }

    public function testReturnsErrorOnAbsenceOverlap(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(false);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(false);
        $this->absenceRepo->method('checkForDuplicate')->willReturn(true);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('congé', $result ?? '');
    }

    // ─── duration ─────────────────────────────────────────────────────────────

    public function testReturnsErrorWhenDurationOver24h(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(false);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(false);
        $this->absenceRepo->method('checkForDuplicate')->willReturn(false);
        $this->tools->method('hoursdiff')->willReturn(25.0);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-02 09:00:00'),
            '2026-03-01 08:00',
            '2026-03-02 09:00',
        );

        $this->assertStringContainsString('24 heures', $result ?? '');
    }

    // ─── year boundary ────────────────────────────────────────────────────────

    public function testReturnsErrorWhenDatesOutsideYear(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->timesheetRepo->method('checkIfAlreadyExist')->willReturn(false);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(false);
        $this->absenceRepo->method('checkForDuplicate')->willReturn(false);
        $this->tools->method('hoursdiff')->willReturn(8.0);

        // Year starts 2026-06-01, but dates are in March
        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear('2026-06-01 00:00:00', '2027-05-31 23:59:59'),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertStringContainsString('intervalle', $result ?? '');
    }

    // ─── happy path ───────────────────────────────────────────────────────────

    public function testReturnsNullWhenAllValid(): void
    {
        $this->passingChecks();

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
        );

        $this->assertNull($result);
    }

    public function testExcludeIdIsPassedToTimesheetRepository(): void
    {
        $this->checker->method('writingRightsChecker')->willReturn(true);
        $this->residentValidationRepo->method('checkIfMonthHasBeenValidated')->willReturn(false);
        $this->tools->method('hoursdiff')->willReturn(8.0);
        $this->gardeRepo->method('checkIfGardeOnHospitalAlreadyExist')->willReturn(false);
        $this->absenceRepo->method('checkForDuplicate')->willReturn(false);

        $this->timesheetRepo->expects($this->once())
            ->method('checkIfAlreadyExist')
            ->with($this->anything(), $this->anything(), $this->anything(), $this->anything(), 42)
            ->willReturn(false);

        $result = $this->validator->validate(
            $this->makeUser(),
            $this->makeYear(),
            new DateTime('2026-03-01 08:00:00'),
            new DateTime('2026-03-01 16:00:00'),
            '2026-03-01 08:00',
            '2026-03-01 16:00',
            42,
        );

        $this->assertNull($result);
    }
}
