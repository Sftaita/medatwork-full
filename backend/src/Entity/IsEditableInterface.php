<?php

declare(strict_types=1);

namespace App\Entity;

interface IsEditableInterface
{
    public function getIsEditable(): ?bool;

    public function setIsEditable(?bool $isEditable): static;
}
