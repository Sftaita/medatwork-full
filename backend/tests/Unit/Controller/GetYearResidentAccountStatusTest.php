<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ResidentsAPI\ManagersAPI\GetYearResidentController;
use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Unit tests — GetYearResidentController::getList()
 *
 * Vérifie que le champ `accountActivated` reflète correctement l'état d'activation
 * du compte résident (validatedAt !== null).
 *
 * Cas couverts :
 *   1. MACCS nouvellement invité (validatedAt=null)  → accountActivated=false
 *   2. MACCS compte activé     (validatedAt set)     → accountActivated=true
 *   3. allowed=false (en attente d'approbation)      → accountActivated reflète le compte
 *   4. Le champ accountActivated est toujours présent dans la réponse
 */
final class GetYearResidentAccountStatusTest extends TestCase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildController(): GetYearResidentController
    {
        // Le voter accorde l'accès DATA_ACCESS pour tous les tests de ce fichier.
        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            fn (string $attribute) => $attribute === YearAccessVoter::DATA_ACCESS
        );

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn (string $id) => $id === 'security.authorization_checker'
        );
        $container->method('get')->willReturnCallback(
            fn (string $id) => match ($id) {
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Unexpected container::get($id)"),
            }
        );

        $controller = new GetYearResidentController();
        $controller->setContainer($container);
        return $controller;
    }

    /** @param array{validatedAt: ?\DateTimeInterface, allowed: bool} $overrides */
    private function buildYearWithResident(array $overrides): Years
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getId')->willReturn(1);
        $resident->method('getFirstname')->willReturn('Alice');
        $resident->method('getLastname')->willReturn('Martin');
        $resident->method('getEmail')->willReturn('alice@example.com');
        $resident->method('getAvatarPath')->willReturn(null);
        $resident->method('getValidatedAt')->willReturn($overrides['validatedAt']);

        $yr = $this->createMock(YearsResident::class);
        $yr->method('getId')->willReturn(10);
        $yr->method('getResident')->willReturn($resident);
        $yr->method('getAllowed')->willReturn($overrides['allowed']);
        $yr->method('getDateOfStart')->willReturn(null);
        $yr->method('getOptingOut')->willReturn(false);
        $yr->method('getLegalLeaves')->willReturn(0);
        $yr->method('getPaternityLeave')->willReturn(0);
        $yr->method('getMaternityLeave')->willReturn(0);
        $yr->method('getUnpaidLeave')->willReturn(0);
        $yr->method('getScientificLeaves')->willReturn(0);

        $year = $this->createMock(Years::class);
        $year->method('getId')->willReturn(42);
        $year->method('getDateOfStart')->willReturn(new \DateTime('2026-10-01'));
        $year->method('getResidents')->willReturn(new ArrayCollection([$yr]));

        return $year;
    }

    private function runGetList(Years $year): array
    {
        $yearsRepo = $this->createMock(YearsRepository::class);
        $yearsRepo->method('findOneBy')->willReturn($year);

        $response = $this->buildController()->getList(42, $yearsRepo);
        return json_decode($response->getContent(), true);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function testInvitedMaccsAccountNotActivated(): void
    {
        $year = $this->buildYearWithResident(['validatedAt' => null, 'allowed' => true]);
        $data = $this->runGetList($year);

        $resident = $data['residents'][0];
        $this->assertFalse(
            $resident['accountActivated'],
            'Un MACCS invité (validatedAt=null) doit avoir accountActivated=false'
        );
        $this->assertTrue($resident['allowed'], 'allowed doit rester true (approuvé par le manager)');
    }

    public function testActivatedMaccsAccountActivated(): void
    {
        $year = $this->buildYearWithResident(['validatedAt' => new \DateTime('2026-10-15'), 'allowed' => true]);
        $data = $this->runGetList($year);

        $resident = $data['residents'][0];
        $this->assertTrue(
            $resident['accountActivated'],
            'Un MACCS avec validatedAt set doit avoir accountActivated=true'
        );
        $this->assertTrue($resident['allowed']);
    }

    public function testPendingApprovalMaccsAccountNotActivated(): void
    {
        $year = $this->buildYearWithResident(['validatedAt' => null, 'allowed' => false]);
        $data = $this->runGetList($year);

        $resident = $data['residents'][0];
        $this->assertFalse($resident['accountActivated']);
        $this->assertFalse($resident['allowed'], 'allowed=false = en attente d\'approbation manager');
    }

    public function testAccountActivatedFieldAlwaysPresent(): void
    {
        $year = $this->buildYearWithResident(['validatedAt' => null, 'allowed' => true]);
        $data = $this->runGetList($year);

        $this->assertArrayHasKey(
            'accountActivated',
            $data['residents'][0],
            'Le champ accountActivated doit toujours être présent dans la réponse'
        );
    }
}
