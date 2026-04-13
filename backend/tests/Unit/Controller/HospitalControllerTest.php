<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\HospitalController;
use App\Entity\Hospital;
use App\Repository\HospitalRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

/**
 * Unit tests for HospitalController::list().
 *
 * Covers:
 * - Returns JSON array of active hospitals
 * - Each item has id, name, city, country
 * - Returns empty array when no active hospitals
 * - city is nullable (null allowed)
 */
final class HospitalControllerTest extends TestCase
{
    private function buildController(): HospitalController
    {
        $controller = new HospitalController();
        // Inject a minimal container (no serializer) so AbstractController::json() falls
        // back to plain JsonResponse without requiring the full Symfony kernel.
        $controller->setContainer(new Container());
        return $controller;
    }

    private function makeHospital(int $id, string $name, ?string $city, string $country): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        $h->method('getName')->willReturn($name);
        $h->method('getCity')->willReturn($city);
        $h->method('getCountry')->willReturn($country);
        return $h;
    }

    public function testListReturnsJsonArray(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAllActive')->willReturn([
            $this->makeHospital(1, 'CHU Liège', 'Liège', 'BE'),
            $this->makeHospital(2, 'UZ Leuven', 'Leuven', 'BE'),
        ]);

        $response = $this->buildController()->list($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, $data);
    }

    public function testListItemHasExpectedKeys(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAllActive')->willReturn([
            $this->makeHospital(1, 'CHU Liège', 'Liège', 'BE'),
        ]);

        $response = $this->buildController()->list($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertArrayHasKey('id', $data[0]);
        $this->assertArrayHasKey('name', $data[0]);
        $this->assertArrayHasKey('city', $data[0]);
        $this->assertArrayHasKey('country', $data[0]);
    }

    public function testListItemValuesAreCorrect(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAllActive')->willReturn([
            $this->makeHospital(7, 'CHU Liège', 'Liège', 'BE'),
        ]);

        $response = $this->buildController()->list($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame(7, $data[0]['id']);
        $this->assertSame('CHU Liège', $data[0]['name']);
        $this->assertSame('Liège', $data[0]['city']);
        $this->assertSame('BE', $data[0]['country']);
    }

    public function testListWithNullCityIsAllowed(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAllActive')->willReturn([
            $this->makeHospital(1, 'CHU Liège', null, 'BE'),
        ]);

        $response = $this->buildController()->list($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertNull($data[0]['city']);
    }

    public function testEmptyListReturnsEmptyArray(): void
    {
        $repo = $this->createMock(HospitalRepository::class);
        $repo->method('findAllActive')->willReturn([]);

        $response = $this->buildController()->list($repo);
        $data     = json_decode((string) $response->getContent(), true);

        $this->assertSame([], $data);
    }
}
