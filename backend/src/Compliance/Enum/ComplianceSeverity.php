<?php

declare(strict_types=1);

namespace App\Compliance\Enum;

enum ComplianceSeverity: string
{
    /** Threshold exceeded but still within the legal limit — requires attention */
    case Warning  = 'warning';

    /** Legal limit exceeded — action required */
    case Critical = 'critical';
}
