<?php

declare(strict_types=1);

namespace App\Tests\Unit\Util;

use App\Util\FrenchMonths;
use PHPUnit\Framework\TestCase;

class FrenchMonthsTest extends TestCase
{
    /** @dataProvider validMonthProvider */
    public function testNameReturnsCorrectFrenchName(int $month, string $expected): void
    {
        $this->assertSame($expected, FrenchMonths::name($month));
    }

    /** @return array<string, array{int, string}> */
    public static function validMonthProvider(): array
    {
        return [
            'janvier'   => [1,  'Janvier'],
            'février'   => [2,  'Février'],
            'mars'      => [3,  'Mars'],
            'avril'     => [4,  'Avril'],
            'mai'       => [5,  'Mai'],
            'juin'      => [6,  'Juin'],
            'juillet'   => [7,  'Juillet'],
            'août'      => [8,  'Août'],
            'septembre' => [9,  'Septembre'],
            'octobre'   => [10, 'Octobre'],
            'novembre'  => [11, 'Novembre'],
            'décembre'  => [12, 'Décembre'],
        ];
    }

    public function testNameThrowsOnZero(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        FrenchMonths::name(0);
    }

    public function testNameThrowsOnThirteen(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        FrenchMonths::name(13);
    }

    public function testNameThrowsOnNegative(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        FrenchMonths::name(-1);
    }
}
