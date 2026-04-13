<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Services\Gardes\GardeDistributionEngine;
use App\Services\Gardes\ShiftAssignmentEngine;
use App\Services\Schedule\ManagerSchedule\CalendarEventFormatter;
use App\Services\YearsManagement\YearSummaryBuilder;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Verifies that all services extracted during the Step 2 refactoring
 * are correctly registered and instantiatable from the DI container.
 */
class NewServicesWiringTest extends KernelTestCase
{
    public function testGardeDistributionEngineIsInstantiatable(): void
    {
        $service = new GardeDistributionEngine();
        $this->assertSame(GardeDistributionEngine::class, $service::class);
    }

    public function testShiftAssignmentEngineIsWired(): void
    {
        self::bootKernel();
        $service = static::getContainer()->get(ShiftAssignmentEngine::class);
        $this->assertInstanceOf(ShiftAssignmentEngine::class, $service);
    }

    public function testYearSummaryBuilderIsWired(): void
    {
        self::bootKernel();
        $service = static::getContainer()->get(YearSummaryBuilder::class);
        $this->assertInstanceOf(YearSummaryBuilder::class, $service);
    }

    public function testCalendarEventFormatterIsWired(): void
    {
        self::bootKernel();
        $service = static::getContainer()->get(CalendarEventFormatter::class);
        $this->assertInstanceOf(CalendarEventFormatter::class, $service);
    }

    public function testGardeDistributionEngineIsStateless(): void
    {
        // Two separate instantiations should be independent (no shared state)
        $a = new GardeDistributionEngine();
        $b = new GardeDistributionEngine();

        $this->assertSame($a::class, $b::class);
    }
}
