<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ResidentsAPI\ManagersAPI\GetYearResidentController;
use App\Entity\Years;
use App\Repository\YearsRepository;
use App\Security\Voter\YearAccessVoter;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Couverture :
 *  — 404 si l'année n'existe pas
 *  — 403 si le voter refuse l'accès (ex. hospital_admin hôpital différent)
 *  — 200 si DATA_ACCESS accordé (hospital_admin même hôpital, manager avec droits)
 *  — 200 si ADMIN accordé (manager avec flag admin=true)
 */
final class GetYearResidentControllerTest extends TestCase
{
    private function buildController(bool $grantDataAccess = false, bool $grantAdmin = false): GetYearResidentController
    {
        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            function (string $attribute) use ($grantDataAccess, $grantAdmin): bool {
                return match ($attribute) {
                    YearAccessVoter::DATA_ACCESS => $grantDataAccess,
                    YearAccessVoter::ADMIN       => $grantAdmin,
                    default                      => false,
                };
            }
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

    private function repo(?Years $year): YearsRepository
    {
        $repo = $this->createMock(YearsRepository::class);
        $repo->method('findOneBy')->willReturn($year);
        return $repo;
    }

    private function emptyYear(): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getResidents')->willReturn(new ArrayCollection([]));
        return $year;
    }

    // ── Tests ──────────────────────────────────────────────────────────────────

    public function testYearNotFoundThrows404(): void
    {
        $this->expectException(NotFoundHttpException::class);
        $this->buildController()->getList(999, $this->repo(null));
    }

    public function testAccessDeniedReturns403(): void
    {
        $response = $this->buildController(grantDataAccess: false, grantAdmin: false)->getList(
            107,
            $this->repo($this->emptyYear()),
        );
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testDataAccessGrantedReturns200WithResidentsList(): void
    {
        $response = $this->buildController(grantDataAccess: true)->getList(
            107,
            $this->repo($this->emptyYear()),
        );
        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('residents', $data);
        $this->assertSame([], $data['residents']);
    }

    public function testAdminGrantedReturns200(): void
    {
        $response = $this->buildController(grantDataAccess: false, grantAdmin: true)->getList(
            107,
            $this->repo($this->emptyYear()),
        );
        $this->assertSame(200, $response->getStatusCode());
    }
}
