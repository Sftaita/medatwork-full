import { describe, it, expect } from "vitest";
import dayjs from "../lib/dayjs";

// ── UTC plugin ────────────────────────────────────────────────────────────────

describe("dayjs — utc plugin", () => {
  it("dayjs.utc() parses a UTC ISO string preserving hours", () => {
    const d = dayjs.utc("2024-06-15T10:30:00Z");
    expect(d.hour()).toBe(10);
    expect(d.minute()).toBe(30);
  });

  it(".utc() flag is true on a UTC instance", () => {
    const d = dayjs.utc("2024-06-15T10:00:00Z");
    expect(d.isUTC()).toBe(true);
  });

  it(".local() converts back to local mode", () => {
    const d = dayjs.utc("2024-06-15T10:00:00Z").local();
    expect(d.isUTC()).toBe(false);
  });
});

// ── customParseFormat plugin ──────────────────────────────────────────────────

describe("dayjs — customParseFormat plugin", () => {
  it('parses "DD/MM/YYYY" format correctly', () => {
    const d = dayjs("15/01/2024", "DD/MM/YYYY");
    expect(d.date()).toBe(15);
    expect(d.month()).toBe(0); // January = 0
    expect(d.year()).toBe(2024);
  });

  it('parses "HH:mm" time format', () => {
    const d = dayjs("14:30", "HH:mm");
    expect(d.hour()).toBe(14);
    expect(d.minute()).toBe(30);
  });

  it("returns invalid dayjs for a mismatched format", () => {
    const d = dayjs("not-a-date", "DD/MM/YYYY");
    expect(d.isValid()).toBe(false);
  });
});

// ── isBetween plugin ──────────────────────────────────────────────────────────

describe("dayjs — isBetween plugin", () => {
  const start = dayjs("2024-01-01");
  const end = dayjs("2024-12-31");

  it("returns true for a date strictly between start and end", () => {
    expect(dayjs("2024-06-15").isBetween(start, end)).toBe(true);
  });

  it("returns false for a date before start", () => {
    expect(dayjs("2023-12-31").isBetween(start, end)).toBe(false);
  });

  it("returns false for a date after end", () => {
    expect(dayjs("2025-01-01").isBetween(start, end)).toBe(false);
  });

  it('returns true for start boundary with "[]" inclusivity', () => {
    expect(dayjs("2024-01-01").isBetween(start, end, "day", "[]")).toBe(true);
  });
});

// ── relativeTime plugin ───────────────────────────────────────────────────────

describe("dayjs — relativeTime plugin", () => {
  it(".fromNow() returns a non-empty string", () => {
    const result = dayjs().subtract(1, "hour").fromNow();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it(".from(reference) returns a relative string", () => {
    const past = dayjs().subtract(2, "days");
    const result = past.from(dayjs());
    expect(typeof result).toBe("string");
  });
});

// ── French locale ─────────────────────────────────────────────────────────────

describe("dayjs — French locale", () => {
  it("formats month names in French when locale is fr", () => {
    const january = dayjs("2024-01-01").locale("fr").format("MMMM");
    expect(january.toLowerCase()).toBe("janvier");
  });

  it("formats day names in French when locale is fr", () => {
    // 2024-01-01 is a Monday
    const day = dayjs("2024-01-01").locale("fr").format("dddd");
    expect(day.toLowerCase()).toBe("lundi");
  });
});
