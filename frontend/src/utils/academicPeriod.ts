/**
 * Compute the academic-period string from two ISO date strings.
 *
 * Rule:
 *  - Different civil years  → "${startYear}-${endYear}"
 *  - Same civil year        → academic bascule at October 1
 *      start before Oct 1   → "${year-1}-${year}"
 *      start on/after Oct 1 → "${year}-${year+1}"
 *
 * Returns "" when either argument is falsy.
 *
 * Examples:
 *   "2026-06-05" / "2026-10-25"  →  "2025-2026"
 *   "2026-09-30" / "2026-10-05"  →  "2025-2026"
 *   "2026-10-01" / "2026-10-25"  →  "2026-2027"
 *   "2026-10-01" / "2027-09-30"  →  "2026-2027"
 */
export function computeAcademicPeriod(
  dateOfStart: string | null | undefined,
  dateOfEnd:   string | null | undefined,
): string {
  if (!dateOfStart || !dateOfEnd) return "";

  const start     = new Date(dateOfStart);
  const end       = new Date(dateOfEnd);
  const startYear = start.getFullYear();
  const endYear   = end.getFullYear();

  if (startYear !== endYear) {
    return `${startYear}-${endYear}`;
  }

  // Same civil year: bascule académique au 1er octobre
  const startMonth = start.getMonth() + 1; // 1-indexed
  if (startMonth < 10) {
    return `${startYear - 1}-${startYear}`;
  }
  return `${startYear}-${startYear + 1}`;
}
