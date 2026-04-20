<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Security\Voter\YearAccessVoter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Unit tests for YearAccessVoter
 *
 * Covers:
 * - Manager with access grants each attribute
 * - Manager without ManagerYears row is denied
 * - Manager with attribute flag=false is denied for that attribute
 * - HospitalAdmin is granted for years in their hospital (all attributes)
 * - HospitalAdmin is denied for years in another hospital
 * - Unknown user type is denied
 */
final class YearAccessVoterTest extends TestCase
{
    private ManagerYearsRepository $managerYearsRepo;

    protected function setUp(): void
    {
        $this->managerYearsRepo = $this->createMock(ManagerYearsRepository::class);
    }

    private function buildVoter(): YearAccessVoter
    {
        return new YearAccessVoter($this->managerYearsRepo);
    }

    private function makeToken(object $user): TokenInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        return $token;
    }

    private function makeHospital(int $id): Hospital
    {
        $hospital = $this->createMock(Hospital::class);
        $hospital->method('getId')->willReturn($id);

        return $hospital;
    }

    private function makeYear(?Hospital $hospital = null): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getHospital')->willReturn($hospital);

        return $year;
    }

    // ── HospitalAdmin ─────────────────────────────────────────────────────────

    public function testHospitalAdminIsGrantedForYearInTheirHospital(): void
    {
        $hospital = $this->makeHospital(1);
        $year     = $this->makeYear($hospital);

        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospital);

        $voter = $this->buildVoter();

        foreach (YearAccessVoter::SUPPORTED_ATTRIBUTES as $attribute) {
            $result = $voter->vote($this->makeToken($admin), $year, [$attribute]);
            $this->assertSame(1, $result, "HospitalAdmin should be GRANTED for {$attribute}");
        }
    }

    public function testHospitalAdminIsDeniedForYearInAnotherHospital(): void
    {
        $hospitalA = $this->makeHospital(1);
        $hospitalB = $this->makeHospital(2);
        $year      = $this->makeYear($hospitalB);

        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($hospitalA);

        $voter = $this->buildVoter();

        foreach (YearAccessVoter::SUPPORTED_ATTRIBUTES as $attribute) {
            $result = $voter->vote($this->makeToken($admin), $year, [$attribute]);
            $this->assertSame(-1, $result, "HospitalAdmin should be DENIED for year in another hospital ({$attribute})");
        }
    }

    public function testHospitalAdminIsDeniedWhenYearHasNoHospital(): void
    {
        $year  = $this->makeYear(null);
        $admin = $this->createMock(HospitalAdmin::class);
        $admin->method('getHospital')->willReturn($this->makeHospital(1));

        $result = $this->buildVoter()->vote($this->makeToken($admin), $year, [YearAccessVoter::MANAGE_AGENDA]);
        $this->assertSame(-1, $result);
    }

    // ── Manager ───────────────────────────────────────────────────────────────

    public function testManagerWithDataAccessGranted(): void
    {
        $manager  = $this->createMock(Manager::class);
        $year     = $this->makeYear();
        $relation = $this->createMock(ManagerYears::class);
        $relation->method('getDataAccess')->willReturn(true);
        $relation->method('getDataValidation')->willReturn(false);
        $relation->method('getDataDownload')->willReturn(false);
        $relation->method('getCanManageAgenda')->willReturn(false);
        $relation->method('getHasAgendaAccess')->willReturn(false);
        $relation->method('getAdmin')->willReturn(false);

        $this->managerYearsRepo->method('findOneBy')->willReturn($relation);

        $voter  = $this->buildVoter();
        $result = $voter->vote($this->makeToken($manager), $year, [YearAccessVoter::DATA_ACCESS]);
        $this->assertSame(1, $result);
    }

    public function testManagerWithDataAccessFalseIsDenied(): void
    {
        $manager  = $this->createMock(Manager::class);
        $year     = $this->makeYear();
        $relation = $this->createMock(ManagerYears::class);
        $relation->method('getDataAccess')->willReturn(false);
        $relation->method('getDataValidation')->willReturn(false);
        $relation->method('getDataDownload')->willReturn(false);
        $relation->method('getCanManageAgenda')->willReturn(false);
        $relation->method('getHasAgendaAccess')->willReturn(false);
        $relation->method('getAdmin')->willReturn(false);

        $this->managerYearsRepo->method('findOneBy')->willReturn($relation);

        $voter  = $this->buildVoter();
        $result = $voter->vote($this->makeToken($manager), $year, [YearAccessVoter::DATA_ACCESS]);
        $this->assertSame(-1, $result);
    }

    public function testManagerWithNoRelationIsDenied(): void
    {
        $manager = $this->createMock(Manager::class);
        $year    = $this->makeYear();

        $this->managerYearsRepo->method('findOneBy')->willReturn(null);

        $voter  = $this->buildVoter();
        $result = $voter->vote($this->makeToken($manager), $year, [YearAccessVoter::MANAGE_AGENDA]);
        $this->assertSame(-1, $result);
    }

    public function testManagerWithManageAgendaGranted(): void
    {
        $manager  = $this->createMock(Manager::class);
        $year     = $this->makeYear();
        $relation = $this->createMock(ManagerYears::class);
        $relation->method('getDataAccess')->willReturn(false);
        $relation->method('getDataValidation')->willReturn(false);
        $relation->method('getDataDownload')->willReturn(false);
        $relation->method('getCanManageAgenda')->willReturn(true);
        $relation->method('getHasAgendaAccess')->willReturn(false);
        $relation->method('getAdmin')->willReturn(false);

        $this->managerYearsRepo->method('findOneBy')->willReturn($relation);

        $voter  = $this->buildVoter();
        $result = $voter->vote($this->makeToken($manager), $year, [YearAccessVoter::MANAGE_AGENDA]);
        $this->assertSame(1, $result);
    }

    // ── Unknown user (implements UserInterface but is neither Manager nor HospitalAdmin) ──

    public function testUnknownUserTypeIsDenied(): void
    {
        // Use a mock of UserInterface — not a Manager, not a HospitalAdmin
        $unknownUser = $this->createMock(\Symfony\Component\Security\Core\User\UserInterface::class);
        $year        = $this->makeYear($this->makeHospital(1));

        $result = $this->buildVoter()->vote($this->makeToken($unknownUser), $year, [YearAccessVoter::DATA_ACCESS]);
        $this->assertSame(-1, $result);
    }

    // ── Unsupported attribute → abstain ───────────────────────────────────────

    public function testUnsupportedAttributeAbstains(): void
    {
        $manager = $this->createMock(Manager::class);
        $year    = $this->makeYear();

        $result = $this->buildVoter()->vote($this->makeToken($manager), $year, ['unsupported_attribute']);
        $this->assertSame(0, $result);
    }
}
