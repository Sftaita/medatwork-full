<?php

declare(strict_types=1);

namespace App\Compliance\DTO;

use App\Compliance\Enum\ComplianceIssueType;
use App\Compliance\Enum\ComplianceSeverity;

/**
 * Describes a single compliance violation or warning detected by a checker.
 */
final class ComplianceIssue
{
    public function __construct(
        public readonly ComplianceIssueType $type,
        public readonly ComplianceSeverity $severity,
        /** ISO-8601 date of the Monday of the offending week, e.g. "2026-03-23" */
        public readonly string $weekStart,
        /** Human-readable description (French) */
        public readonly string $description,
        /** Structured context for persistence and API serialization */
        public readonly array $context = [],
    ) {
    }
}
