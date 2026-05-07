<?php

declare(strict_types=1);

namespace App\Enum;

enum ManagerJob: string
{
    case MedicalSupervisor = 'medical supervisor';
    case HumanResources    = 'human resources';
    case Doctor            = 'doctor';

    public function label(): string
    {
        return match ($this) {
            self::MedicalSupervisor => 'Maître de stage',
            self::HumanResources    => 'Ressources humaines',
            self::Doctor            => 'Médecin',
        };
    }
}
