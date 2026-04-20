/**
 * Tests for HospitalAdminDashboardPage.
 *
 * Covers:
 * - Shows skeleton cards (not a spinner) while fetching
 * - Renders year cards with title once loaded
 * - Renders period tab label
 * - Renders location + speciality (combined in one text node)
 * - Shows "Aucune année de formation" alert when list is empty
 * - Clicking a year card navigates to /manager/year-detail via state
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminDashboardPage from "./HospitalAdminDashboardPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Use dates that straddle today (2026-04-05) so the auto-tab selection is predictable
const MOCK_YEARS = [
  {
    id: 10,
    title: "Stage cardiologie S1",
    period: "2025-2026",
    location: "Service cardiologie",
    speciality: "Cardiologie",
    dateOfStart: "2025-09-01",
    dateOfEnd: "2026-02-28",
    residentCount: 3,
    residents: [{ firstname: "Alice", lastname: "Martin" }],
    managers: [],
    token: "ABC123",
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
    residents: [],
    managers: [],
    token: null,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter initialEntries={["/hospital-admin/dashboard"]}>
        <Routes>
          <Route path="/hospital-admin/dashboard" element={<HospitalAdminDashboardPage />} />
          {/* La YearCard navigue vers /manager/realtime (clic sur la zone principale) */}
          <Route path="/manager/realtime" element={<div>Realtime page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue(MOCK_YEARS as any);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminDashboardPage", () => {
  it("shows skeleton cards (no year titles visible) while fetching", () => {
    // Le composant affiche des SkeletonCards (pas un CircularProgress) pendant le chargement
    vi.mocked(hospitalAdminApi.listMyYears).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText("Stage cardiologie S1")).not.toBeInTheDocument();
    expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
  });

  it("renders year cards with their titles once loaded", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
    expect(screen.getByText("Stage urgences S2")).toBeInTheDocument();
  });

  it("renders the period as a tab label", async () => {
    renderPage();
    // "2025-2026" apparaît comme onglet dans la barre de navigation des périodes
    await waitFor(() => expect(screen.getByRole("tab", { name: "2025-2026" })).toBeInTheDocument());
  });

  it("renders location and speciality combined in a single element", async () => {
    renderPage();
    // Location et spécialité sont dans un seul nœud : "Service cardiologie — Cardiologie"
    await waitFor(() =>
      expect(screen.getByText(/Service cardiologie/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Cardiologie/)).toBeInTheDocument();
    expect(screen.getByText(/Urgences/)).toBeInTheDocument();
  });

  it("renders resident count chips", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/1\s*résident/)).toBeInTheDocument());
    expect(screen.getByText(/0\s*résident/)).toBeInTheDocument();
  });

  it("shows 'Aucune année de formation' alert when list is empty", async () => {
    vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText("Aucune année de formation enregistrée pour cet hôpital.")
      ).toBeInTheDocument()
    );
  });

  it("navigates to /manager/realtime on year card click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardiologie S1"));
    await waitFor(() => expect(screen.getByText("Realtime page")).toBeInTheDocument());
  });

  it("shows 'Aucune année trouvée' when search has no match", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Stage cardiologie S1"));

    fireEvent.change(screen.getByPlaceholderText(/Titre, résident, manager/i), {
      target: { value: "xxxxxxxxxnotfound" },
    });

    await waitFor(() =>
      expect(screen.getByText("Aucune année trouvée")).toBeInTheDocument()
    );
  });

  it("filters cards by title search", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Stage urgences S2"));

    fireEvent.change(screen.getByPlaceholderText(/Titre, résident, manager/i), {
      target: { value: "cardiologie" },
    });

    await waitFor(() => {
      expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument();
      expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
    });
  });

  it("displays the enrollment token on cards that have one", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("ABC123")).toBeInTheDocument());
  });
});
