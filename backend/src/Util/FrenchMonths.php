<?php

declare(strict_types=1);

namespace App\Util;

final class FrenchMonths
{
    private const NAMES = [
        1  => 'Janvier',
        2  => 'Février',
        3  => 'Mars',
        4  => 'Avril',
        5  => 'Mai',
        6  => 'Juin',
        7  => 'Juillet',
        8  => 'Août',
        9  => 'Septembre',
        10 => 'Octobre',
        11 => 'Novembre',
        12 => 'Décembre',
    ];

    /**
     * Returns the French name for a month number (1–12).
     *
     * @throws \InvalidArgumentException if the month number is out of range
     */
    public static function name(int $month): string
    {
        if (! isset(self::NAMES[$month])) {
            throw new \InvalidArgumentException(
                sprintf('Invalid month number: %d. Expected 1–12.', $month)
            );
        }

        return self::NAMES[$month];
    }
}
