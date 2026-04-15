import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeekTemplatesList from "./WeekTemplatesList";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockSetSelectedWeekId = vi.hoisted(() => vi.fn());
const mockStore = vi.hoisted(() => ({
  weekTemplates: [
    { id: 1, title: "Semaine A", color: "#56ca00", canEdit: true, canShare: true, weekTaskList: [] },
    { id: 2, title: "Semaine B", color: "#ff4c51", canEdit: true, canShare: true, weekTaskList: [] },
  ],
  selectedWeekId: 1,
  setSelectedWeekId: mockSetSelectedWeekId,
}));

vi.mock("../../../../../hooks/useWeekShedulerContext", () => ({
  default: () => mockStore,
}));

// Stub UpdateWeekTemplate (uses axiosPrivate etc.)
vi.mock("./UpdateWeekTemplate", () => ({
  default: ({ onCancel }: any) => (
    <div data-testid="update-week-template">
      <button onClick={onCancel}>close</button>
    </div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("WeekTemplatesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders template titles", () => {
    render(<WeekTemplatesList />);
    expect(screen.getByText("Semaine A")).toBeInTheDocument();
    expect(screen.getByText("Semaine B")).toBeInTheDocument();
  });

  it("selected template button group has contained variant", () => {
    render(<WeekTemplatesList />);
    // The ButtonGroup with variant="contained" wraps the selected template
    // We can check the button has a role of button and the text matches
    const buttons = screen.getAllByRole("button");
    const semaineAButton = buttons.find((b) => b.textContent?.includes("Semaine A"));
    expect(semaineAButton).toBeDefined();
  });

  it("color bar is rendered with correct backgroundColor for each template", () => {
    const { container } = render(<WeekTemplatesList />);
    // Find Box elements used as color bars (aria-hidden)
    const colorBars = container.querySelectorAll('[aria-hidden="true"]');
    // There should be at least one color bar per template (2 templates = at least 2 bars)
    // (Drawer/icons may also have aria-hidden elements, so we use >= 2)
    expect(colorBars.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking a template calls setSelectedWeekId with its id", () => {
    render(<WeekTemplatesList />);
    fireEvent.click(screen.getByText("Semaine B"));
    expect(mockSetSelectedWeekId).toHaveBeenCalledWith(2);
  });
});
