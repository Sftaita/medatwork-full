import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WeekTaskForm from "./WeekTaskForm";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
}));

const mockSetSelectedTask = vi.hoisted(() => vi.fn());
const mockSetTaskMode = vi.hoisted(() => vi.fn());
const mockSetWeekTemplates = vi.hoisted(() => vi.fn());

const mockStore = vi.hoisted(() => ({
  selectedWeekDay: 1,
  selectedTask: null as any,
  setSelectedTask: mockSetSelectedTask,
  taskMode: "creation" as "creation" | "update",
  setTaskMode: mockSetTaskMode,
  selectedWeekId: 42,
  weekTemplates: [
    {
      id: 42,
      title: "Semaine A",
      color: "#56ca00",
      canEdit: true,
      canShare: true,
      weekTaskList: [],
    },
  ],
  setWeekTemplates: mockSetWeekTemplates,
}));

vi.mock("../../../../../hooks/useWeekShedulerContext", () => ({
  default: () => mockStore,
}));

vi.mock("../../../../../hooks/useAxiosPrivate", () => ({
  default: () => stableAxios,
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/services/apiError", () => ({ handleApiError: vi.fn() }));

// Stub TimeField — MUI TimeField needs complex setup
vi.mock("@mui/x-date-pickers/TimeField", () => ({
  TimeField: ({ label, onChange, value }: any) => (
    <input
      aria-label={label}
      data-testid={`timefield-${label}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
  LocalizationProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@mui/x-date-pickers/AdapterDayjs", () => ({
  AdapterDayjs: class {},
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("WeekTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.taskMode = "creation";
    mockStore.selectedTask = null;
  });

  it("submit button is disabled when title is empty", () => {
    render(<WeekTaskForm />);
    const submitBtn = screen.getByRole("button", { name: /ajouter/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is enabled when title is filled", () => {
    render(<WeekTaskForm />);
    const titleInput = screen.getByLabelText(/Titre \*/i);
    fireEvent.change(titleInput, { target: { name: "title", value: "Ma tâche" } });
    const submitBtn = screen.getByRole("button", { name: /ajouter/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("shows server error Alert when backend returns 400 with error field", async () => {
    mockPost.mockRejectedValueOnce({
      response: { status: 400, data: { error: "Conflit horaire détecté" } },
    });

    render(<WeekTaskForm />);

    // Fill in title so we can submit
    const titleInput = screen.getByLabelText(/Titre \*/i);
    fireEvent.change(titleInput, { target: { name: "title", value: "Tâche test" } });

    const submitBtn = screen.getByRole("button", { name: /ajouter/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Conflit horaire détecté")).toBeInTheDocument();
    });
  });

  it("resetForm clears all fields after cancel in update mode", () => {
    mockStore.taskMode = "update";
    mockStore.selectedTask = {
      id: 99,
      title: "Tâche existante",
      description: "Desc",
      startTime: null,
      endTime: null,
      dayOfWeek: 1,
      weekTemplateId: 42,
    };

    render(<WeekTaskForm />);

    // Title should be pre-filled from selectedTask
    const titleInput = screen.getByLabelText(/Titre \*/i);
    expect((titleInput as HTMLInputElement).value).toBe("Tâche existante");

    // Click cancel
    const cancelBtn = screen.getByRole("button", { name: /annuler/i });
    fireEvent.click(cancelBtn);

    expect(mockSetTaskMode).toHaveBeenCalledWith("creation");
    expect(mockSetSelectedTask).toHaveBeenCalledWith(null);
  });
});
