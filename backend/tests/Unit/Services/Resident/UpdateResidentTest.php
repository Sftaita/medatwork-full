<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Resident;

use App\Entity\Resident;
use App\Enum\Sexe;
use App\Repository\ResidentRepository;
use App\Services\Resident\UpdateResident;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdateResidentTest extends TestCase
{
    /** @var ResidentRepository&MockObject */
    private ResidentRepository $residentRepo;

    /** @var EntityManagerInterface&MockObject */
    private EntityManagerInterface $em;

    private UpdateResident $service;

    protected function setUp(): void
    {
        $this->residentRepo = $this->createMock(ResidentRepository::class);
        $this->em           = $this->createMock(EntityManagerInterface::class);

        $this->service = new UpdateResident($this->residentRepo, $this->em);
    }

    private function makeResidentInput(): Resident&MockObject
    {
        $r = $this->createMock(Resident::class);
        $r->method('getId')->willReturn(1);

        return $r;
    }

    // ─── updateResident ───────────────────────────────────────────────────────

    public function testThrowsWhenResidentNotFound(): void
    {
        $this->residentRepo->method('findOneBy')->willReturn(null);

        $this->expectException(\RuntimeException::class);
        $this->service->updateResident($this->makeResidentInput(), ['target' => 'firstname', 'newValue' => 'Jean']);
    }

    public function testUpdatesFirstname(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'firstname', 'newValue' => 'Jean']);

        $this->assertSame('Jean', $resident->getFirstname());
    }

    public function testUpdatesLastname(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'lastname', 'newValue' => 'Dupont']);

        $this->assertSame('Dupont', $resident->getLastname());
    }

    public function testUpdatesSexe(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'sexe', 'newValue' => 'female']);

        $this->assertSame(Sexe::Female, $resident->getSexe());
    }

    public function testUpdatesSpeciality(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'speciality', 'newValue' => 'cardio']);

        $this->assertSame('cardio', $resident->getSpeciality());
    }

    public function testUpdatesUniversity(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'university', 'newValue' => 'UCLouvain']);

        $this->assertSame('UCLouvain', $resident->getUniversity());
    }

    public function testUpdatesDateOfBirth(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'dateOfBirth', 'newValue' => '1995-06-15']);

        $this->assertSame('1995-06-15', $resident->getDateOfBirth()?->format('Y-m-d'));
    }

    public function testReturnsUpdatedResident(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);

        $result = $this->service->updateResident($this->makeResidentInput(), ['target' => 'firstname', 'newValue' => 'Alice']);

        $this->assertSame($resident, $result);
    }

    public function testPersistAndFlushCalled(): void
    {
        $resident = new Resident();
        $this->residentRepo->method('findOneBy')->willReturn($resident);
        $this->em->expects($this->once())->method('persist')->with($resident);
        $this->em->expects($this->once())->method('flush');

        $this->service->updateResident($this->makeResidentInput(), ['target' => 'firstname', 'newValue' => 'Test']);
    }
}
