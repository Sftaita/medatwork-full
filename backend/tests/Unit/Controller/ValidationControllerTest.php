<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ValidationsAPI\ManagersAPI\ValidationController;
use App\Entity\Manager;
use App\Repository\AbsenceRepository;
use App\Repository\GardeRepository;
use App\Repository\PeriodValidationRepository;
use App\Repository\ResidentRepository;
use App\Repository\ResidentValidationRepository;
use App\Repository\TimesheetRepository;
use App\Services\MonthValidation\UpdateMonthValidation;
use App\Services\Notifications\UpdateYearResidentNotifications;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Unit tests for ValidationController::updateResidentValidationStatus().
 *
 * Covers:
 * - periodId route param reçu comme int → find() appelé avec cet int (régression fix)
 * - Period not found → 400
 * - Invalid JSON body → 400 (avant getUser(), pas besoin du token)
 *
 * Note : isGranted() nécessite un kernel complet — testé dans YearAccessVoterTest.
 * Les tests s'arrêtent au 400 de "period not found", avant le check voter.
 */
final class ValidationControllerTest extends TestCase
{
    private PeriodValidationRepository $periodRepo;
    private ResidentRepository $residentRepo;
    private ResidentValidationRepository $residentValidationRepo;

    protected function setUp(): void
    {
        $this->periodRepo             = $this->createMock(PeriodValidationRepository::class);
        $this->residentRepo           = $this->createMock(ResidentRepository::class);
        $this->residentValidationRepo = $this->createMock(ResidentValidationRepository::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Construit un contrôleur avec un container minimal :
     * - security.token_storage mocké pour satisfaire getUser()
     */
    private function buildController(): ValidationController
    {
        $manager = $this->createMock(Manager::class);
        $manager->method('getId')->willReturn(1);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($manager);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = new Container();
        $container->set('security.token_storage', $tokenStorage);

        $controller = new ValidationController(
            $this->periodRepo,
            $this->residentRepo,
            $this->residentValidationRepo,
        );
        $controller->setContainer($container);

        return $controller;
    }

    /** @param array<mixed> $body */
    private function makeRequest(array $body): Request
    {
        return new Request([], [], [], [], [], [], json_encode($body) ?: '');
    }

    private function validBody(): array
    {
        return [
            ['residentId' => 1, 'status' => 'validate'],
        ];
    }

    private function methodArgs(int $periodId, Request $request): array
    {
        return [
            $periodId,
            $request,
            $this->createMock(UpdateMonthValidation::class),
            $this->createMock(UpdateYearResidentNotifications::class),
            $this->createMock(TimesheetRepository::class),
            $this->createMock(GardeRepository::class),
            $this->createMock(AbsenceRepository::class),
            new NullLogger(),
        ];
    }

    // ── Régression : int $periodId (Bug prod du 2026-05-08) ──────────────────

    public function testFindIsCalledWithIntPeriodId(): void
    {
        // Avant le fix, $periodId arrivait comme string dans le contrôleur et était
        // passé tel quel au service UpdateMonthValidation::updateResidentValidationStatus(int)
        // → TypeError avec strict_types=1 (path: /api/managers/validation/1096).
        //
        // Le fix : ajouter "int $periodId" dans la signature du contrôleur.
        // Ce test vérifie que find() est appelé avec l'entier 1096 (pas la string "1096").
        $this->periodRepo
            ->expects($this->once())
            ->method('find')
            ->with(1096)       // must be int
            ->willReturn(null);

        $response = $this->buildController()->updateResidentValidationStatus(
            ...$this->methodArgs(1096, $this->makeRequest($this->validBody()))
        );

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertStringContainsString('1096', $data['error']);
    }

    // ── Period not found → 400 ────────────────────────────────────────────────

    public function testPeriodNotFoundReturns400WithErrorKey(): void
    {
        $this->periodRepo->method('find')->willReturn(null);

        $response = $this->buildController()->updateResidentValidationStatus(
            ...$this->methodArgs(999, $this->makeRequest($this->validBody()))
        );

        $this->assertSame(400, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    // ── Invalid JSON body → 400 (avant getUser) ───────────────────────────────

    public function testInvalidJsonBodyReturns400(): void
    {
        // Le DTO est validé AVANT getUser() — pas besoin du token storage ici.
        // On réutilise buildController() par cohérence.
        $this->periodRepo->expects($this->never())->method('find');

        $request = new Request([], [], [], [], [], [], 'not-json');

        $response = $this->buildController()->updateResidentValidationStatus(
            ...$this->methodArgs(1, $request)
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testNullBodyReturns400(): void
    {
        $this->periodRepo->expects($this->never())->method('find');

        $request = new Request([], [], [], [], [], [], 'null');

        $response = $this->buildController()->updateResidentValidationStatus(
            ...$this->methodArgs(1, $request)
        );

        $this->assertSame(400, $response->getStatusCode());
    }
}
