<?php

declare(strict_types=1);

namespace App\Services\Utils;

class EmailValidation
{
    /**
     * Check correct email format
     *
     * @return boolean TRUE: Valid Email, FALSE: Invalid Email
     */
    public function verify(string $email): bool
    {
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return true;
        } else {
            return false;
        }
    }
}
