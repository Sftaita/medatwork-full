<?php

declare(strict_types=1);

namespace App\Compliance\Enum;

enum ComplianceIssueType: string
{
    /** 13-week smoothed average exceeds warning threshold (48 h / 60 h with opting-out) */
    case SmoothedAverageWarning   = 'smoothed_average_warning';

    /** 13-week smoothed average exceeds legal limit (60 h / 72 h with opting-out) */
    case SmoothedAverageExceeded  = 'smoothed_average_exceeded';

    /** Single calendar week exceeds absolute limit (60 h / 72 h with opting-out) */
    case WeeklyAbsoluteLimitExceeded = 'weekly_absolute_limit_exceeded';

    /** A single shift exceeds 24 h (Art. 5 §2) */
    case MaxShiftDurationExceeded = 'max_shift_duration_exceeded';

    /** Less than 12 h of rest after a shift ≥ 12 h (Art. 5 §3) */
    case MinimumRestViolated      = 'minimum_rest_violated';
}
