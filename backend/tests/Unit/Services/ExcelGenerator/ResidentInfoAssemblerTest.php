<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\ExcelGenerator;

use App\Entity\Resident;
use App\Entity\Years;
use App\Entity\YearsResident;
use App\Services\ExcelGenerator\ResidentInfoAssembler;
use App\Services\Utils\Dictionary;
use DateTime;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ResidentInfoAssembler.
 *
 * Covers:
 * - optingOut = true  → 'Oui'
 * - optingOut = false → 'Non'
 * - optingOut = null  → 'Non renseigné'
 * - fullName uses ucwords(lastname + ' ' + firstname)
 * - speciality delegated to Dictionary::translateSpeciality
 * - serviceSpeciality delegated to Dictionary::translateSpeciality for year
 * - yearOfFormation is integer (years elapsed since dateOfMaster)
 */
final class ResidentInfoAssemblerTest extends TestCase
{
    private Dictionary $dictionary;
    private ResidentInfoAssembler $assembler;

    protected function setUp(): void
    {
        $this->dictionary = $this->createMock(Dictionary::class);
        $this->assembler  = new ResidentInfoAssembler($this->dictionary);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Build a stub Resident. */
    private function makeResident(string $lastname, string $firstname, string $speciality, DateTime $masterDate): Resident
    {
        $resident = $this->createMock(Resident::class);
        $resident->method('getLastname')->willReturn($lastname);
        $resident->method('getFirstname')->willReturn($firstname);
        $resident->method('getSpeciality')->willReturn($speciality);
        $resident->method('getDateOfMaster')->willReturn($masterDate);
        return $resident;
    }

    /** Build a stub Years. */
    private function makeYear(string $speciality): Years
    {
        $year = $this->createMock(Years::class);
        $year->method('getSpeciality')->willReturn($speciality);
        return $year;
    }

    /** Build a stub YearsResident. */
    private function makeYearResident(?bool $optingOut): YearsResident
    {
        $yr = $this->createMock(YearsResident::class);
        $yr->method('getOptingOut')->willReturn($optingOut);
        return $yr;
    }

    // ── optingOut formatting ──────────────────────────────────────────────────

    public function testOptingOutTrueReturnsOui(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('dupont', 'jean', 'cardio', new DateTime('-5 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(true);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Oui', $result['optingOut']);
    }

    public function testOptingOutFalseReturnsNon(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('dupont', 'jean', 'cardio', new DateTime('-5 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(false);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Non', $result['optingOut']);
    }

    public function testOptingOutNullReturnsNonRenseigne(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('dupont', 'jean', 'cardio', new DateTime('-5 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(null);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Non renseigné', $result['optingOut']);
    }

    // ── fullName ──────────────────────────────────────────────────────────────

    public function testFullNameIsUcwordsLastnameSpaceFirstname(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('dupont', 'jean', 'cardio', new DateTime('-5 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(null);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Dupont Jean', $result['fullName']);
    }

    public function testFullNameAlreadyUppercasePreserved(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('MARTIN', 'ALICE', 'cardio', new DateTime('-3 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(false);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('MARTIN ALICE', $result['fullName']);
    }

    // ── speciality delegation ─────────────────────────────────────────────────

    public function testSpecialityDelegatedToDictionaryForResident(): void
    {
        $this->dictionary
            ->expects($this->atLeastOnce())
            ->method('translateSpeciality')
            ->with('cardiologie')
            ->willReturn('Cardiologie');

        $resident   = $this->makeResident('dupont', 'jean', 'cardiologie', new DateTime('-5 years'));
        $year       = $this->makeYear('cardiologie');
        $yearRes    = $this->makeYearResident(null);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Cardiologie', $result['speciality']);
    }

    public function testServiceSpecialityDelegatedToDictionaryForYear(): void
    {
        $this->dictionary
            ->method('translateSpeciality')
            ->willReturnMap([
                ['resident_spec', 'Spec Résident'],
                ['year_spec',     'Spec Année'],
            ]);

        $resident   = $this->makeResident('dupont', 'jean', 'resident_spec', new DateTime('-5 years'));
        $year       = $this->makeYear('year_spec');
        $yearRes    = $this->makeYearResident(false);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame('Spec Résident', $result['speciality']);
        $this->assertSame('Spec Année',    $result['serviceSpeciality']);
    }

    // ── yearOfFormation ───────────────────────────────────────────────────────

    public function testYearOfFormationIsIntegerYearsElapsed(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        // Master obtained exactly 3 years ago
        $masterDate = new DateTime('-3 years');
        $resident   = $this->makeResident('dupont', 'jean', 'cardio', $masterDate);
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(null);

        $result = $this->assembler->build($resident, $year, $yearRes);

        $this->assertSame(3, $result['yearOfFormation']);
    }

    public function testResultArrayHasAllRequiredKeys(): void
    {
        $this->dictionary->method('translateSpeciality')->willReturn('');

        $resident   = $this->makeResident('dupont', 'jean', 'cardio', new DateTime('-2 years'));
        $year       = $this->makeYear('cardio');
        $yearRes    = $this->makeYearResident(false);

        $result = $this->assembler->build($resident, $year, $yearRes);

        foreach (['fullName', 'speciality', 'serviceSpeciality', 'optingOut', 'yearOfFormation'] as $key) {
            $this->assertArrayHasKey($key, $result);
        }
    }
}
