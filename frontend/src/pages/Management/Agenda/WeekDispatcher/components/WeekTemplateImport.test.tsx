import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeekTemplateImport from "./WeekTemplateImport";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost }));

vi.mock("../../../../../hooks/useAxiosPrivate", () => ({
  default: () => stableAxios,
}));

const mockSetYearWeekTemplates = vi.hoisted(() => vi.fn());
const mockSetYears = vi.hoisted(() => vi.fn());
const mockStore = vi.hoisted(() => ({
  yearWeekTemplates: [] as any[],
  years: [] as any[],
  currentYearId: 1,
  setYearWeekTemplates: mockSetYearWeekTemplates,
  setYears: mockSetYears,
}));

vi.mock("../../../../../hooks/useWeekDispatcherContext", () => ({
  default: () => mockStore,
}));

vi.mock("../../../../../services/weekTemplatesApi", () => ({
  default: {
    getWeekTemplatesList: () => ({ method: "get", url: "templates" }),
    linkWeekTemplateToYear: () => ({ method: "post", url: "link" }),
  },
}));

vi.mock("../../../../../services/apiError", () => ({
  handleApiError: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WeekTemplateImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.yearWeekTemplates = [];
    mockGet.mockResolvedValue({
      data: [
        { id: 10, title: "Semaine Type A" },
        { id: 11, title: "Semaine Type B" },
      ],
    });
  });

  // ── Regression: dialog must NOT auto-close after loading templates ──────────

  it("does not call handleClose when templates finish loading", async () => {
    const handleClose = vi.fn();

    render(<WeekTemplateImport open={true} handleClose={handleClose} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 0));

    expect(handleClose).not.toHaveBeenCalled();
  });

  // ── Load only when open=true ──────────────────────────────────────────────

  it("does NOT call the API when rendered with open=false", async () => {
    render(<WeekTemplateImport open={false} handleClose={vi.fn()} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("calls the API when open changes from false to true", async () => {
    const { rerender } = render(<WeekTemplateImport open={false} handleClose={vi.fn()} />);

    expect(mockGet).not.toHaveBeenCalled();

    rerender(<WeekTemplateImport open={true} handleClose={vi.fn()} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
  });

  // ── Content rendering ─────────────────────────────────────────────────────

  it("shows loaded templates after dialog opens", async () => {
    render(<WeekTemplateImport open={true} handleClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Semaine Type A")).toBeInTheDocument();
      expect(screen.getByText("Semaine Type B")).toBeInTheDocument();
    });
  });

  it("filters out templates already linked to the year", async () => {
    mockStore.yearWeekTemplates = [{ weekTemplateId: 10, id: 1, title: "" }] as any[];

    render(<WeekTemplateImport open={true} handleClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText("Semaine Type A")).not.toBeInTheDocument();
      expect(screen.getByText("Semaine Type B")).toBeInTheDocument();
    });
  });

  it("shows empty-state when all templates are already linked", async () => {
    mockStore.yearWeekTemplates = [
      { weekTemplateId: 10 },
      { weekTemplateId: 11 },
    ] as any[];

    render(<WeekTemplateImport open={true} handleClose={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/tous vos modèles de semaine ont déjà été importés/i)
      ).toBeInTheDocument();
    });
  });

  // ── User interactions ──────────────────────────────────────────────────────

  it("calls handleClose when Cancel is clicked", async () => {
    const handleClose = vi.fn();
    render(<WeekTemplateImport open={true} handleClose={handleClose} />);

    await waitFor(() => screen.getByText("Annuler"));
    await userEvent.click(screen.getByText("Annuler"));

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("Importer button is disabled until a template is selected", async () => {
    render(<WeekTemplateImport open={true} handleClose={vi.fn()} />);

    await waitFor(() => screen.getByText("Importer"));
    expect(screen.getByText("Importer").closest("button")).toBeDisabled();
  });

  it("calls handleClose after successful import", async () => {
    const handleClose = vi.fn();
    mockPost.mockResolvedValue({ data: [{ id: 12, title: "Semaine Type C", weekTemplateId: 12 }] });

    render(<WeekTemplateImport open={true} handleClose={handleClose} />);

    await waitFor(() => screen.getByText("Semaine Type A"));
    await userEvent.click(screen.getByText("Semaine Type A"));
    await userEvent.click(screen.getByText("Importer"));

    await waitFor(() => expect(handleClose).toHaveBeenCalledOnce());
  });

  it("removes imported template from list after successful import (no refetch)", async () => {
    const handleClose = vi.fn();
    mockPost.mockResolvedValue({ data: [{ id: 12, title: "Semaine C", weekTemplateId: 12 }] });

    render(<WeekTemplateImport open={true} handleClose={handleClose} />);
    await waitFor(() => screen.getByText("Semaine Type A"));

    // Import only Semaine Type A
    await userEvent.click(screen.getByText("Semaine Type A"));
    await userEvent.click(screen.getByText("Importer"));

    await waitFor(() => expect(handleClose).toHaveBeenCalled());

    // API must NOT have been called a second time for a reload
    expect(mockGet).toHaveBeenCalledOnce();
  });
});
