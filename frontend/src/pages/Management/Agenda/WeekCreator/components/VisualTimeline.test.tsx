import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VisualTimeline from "./VisualTimeline";

// ── Mock @dnd-kit/core ─────────────────────────────────────────────────────────
vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  DndContext: ({ children }: any) => <>{children}</>,
  DragOverlay: ({ children }: any) => <>{children}</>,
}));

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
    dayOfWeek: 1,
    startTime: "14:00",
    endTime: "15:00",
    weekTemplateId: 42,
  },
];

const PX_PER_MIN = 1.2;
const START_MINUTES = 6 * 60; // 360

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("VisualTimeline", () => {
  it("renders empty state message when tasks=[]", () => {
    render(<VisualTimeline tasks={[]} color="#56ca00" onTaskClick={vi.fn()} />);
    expect(
      screen.getByText(/Aucune tâche pour ce jour/i)
    ).toBeInTheDocument();
  });

  it("renders tasks with their title", () => {
    render(<VisualTimeline tasks={TASKS} color="#56ca00" onTaskClick={vi.fn()} />);
    expect(screen.getByText("Consultation matin")).toBeInTheDocument();
    expect(screen.getByText("Réunion équipe")).toBeInTheDocument();
  });

  it("task at 08:00 has positive top value (> 0, since 08:00 > 06:00)", () => {
    const { container } = render(
      <VisualTimeline tasks={[TASKS[0]]} color="#56ca00" onTaskClick={vi.fn()} />
    );

    // The task block is absolutely positioned with a top style
    // 08:00 = 480 minutes, clampedStart = max(480, 360) = 480
    // topPx = (480 - 360) * 1.2 = 120 * 1.2 = 144
    const expectedTop = (8 * 60 - START_MINUTES) * PX_PER_MIN; // 144

    // Find all absolutely positioned elements
    const absoluteEls = container.querySelectorAll('[style*="position: absolute"]');
    const taskBlocks = Array.from(absoluteEls).filter((el) => {
      const style = (el as HTMLElement).style;
      return style.top && parseFloat(style.top) > 0;
    });

    expect(taskBlocks.length).toBeGreaterThan(0);
    // At least one block has top = 144px
    const hasCorrectTop = Array.from(taskBlocks).some((el) => {
      return parseFloat((el as HTMLElement).style.top) === expectedTop;
    });
    expect(hasCorrectTop).toBe(true);
  });
});
