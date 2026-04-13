<?php

declare(strict_types=1);

namespace App\Enum;

enum YearStatus: string
{
    case Draft    = 'draft';     // En préparation — pas encore ouverte aux inscriptions
    case Active   = 'active';    // Ouverte — accepte résidents/managers/planning
    case Closed   = 'closed';    // Fermée aux inscriptions — validations actives
    case Archived = 'archived';  // Lecture seule — cycle terminé
}
