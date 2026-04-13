<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Utils;

use App\Services\Utils\Dictionary;
use PHPUnit\Framework\TestCase;

class DictionaryTest extends TestCase
{
    private Dictionary $dictionary;

    protected function setUp(): void
    {
        $this->dictionary = new Dictionary();
    }

    // ─── translateSpeciality ──────────────────────────────────────────────────

    public function testKnownSpecialityReturnsFullFrenchName(): void
    {
        $this->assertSame('Cardiologie', $this->dictionary->translateSpeciality('cardio'));
        $this->assertSame('Urgences', $this->dictionary->translateSpeciality('emergency'));
        $this->assertSame('Anesthésiologie', $this->dictionary->translateSpeciality('anesthesiology'));
        $this->assertSame('Neurologie', $this->dictionary->translateSpeciality('neurology'));
    }

    public function testUnknownSpecialityReturnsEmptyString(): void
    {
        $this->assertSame('', $this->dictionary->translateSpeciality('unknown'));
        $this->assertSame('', $this->dictionary->translateSpeciality(''));
        $this->assertSame('', $this->dictionary->translateSpeciality('CARDIO')); // case-sensitive
    }

    /** @dataProvider specialityProvider */
    public function testAllDefinedSpecialitiesReturnNonEmptyString(string $key): void
    {
        $result = $this->dictionary->translateSpeciality($key);

        $this->assertNotSame('', $result, "Expected non-empty translation for key '{$key}'");
    }

    /** @return array<string, array{string}> */
    public static function specialityProvider(): array
    {
        return [
            'anesthesiology'   => ['anesthesiology'],
            'cardio'           => ['cardio'],
            'dig'              => ['dig'],
            'general'          => ['general'],
            'maxillofacial'    => ['maxillofacial'],
            'ortho'            => ['ortho'],
            'plastic'          => ['plastic'],
            'thor'             => ['thor'],
            'vasc'             => ['vasc'],
            'dermatology'      => ['dermatology'],
            'endocrinology'    => ['endocrinology'],
            'gastro'           => ['gastro'],
            'geriatrics'       => ['geriatrics'],
            'gynaeco'          => ['gynaeco'],
            'haematology'      => ['haematology'],
            'infectiousDisease'=> ['infectiousDisease'],
            'internalMedecin'  => ['internalMedecin'],
            'rehab'            => ['rehab'],
            'nephrology'       => ['nephrology'],
            'neurosurgery'     => ['neurosurgery'],
            'neurology'        => ['neurology'],
            'oncology'         => ['oncology'],
            'ophthalmology'    => ['ophthalmology'],
            'otolaryngology'   => ['otolaryngology'],
            'pediatric'        => ['pediatric'],
            'pedopsychiatry'   => ['pedopsychiatry'],
            'pulmonology'      => ['pulmonology'],
            'psychiatry'       => ['psychiatry'],
            'radiology'        => ['radiology'],
            'rheumatology'     => ['rheumatology'],
            'intensiveCare'    => ['intensiveCare'],
            'palliative'       => ['palliative'],
            'emergency'        => ['emergency'],
            'uro'              => ['uro'],
        ];
    }
}
