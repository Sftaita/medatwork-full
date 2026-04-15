import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HoursCircle from "./HoursCircle";

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("HoursCircle", () => {
  it("renders 'Total semaine' label", () => {
    render(<HoursCircle hours={40} minutes={0} />);
    expect(screen.getByText("Total semaine")).toBeInTheDocument();
  });

  it("with hours=80 minutes=0 (> 72h limit), completedPercentage is capped at 100", () => {
    const { container } = render(<HoursCircle hours={80} minutes={0} />);

    // CircularProgress with variant="determinate" renders an svg with aria-valuenow
    // The filled progress circle should have value capped at 100
    const progressElements = container.querySelectorAll('[role="progressbar"]');

    // Find the circle that represents progress (not the background 100% one)
    // The one with value=completedPercentage should be ≤ 100
    const valueNowAttributes = Array.from(progressElements)
      .map((el) => parseFloat(el.getAttribute("aria-valuenow") ?? "0"))
      .filter((v) => !isNaN(v));

    expect(valueNowAttributes.length).toBeGreaterThan(0);

    // All values should be ≤ 100 (capped)
    valueNowAttributes.forEach((v) => {
      expect(v).toBeLessThanOrEqual(100);
    });

    // At least one should equal 100 (the capped one)
    expect(valueNowAttributes.some((v) => v === 100)).toBe(true);
  });
});
