import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TimeSummaryBloc from "./TimeSummaryBloc";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockStore = vi.hoisted(() => ({
  selectedWeekId: 42,
  weekTemplates: [] as any[],
}));

vi.mock("../../../../../hooks/useWeekShedulerContext", () => ({
  default: () => mockStore,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("TimeSummaryBloc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.weekTemplates = [
      {
        id: 42,
        title: "Semaine A",
        color: "#56ca00",
        canEdit: true,
        canShare: true,
        weekTaskList: [],
      },
    ];
  });

  it("renders 7 day names", () => {
    render(<TimeSummaryBloc />);
    const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    dayNames.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("with a task at dayOfWeek='3' (string), total hours > 0", () => {
    mockStore.weekTemplates = [
      {
        id: 42,
        title: "Semaine A",
        color: "#56ca00",
        canEdit: true,
        canShare: true,
        weekTaskList: [
          {
            id: 1,
            title: "Consultation",
            description: "",
            dayOfWeek: "3", // string as mentioned in spec
            startTime: "08:00",
            endTime: "10:00",
            weekTemplateId: 42,
          },
        ],
      },
    ];

    render(<TimeSummaryBloc />);

    // The total label "Total semaine" comes from HoursCircle
    expect(screen.getByText("Total semaine")).toBeInTheDocument();

    // There should be at least one "2h" text (HoursCircle total + DayBar for Wednesday)
    const twoHourElements = screen.getAllByText("2h");
    expect(twoHourElements.length).toBeGreaterThan(0);
  });

  it("with a task at dayOfWeek=8 (out of range), no per-day total is non-zero", () => {
    mockStore.weekTemplates = [
      {
        id: 42,
        title: "Semaine A",
        color: "#56ca00",
        canEdit: true,
        canShare: true,
        weekTaskList: [
          {
            id: 2,
            title: "Tâche hors plage",
            description: "",
            dayOfWeek: 8, // out of range — not added to any day bucket
            startTime: "09:00",
            endTime: "17:00",
            weekTemplateId: 42,
          },
        ],
      },
    ];

    render(<TimeSummaryBloc />);

    // All 7 day slots should show "0h" (out-of-range task not counted in day buckets)
    const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    dayNames.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // Each day bar should display "0h" (7 days × "0h")
    const zeroHourElements = screen.getAllByText("0h");
    // At least 7 day bars showing "0h"
    expect(zeroHourElements.length).toBeGreaterThanOrEqual(7);
  });
});
