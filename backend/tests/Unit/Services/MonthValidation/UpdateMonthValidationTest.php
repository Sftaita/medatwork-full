<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\MonthValidation;

use App\Entity\Manager;
use App\Entity\Resident;
use App\Entity\ResidentValidation;
use App\Services\MonthValidation\UpdateMonthValidation;
use App\Services\MonthValidation\ValidationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdateMonthValidationTest extends TestCase
{
    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    /** @var ValidationService&MockObject */
    private ValidationService $validationService;

    private UpdateMonthValidation $service;

    protected function setUp(): void
    {
        $this->em                = $this->createMock(EntityManagerInterface::class);
        $this->validationService = $this->createMock(ValidationService::class);

        $this->service = new UpdateMonthValidation($this->em, $this->validationService);
    }

    private function makeManager(int $id): Manager&MockObject
    {
        $m = $this->createMock(Manager::class);
        $m->method('getId')->willReturn($id);

        return $m;
    }

    // ─── updateResidentValidationStatus ──────────────────────────────────────

    public function testValidateActionSetsValidatedTrue(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);
        $this->em->method('persist');
        $this->em->method('flush');

        $result = $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'validate'],
            $manager,
            $resident
        );

        $this->assertTrue($result);
        $this->assertTrue($validation->getValidated());
        $this->assertSame($manager, $validation->getValidatedBy());
    }

    public function testInvalidateActionSetsValidatedFalse(): void
    {
        $validation = new ResidentValidation();
        $validation->setValidated(true); // initially validated
        $manager  = $this->makeManager(2);
        $resident = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'invalidate'],
            $manager,
            $resident
        );

        $this->assertFalse($validation->getValidated());
    }

    public function testHistoryItemIsAppended(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(3);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'validate'],
            $manager,
            $resident
        );

        $history = $validation->getValidationHistory();
        $this->assertIsArray($history);
        $this->assertCount(1, $history);
        $this->assertSame('validated', $history[0]['action']);
        $this->assertSame(3, $history[0]['actionBy']);
        $this->assertArrayHasKey('uuid', $history[0]);
        $this->assertArrayHasKey('actionAt', $history[0]);
    }

    public function testHistoryItemIncludesManagerCommentWhenProvided(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'validate', 'managerComment' => 'Bien travaillé'],
            $manager,
            $resident
        );

        $history = $validation->getValidationHistory();
        $this->assertSame('Bien travaillé', $history[0]['managerComment']);
    }

    public function testHistoryItemIncludesResidentNotificationWhenProvided(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'invalidate', 'residentNotification' => 'Vérifier les gardes'],
            $manager,
            $resident
        );

        $history = $validation->getValidationHistory();
        $this->assertSame('Vérifier les gardes', $history[0]['residentNotification']);
    }

    public function testHistoryItemDoesNotIncludeOptionalFieldsWhenAbsent(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(
            1,
            ['status' => 'validate'],
            $manager,
            $resident
        );

        $history = $validation->getValidationHistory();
        $this->assertArrayNotHasKey('managerComment', $history[0]);
        $this->assertArrayNotHasKey('residentNotification', $history[0]);
    }

    public function testHistoryIsAccumulatedAcrossCalls(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);

        $this->service->updateResidentValidationStatus(1, ['status' => 'validate'], $manager, $resident);
        $this->service->updateResidentValidationStatus(1, ['status' => 'invalidate'], $manager, $resident);

        $this->assertCount(2, $validation->getValidationHistory());
        $this->assertSame('invalidated', $validation->getValidationHistory()[1]['action']);
    }

    public function testPersistAndFlushAreCalledOnce(): void
    {
        $validation = new ResidentValidation();
        $manager    = $this->makeManager(1);
        $resident   = $this->createMock(Resident::class);

        $this->validationService->method('getOrCreateResidentValidation')->willReturn($validation);
        $this->em->expects($this->once())->method('persist')->with($validation);
        $this->em->expects($this->once())->method('flush');

        $this->service->updateResidentValidationStatus(1, ['status' => 'validate'], $manager, $resident);
    }
}
