import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VisualTimeline from "./VisualTimeline";

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TASKS = [
  {
    id: 1,
    title: "Consultation matin",
    description: "",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "10:00",
    weekTemplateId: 42,
  },
  {
    id: 2,
    title: "Réunion équipe",
    description: "",
    dayOfWeek: 3,
    startTime: "14:00",
    endTime: "15:00",
    weekTemplateId: 42,
  },
];

const DEFAULT_PROPS = {
  color: "#56ca00",
  onTaskClick: vi.fn(),
  selectedDay: 1,
  onDaySelect: vi.fn(),
  onDropToDay: vi.fn(),
};

// In jsdom, clientWidth = 0, so useLayoutEffect skips measurement and
// pxPerMin stays at the FALLBACK_PPM value (1.5 px/min).
const FALLBACK_PPM   = 1.5;
const START_MINUTES  = 6 * 60; // 360

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("VisualTimeline (horizontal)", () => {
  it("renders all seven day labels", () => {
    render(<VisualTimeline tasks={[]} {...DEFAULT_PROPS} />);
    ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it("renders task titles", () => {
    render(<VisualTimeline tasks={TASKS} {...DEFAULT_PROPS} />);
    expect(screen.getByText("Consultation matin")).toBeInTheDocument();
    expect(screen.getByText("Réunion équipe")).toBeInTheDocument();
  });

  it("task block at 08:00 has positive left value (> 0 since 08:00 > 06:00)", () => {
    const { container } = render(
      <VisualTimeline tasks={[TASKS[0]]} {...DEFAULT_PROPS} />
    );

    // 08:00 = 480 min; clampedStart = max(480, 360) = 480
    // leftPx = (480 - 360) * FALLBACK_PPM = 120 * 1.5 = 180
    const expectedLeft = (8 * 60 - START_MINUTES) * FALLBACK_PPM; // 180

    const absoluteEls = container.querySelectorAll('[style*="position: absolute"]');
    const taskBlocks  = Array.from(absoluteEls).filter((el) => {
      const left = parseFloat((el as HTMLElement).style.left);
      return !isNaN(left) && left > 0;
    });

    expect(taskBlocks.length).toBeGreaterThan(0);
    const hasCorrectLeft = taskBlocks.some(
      (el) => parseFloat((el as HTMLElement).style.left) === expectedLeft,
    );
    expect(hasCorrectLeft).toBe(true);
  });

  it("task on day 3 (Mercredi) is in the timeline for that day", () => {
    render(<VisualTimeline tasks={[TASKS[1]]} {...DEFAULT_PROPS} />);
    expect(screen.getByText("Réunion équipe")).toBeInTheDocument();
  });

  it("renders no task blocks when tasks array is empty", () => {
    const { container } = render(<VisualTimeline tasks={[]} {...DEFAULT_PROPS} />);
    const draggable = container.querySelectorAll("[draggable]");
    expect(draggable.length).toBe(0);
  });
});
