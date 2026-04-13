<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\Security\Core\Exception\AccountStatusException;

class AccountDisabledException extends AccountStatusException
{
    private string $customMessage;

    public function __construct(string $message = "Votre compte doit d'abord être validé par email")
    {
        parent::__construct($message);
        $this->customMessage = $message;
    }

    public function getMessageKey(): string
    {
        return $this->customMessage;
    }
}
