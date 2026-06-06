import { describe, it, expect } from "vitest";
import { computeAcademicPeriod } from "./academicPeriod";

describe("computeAcademicPeriod", () => {
  // ── Empty / null guards ─────────────────────────────────────────────────────
  it("returns '' when start is empty", () => {
    expect(computeAcademicPeriod("", "2026-10-25")).toBe("");
  });

  it("returns '' when end is empty", () => {
    expect(computeAcademicPeriod("2026-06-05", "")).toBe("");
  });

  it("returns '' when both are null", () => {
    expect(computeAcademicPeriod(null, null)).toBe("");
  });

  // ── Different civil years → raw years ───────────────────────────────────────
  it("Oct 2026 → Sep 2027 (cross-year standard) → 2026-2027", () => {
    expect(computeAcademicPeriod("2026-10-01", "2027-09-30")).toBe("2026-2027");
  });

  it("Jul 2026 → Jun 2027 (cross-year) → 2026-2027", () => {
    expect(computeAcademicPeriod("2026-07-01", "2027-06-30")).toBe("2026-2027");
  });

  it("Sep 2025 → Aug 2026 (cross-year) → 2025-2026", () => {
    expect(computeAcademicPeriod("2025-09-01", "2026-08-31")).toBe("2025-2026");
  });

  // ── Same civil year, start BEFORE Oct 1 → {year-1}-{year} ──────────────────
  it("05/06/2026 → 25/10/2026 → 2025-2026 (Jun < Oct)", () => {
    expect(computeAcademicPeriod("2026-06-05", "2026-10-25")).toBe("2025-2026");
  });

  it("30/09/2026 → 05/10/2026 → 2025-2026 (Sep 30 < Oct 1)", () => {
    expect(computeAcademicPeriod("2026-09-30", "2026-10-05")).toBe("2025-2026");
  });

  it("01/01/2026 → 31/12/2026 → 2025-2026 (Jan < Oct)", () => {
    expect(computeAcademicPeriod("2026-01-01", "2026-12-31")).toBe("2025-2026");
  });

  // ── Same civil year, start ON Oct 1 (boundary) → {year}-{year+1} ───────────
  it("01/10/2026 → 25/10/2026 → 2026-2027 (Oct 1 = on boundary)", () => {
    expect(computeAcademicPeriod("2026-10-01", "2026-10-25")).toBe("2026-2027");
  });

  // ── Same civil year, start AFTER Oct 1 → {year}-{year+1} ───────────────────
  it("15/10/2026 → 31/12/2026 → 2026-2027 (Oct 15 > Oct 1)", () => {
    expect(computeAcademicPeriod("2026-10-15", "2026-12-31")).toBe("2026-2027");
  });

  it("01/12/2026 → 31/12/2026 → 2026-2027 (Dec > Oct 1)", () => {
    expect(computeAcademicPeriod("2026-12-01", "2026-12-31")).toBe("2026-2027");
  });
});
