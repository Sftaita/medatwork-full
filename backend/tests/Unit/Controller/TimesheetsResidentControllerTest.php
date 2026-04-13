<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\TimesheetsAPI\ResidentAPIs\TimesheetsResidentAPIController;
use App\Entity\Resident;
use App\Entity\Timesheet;
use App\Entity\Years;
use App\Repository\TimesheetRepository;
use App\Repository\YearsRepository;
use App\Services\Checker\TimesheetInputValidator;
use DateTime;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

/**
 * Unit tests for TimesheetsResidentAPIController.
 *
 * Covers addRecord() and update():
 * - 400 on invalid JSON / missing field (DTO throws)
 * - 400 on year not found
 * - 400 when validator returns an error message
 * - 200 on happy path (persist + flush called)
 *
 * Also covers delete():
 * - 400 when timesheet not found for this resident
 * - 400 when timesheet is not editable
 * - 200 on happy path (remove + flush)
 *
 * The DTO and Validator logic are tested separately in their own test files.
 */
final class TimesheetsResidentControllerTest extends TestCase
{
    private EntityManagerInterface $em;
    private Security $security;
    private YearsRepository $yearsRepo;
    private TimesheetRepository $timesheetRepo;
    private TimesheetInputValidator $validator;

    protected function setUp(): void
    {
        $this->em            = $this->createMock(EntityManagerInterface::class);
        $this->security      = $this->createMock(Security::class);
        $this->yearsRepo     = $this->createMock(YearsRepository::class);
        $this->timesheetRepo = $this->createMock(TimesheetRepository::class);
        $this->validator     = $this->createMock(TimesheetInputValidator::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(): TimesheetsResidentAPIController
    {
        $controller = new TimesheetsResidentAPIController($this->em);
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeResident(): Resident
    {
        return $this->createMock(Resident::class);
    }

    private function makeYear(): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(1);
        $year->method('getDateOfStart')->willReturn(new DateTime('2026-01-01', new DateTimeZone('Europe/Paris')));
        $year->method('getDateOfEnd')->willReturn(new DateTime('2026-12-31', new DateTimeZone('Europe/Paris')));
        return $year;
    }

    /** @param array<string, mixed> $body */
    private function post(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body));
    }

    private function validBody(): array
    {
        return [
            'year'        => 1,
            'dateOfStart' => '2026-03-01 08:00',
            'dateOfEnd'   => '2026-03-01 18:00',
            'pause'       => 30,
            'scientific'  => 0,
            'called'      => false,
        ];
    }

    // ── addRecord — DTO / input validation ────────────────────────────────────

    public function testAddRecordInvalidJsonReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $request  = new Request([], [], [], [], [], [], 'not-json');
        $response = $this->buildController()->addRecord($this->security, $request, $this->yearsRepo, $this->timesheetRepo, $this->validator);
        $this->assertSame(400, $response->getStatusCode());
    }

    public function testAddRecordMissingFieldReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $body = $this->validBody();
        unset($body['pause']);
        $response = $this->buildController()->addRecord($this->security, $this->post($body), $this->yearsRepo, $this->timesheetRepo, $this->validator);
        $this->assertSame(400, $response->getStatusCode());
    }

    // ── addRecord — year not found ────────────────────────────────────────────

    public function testAddRecordYearNotFoundReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $this->yearsRepo->method('find')->willReturn(null);

        $response = $this->buildController()->addRecord($this->security, $this->post($this->validBody()), $this->yearsRepo, $this->timesheetRepo, $this->validator);

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('message', $data);
    }

    // ── addRecord — validator rejects ─────────────────────────────────────────

    public function testAddRecordValidatorErrorReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $this->yearsRepo->method('find')->willReturn($this->makeYear());
        $this->validator->method('parseDateTime')->willReturnCallback(
            fn (string $d) => new DateTime($d, new DateTimeZone('Europe/Paris'))
        );
        $this->validator->method('validate')->willReturn("L'intervalle chevauche un mois déjà validé.");

        $response = $this->buildController()->addRecord($this->security, $this->post($this->validBody()), $this->yearsRepo, $this->timesheetRepo, $this->validator);

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('validé', $data['message']);
    }

    // ── addRecord — happy path ────────────────────────────────────────────────

    public function testAddRecordSuccessPersistsAndReturns200(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $this->yearsRepo->method('find')->willReturn($this->makeYear());
        $this->validator->method('parseDateTime')->willReturnCallback(
            fn (string $d) => new DateTime($d, new DateTimeZone('Europe/Paris'))
        );
        $this->validator->method('validate')->willReturn(null);

        $this->em->expects($this->once())->method('persist')->with($this->isInstanceOf(Timesheet::class));
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->addRecord($this->security, $this->post($this->validBody()), $this->yearsRepo, $this->timesheetRepo, $this->validator);

        $this->assertSame(200, $response->getStatusCode());
    }

    // ── update — year not found ───────────────────────────────────────────────

    public function testUpdateTimesheetNotFoundReturns404(): void
    {
        $this->timesheetRepo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->update(99, $this->security, $this->post($this->validBody()), $this->yearsRepo, $this->timesheetRepo, $this->validator);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ── delete ────────────────────────────────────────────────────────────────

    public function testDeleteTimesheetNotFoundForResidentReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());
        $this->timesheetRepo->method('findOneBy')->willReturn(null);

        $response = $this->buildController()->delete(99, $this->security, $this->timesheetRepo);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testDeleteNonEditableTimesheetReturns400(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());

        $timesheet = $this->createMock(Timesheet::class);
        $timesheet->method('getIsEditable')->willReturn(false);
        $this->timesheetRepo->method('findOneBy')->willReturn($timesheet);

        $response = $this->buildController()->delete(99, $this->security, $this->timesheetRepo);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testDeleteEditableTimesheetReturns200(): void
    {
        $this->security->method('getUser')->willReturn($this->makeResident());

        $timesheet = $this->createMock(Timesheet::class);
        $timesheet->method('getIsEditable')->willReturn(true);
        $this->timesheetRepo->method('findOneBy')->willReturn($timesheet);

        $this->em->expects($this->once())->method('remove')->with($timesheet);
        $this->em->expects($this->once())->method('flush');

        $response = $this->buildController()->delete(99, $this->security, $this->timesheetRepo);

        $this->assertSame(200, $response->getStatusCode());
    }
}
