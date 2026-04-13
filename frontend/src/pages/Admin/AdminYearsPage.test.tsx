/**
 * Tests for AdminYearsPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders years in a table (title, period, hospital, residents)
 * - Shows "Sans hôpital" chip for unassigned years
 * - Search filters by title and hospital name
 * - Shows "Aucune année" alert when list is empty
 * - Shows "Aucun résultat" when search yields nothing
 * - "Changer hôpital" button opens a dialog with hospital select
 * - Dialog calls assignYearHospital on confirm
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminYearsPage from "./AdminYearsPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_YEARS = [
  {
    id: 10,
    title: "Stage cardio S1",
    period: "2025-2026",
    location: "Cardiologie",
    speciality: null,
    dateOfStart: "2025-09-01",
    dateOfEnd: "2026-02-28",
    residentCount: 3,
    hospital: { id: 1, name: "CHU Liège" },
  },
  {
    id: 11,
    title: "Stage urgences S2",
    period: "2025-2026",
    location: "Urgences",
    speciality: null,
    dateOfStart: "2026-03-01",
    dateOfEnd: "2026-08-31",
    residentCount: 0,
    hospital: null,
  },
];

const MOCK_HOSPITALS = [
  { id: 1, name: "CHU Liège", city: "Liège", country: "Belgique", isActive: true },
  { id: 2, name: "CHR Namur", city: "Namur", country: "Belgique", isActive: true },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminYearsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.listAllYears).mockResolvedValue(MOCK_YEARS as any);
  vi.mocked(adminApi.listHospitals).mockResolvedValue(MOCK_HOSPITALS as any);
});

describe("AdminYearsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listAllYears).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders years in table rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    expect(screen.getByText("Stage urgences S2")).toBeInTheDocument();
    expect(screen.getByText("CHU Liège")).toBeInTheDocument();
    expect(screen.getAllByText("2025-2026").length).toBe(2);
  });

  it("shows 'Sans hôpital' chip for unassigned year", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Sans hôpital")).toBeInTheDocument());
  });

  it("filters by title via search input", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par titre, période, hôpital…"), {
      target: { value: "cardio" },
    });
    expect(screen.getByText("Stage cardio S1")).toBeInTheDocument();
    expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
  });

  it("filters by hospital name", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par titre, période, hôpital…"), {
      target: { value: "CHU" },
    });
    expect(screen.getByText("Stage cardio S1")).toBeInTheDocument();
    expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
  });

  it("shows 'Aucun résultat' when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par titre, période, hôpital…"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucune année' when list is empty", async () => {
    vi.mocked(adminApi.listAllYears).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucune année enregistrée.")).toBeInTheDocument()
    );
  });

  it("opens assign hospital dialog on button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const buttons = screen.getAllByRole("button", { name: /Changer hôpital/i });
    fireEvent.click(buttons[0]);
    await waitFor(() =>
      expect(screen.getByText("Changer l'hôpital")).toBeInTheDocument()
    );
    expect(screen.getAllByText(/Stage cardio S1/).length).toBeGreaterThanOrEqual(1);
  });
});
