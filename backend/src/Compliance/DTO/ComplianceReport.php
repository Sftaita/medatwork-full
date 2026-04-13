<?php

declare(strict_types=1);

namespace App\Compliance\DTO;

/**
 * Aggregated compliance result for one resident over a given period.
 */
final class ComplianceReport
{
    /** @param ComplianceIssue[] $issues */
    public function __construct(
        public readonly int $residentId,
        public readonly string $periodStart,
        public readonly string $periodEnd,
        public readonly array $issues = [],
        public readonly bool $optingOut = false,
    ) {
    }

    public function hasIssues(): bool
    {
        return count($this->issues) > 0;
    }

    public function hasCriticalIssues(): bool
    {
        foreach ($this->issues as $issue) {
            if ($issue->severity->value === 'critical') {
                return true;
            }
        }

        return false;
    }

    /** @return ComplianceIssue[] */
    public function criticalIssues(): array
    {
        return array_values(array_filter(
            $this->issues,
            static fn (ComplianceIssue $i) => $i->severity->value === 'critical',
        ));
    }
}
