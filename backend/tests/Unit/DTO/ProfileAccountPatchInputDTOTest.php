<?php

declare(strict_types=1);

namespace App\Tests\Unit\DTO;

use App\DTO\ProfileAccountPatchInputDTO;
use App\Enum\Sexe;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class ProfileAccountPatchInputDTOTest extends TestCase
{
    private static function req(array $body, string $role = 'manager'): ProfileAccountPatchInputDTO
    {
        $request = new Request([], [], [], [], [], [], json_encode($body));
        return ProfileAccountPatchInputDTO::fromRequest($request, $role);
    }

    // ── Common fields ─────────────────────────────────────────────────────────

    public function testAcceptsFirstname(): void
    {
        $dto = self::req(['firstname' => 'Alice']);
        $this->assertSame('Alice', $dto->firstname);
        $this->assertTrue($dto->has('firstname'));
    }

    public function testAcceptsLastname(): void
    {
        $dto = self::req(['lastname' => 'Dupont']);
        $this->assertSame('Dupont', $dto->lastname);
        $this->assertTrue($dto->has('lastname'));
    }

    public function testTrimFirstname(): void
    {
        $dto = self::req(['firstname' => '  Bob  ']);
        $this->assertSame('Bob', $dto->firstname);
    }

    public function testRejectsTooShortFirstname(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/prénom.*minimum/');
        self::req(['firstname' => 'A']);
    }

    public function testRejectsTooLongFirstname(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/trop long/');
        self::req(['firstname' => str_repeat('A', 51)]);
    }

    public function testRejectsTooLongLastname(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req(['lastname' => str_repeat('Z', 71)]);
    }

    // ── sexe ──────────────────────────────────────────────────────────────────

    public function testAcceptsSexeMale(): void
    {
        $dto = self::req(['sexe' => 'male']);
        $this->assertSame(Sexe::Male, $dto->sexe);
        $this->assertTrue($dto->has('sexe'));
    }

    public function testAcceptsSexeFemale(): void
    {
        $dto = self::req(['sexe' => 'female']);
        $this->assertSame(Sexe::Female, $dto->sexe);
    }

    public function testRejectsInvalidSexe(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/sexe doit être/');
        self::req(['sexe' => 'other']);
    }

    // ── job (manager) ─────────────────────────────────────────────────────────

    public function testAcceptsValidJob(): void
    {
        $dto = self::req(['job' => 'human resources'], 'manager');
        $this->assertSame('human resources', $dto->job);
        $this->assertTrue($dto->has('job'));
    }

    public function testAcceptsNullJob(): void
    {
        $dto = self::req(['job' => null], 'manager');
        $this->assertNull($dto->job);
        $this->assertTrue($dto->has('job'));
    }

    public function testRejectsInvalidJob(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/job invalide/');
        self::req(['job' => 'janitor'], 'manager');
    }

    public function testRejectsJobForResident(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Champs non autorisés/');
        self::req(['job' => 'doctor'], 'resident');
    }

    // ── resident fields ───────────────────────────────────────────────────────

    public function testAcceptsSpeciality(): void
    {
        $dto = self::req(['speciality' => 'Cardiologie'], 'resident');
        $this->assertSame('Cardiologie', $dto->speciality);
        $this->assertTrue($dto->has('speciality'));
    }

    public function testAcceptsNullSpeciality(): void
    {
        $dto = self::req(['speciality' => null], 'resident');
        $this->assertNull($dto->speciality);
        $this->assertTrue($dto->has('speciality'));
    }

    public function testAcceptsEmptyStringSpecialityAsNull(): void
    {
        $dto = self::req(['speciality' => ''], 'resident');
        $this->assertNull($dto->speciality);
    }

    public function testRejectsTooLongSpeciality(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req(['speciality' => str_repeat('X', 101)], 'resident');
    }

    public function testAcceptsDateOfMaster(): void
    {
        $dto = self::req(['dateOfMaster' => '2024-06-30'], 'resident');
        $this->assertSame('2024-06-30', $dto->dateOfMaster);
        $this->assertTrue($dto->has('dateOfMaster'));
    }

    public function testAcceptsNullDateOfMaster(): void
    {
        $dto = self::req(['dateOfMaster' => null], 'resident');
        $this->assertNull($dto->dateOfMaster);
        $this->assertTrue($dto->has('dateOfMaster'));
    }

    public function testRejectsInvalidDateFormat(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/YYYY-MM-DD/');
        self::req(['dateOfMaster' => '30-06-2024'], 'resident');
    }

    public function testRejectsResidentFieldsForManager(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Champs non autorisés/');
        self::req(['speciality' => 'Cardio'], 'manager');
    }

    // ── Security — unknown keys ───────────────────────────────────────────────

    public function testRejectsUnknownTopLevelKeys(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Champs non autorisés/');
        self::req(['email' => 'hack@example.com', 'firstname' => 'Alice']);
    }

    public function testRejectsRolesField(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        self::req(['roles' => ['ROLE_SUPER_ADMIN'], 'firstname' => 'Alice']);
    }

    public function testRejectsEmptyBody(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/invalide ou vide/');
        $request = new Request([], [], [], [], [], [], '{}');
        ProfileAccountPatchInputDTO::fromRequest($request, 'manager');
    }

    public function testRejectsSpecialityForAppAdmin(): void
    {
        // app_admin only allows firstname and lastname
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Champs non autorisés/');
        $request = new Request([], [], [], [], [], [], json_encode(['speciality' => 'X']));
        ProfileAccountPatchInputDTO::fromRequest($request, 'app_admin');
    }

    // ── has() helper ──────────────────────────────────────────────────────────

    public function testHasReturnsFalseForAbsentField(): void
    {
        $dto = self::req(['firstname' => 'Alice']);
        $this->assertFalse($dto->has('lastname'));
        $this->assertFalse($dto->has('sexe'));
    }

    // ── Combined patch ────────────────────────────────────────────────────────

    public function testResidentCombinedPatch(): void
    {
        $dto = self::req([
            'firstname'    => 'Marie',
            'lastname'     => 'Curie',
            'sexe'         => 'female',
            'speciality'   => 'Oncologie',
            'university'   => 'UCLouvain',
            'dateOfMaster' => '2022-09-01',
        ], 'resident');

        $this->assertSame('Marie', $dto->firstname);
        $this->assertSame('Curie', $dto->lastname);
        $this->assertSame(Sexe::Female, $dto->sexe);
        $this->assertSame('Oncologie', $dto->speciality);
        $this->assertSame('UCLouvain', $dto->university);
        $this->assertSame('2022-09-01', $dto->dateOfMaster);
        $this->assertCount(6, $dto->provided);
    }
}
