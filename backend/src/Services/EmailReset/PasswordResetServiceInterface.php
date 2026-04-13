<?php

declare(strict_types=1);

namespace App\Services\EmailReset;

interface PasswordResetServiceInterface
{
    public function requestReset(string $email): void;
}
