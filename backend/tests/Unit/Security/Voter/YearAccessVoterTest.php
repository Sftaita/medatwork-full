<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security\Voter;

use App\Entity\Hospital;
use App\Entity\HospitalAdmin;
use App\Entity\Manager;
use App\Entity\ManagerYears;
use App\Entity\Years;
use App\Repository\ManagerYearsRepository;
use App\Security\Voter\YearAccessVoter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

/**
 * Couverture :
 *  — HospitalAdmin même hôpital          → ACCESS_GRANTED
 *  — HospitalAdmin hôpital différent     → ACCESS_DENIED
 *  — Manager promu hospital_admin        → ACCESS_GRANTED si même hôpital
 *  — Manager avec ManagerYears + dataAccess=true → ACCESS_GRANTED sur DATA_ACCESS
 *  — Manager avec ManagerYears + admin=true      → ACCESS_GRANTED sur ADMIN
 *  — Manager sans ManagerYears           → ACCESS_DENIED
 *  — Manager dataAccess=false, admin=false → ACCESS_DENIED
 */
final class YearAccessVoterTest extends TestCase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private function token(object $user): TokenInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);
        return $token;
    }

    private function hospital(int $id): Hospital
    {
        $h = $this->createMock(Hospital::class);
        $h->method('getId')->willReturn($id);
        return $h;
    }

    private function year(int $hospitalId): Years
    {
        $y = $this->createMock(Years::class);
        $y->method('getHospital')->willReturn($this->hospital($hospitalId));
        return $y;
    }

    private function hospitalAdmin(int $hospitalId): HospitalAdmin
    {
        $a = $this->createMock(HospitalAdmin::class);
        $a->method('getHospital')->willReturn($this->hospital($hospitalId));
        return $a;
    }

    private function manager(?Hospital $adminHospital = null): Manager
    {
        $m = $this->createMock(Manager::class);
        $m->method('getAdminHospital')->willReturn($adminHospital);
        return $m;
    }

    private function relation(bool $dataAccess, bool $admin): ManagerYears
    {
        $rel = $this->createMock(ManagerYears::class);
        $rel->method('getDataAccess')->willReturn($dataAccess);
        $rel->method('getAdmin')->willReturn($admin);
        $rel->method('getDataValidation')->willReturn(false);
        $rel->method('getDataDownload')->willReturn(false);
        $rel->method('getCanManageAgenda')->willReturn(false);
        $rel->method('getHasAgendaAccess')->willReturn(false);
        return $rel;
    }

    private function voter(?ManagerYears $relation = null): YearAccessVoter
    {
        $repo = $this->createMock(ManagerYearsRepository::class);
        $repo->method('findOneBy')->willReturn($relation);
        return new YearAccessVoter($repo);
    }

    // ── HospitalAdmin (entité HospitalAdmin) ──────────────────────────────────

    public function testHospitalAdminSameHospitalIsGranted(): void
    {
        $result = $this->voter()->vote(
            $this->token($this->hospitalAdmin(5)),
            $this->year(5),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testHospitalAdminDifferentHospitalIsDenied(): void
    {
        $result = $this->voter()->vote(
            $this->token($this->hospitalAdmin(5)),
            $this->year(99),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    // ── Manager promu hospital_admin (Manager::adminHospital !== null) ─────────

    public function testManagerPromotedSameHospitalIsGranted(): void
    {
        $result = $this->voter()->vote(
            $this->token($this->manager(adminHospital: $this->hospital(5))),
            $this->year(5),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testManagerPromotedDifferentHospitalIsDenied(): void
    {
        $result = $this->voter()->vote(
            $this->token($this->manager(adminHospital: $this->hospital(5))),
            $this->year(99),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    // ── Manager classique ─────────────────────────────────────────────────────

    public function testManagerWithDataAccessIsGranted(): void
    {
        $result = $this->voter($this->relation(dataAccess: true, admin: false))->vote(
            $this->token($this->manager()),
            $this->year(5),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testManagerWithAdminFlagIsGrantedOnAdminAttribute(): void
    {
        $result = $this->voter($this->relation(dataAccess: false, admin: true))->vote(
            $this->token($this->manager()),
            $this->year(5),
            [YearAccessVoter::ADMIN],
        );
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testManagerWithoutRelationIsDenied(): void
    {
        $result = $this->voter(null)->vote(
            $this->token($this->manager()),
            $this->year(5),
            [YearAccessVoter::DATA_ACCESS],
        );
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testManagerWithNoFlagsIsDeniedOnBothAttributes(): void
    {
        $voter = $this->voter($this->relation(dataAccess: false, admin: false));
        $token = $this->token($this->manager());
        $year  = $this->year(5);

        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote($token, $year, [YearAccessVoter::DATA_ACCESS]));
        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote($token, $year, [YearAccessVoter::ADMIN]));
    }
}
