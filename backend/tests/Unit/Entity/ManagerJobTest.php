<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Manager;
use App\Enum\ManagerJob;
use PHPUnit\Framework\TestCase;

/**
 * Tests for Manager::getJob() / setJob() after switching from enumType
 * to plain string column + manual tryFrom() mapping.
 *
 * Covers:
 * - Valid enum value round-trips correctly
 * - NULL in DB (job = null) returns null — no Doctrine MappingException
 * - Unknown/legacy string in DB returns null via tryFrom (no crash)
 * - setJob(null) stores null
 * - setJob(ManagerJob::Doctor) stores the string value "doctor"
 */
final class ManagerJobTest extends TestCase
{
    private function makeManager(): Manager
    {
        // Use reflection to bypass the constructor and directly set the private $job property,
        // simulating what Doctrine does when hydrating from the DB.
        return new Manager();
    }

    private function setJobRaw(Manager $manager, ?string $raw): void
    {
        $ref = new \ReflectionProperty(Manager::class, 'job');
        $ref->setAccessible(true);
        $ref->setValue($manager, $raw);
    }

    // ── getJob() ──────────────────────────────────────────────────────────────

    public function testGetJobReturnsCorrectEnumForValidValue(): void
    {
        $manager = $this->makeManager();
        $this->setJobRaw($manager, 'doctor');

        $this->assertSame(ManagerJob::Doctor, $manager->getJob());
    }

    public function testGetJobReturnsNullWhenDbValueIsNull(): void
    {
        $manager = $this->makeManager();
        $this->setJobRaw($manager, null);

        $this->assertNull($manager->getJob());
    }

    public function testGetJobReturnsNullForUnknownLegacyString(): void
    {
        $manager = $this->makeManager();
        $this->setJobRaw($manager, 'assistant'); // was in frontend translations but never in enum

        $this->assertNull($manager->getJob());
    }

    public function testGetJobReturnsNullForEmptyString(): void
    {
        $manager = $this->makeManager();
        $this->setJobRaw($manager, '');

        $this->assertNull($manager->getJob());
    }

    /** @dataProvider validJobProvider */
    public function testGetJobRoundTripsAllValidCases(ManagerJob $job): void
    {
        $manager = $this->makeManager();
        $this->setJobRaw($manager, $job->value);

        $this->assertSame($job, $manager->getJob());
    }

    /** @return array<string, array{ManagerJob}> */
    public static function validJobProvider(): array
    {
        return [
            'MedicalSupervisor' => [ManagerJob::MedicalSupervisor],
            'HumanResources'    => [ManagerJob::HumanResources],
            'Doctor'            => [ManagerJob::Doctor],
        ];
    }

    // ── setJob() ──────────────────────────────────────────────────────────────

    public function testSetJobNullStoresNull(): void
    {
        $manager = $this->makeManager();
        $manager->setJob(null);

        $ref = new \ReflectionProperty(Manager::class, 'job');
        $ref->setAccessible(true);
        $this->assertNull($ref->getValue($manager));
    }

    public function testSetJobStoresEnumValue(): void
    {
        $manager = $this->makeManager();
        $manager->setJob(ManagerJob::Doctor);

        $ref = new \ReflectionProperty(Manager::class, 'job');
        $ref->setAccessible(true);
        $this->assertSame('doctor', $ref->getValue($manager));
    }

    public function testSetJobReturnsSelf(): void
    {
        $manager = $this->makeManager();
        $result  = $manager->setJob(ManagerJob::HumanResources);

        $this->assertSame($manager, $result);
    }

    public function testSetThenGetRoundTrips(): void
    {
        $manager = $this->makeManager();
        $manager->setJob(ManagerJob::MedicalSupervisor);

        $this->assertSame(ManagerJob::MedicalSupervisor, $manager->getJob());
    }
}
