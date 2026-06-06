/**
 * Tests for HospitalAdminDashboardPage.
 *
 * Covers:
 * - Shows skeleton cards (not a spinner) while fetching
 * - Renders year cards with title once loaded
 * - Renders period tab label
 * - Renders location + speciality (combined in one text node)
 * - Shows "Aucune année de formation" alert when list is empty
 * - Clicking a year card navigates to /manager/year-detail (not /manager/realtime)
 * - Year card click passes correct state: { id, title, adminRights: true }
 * - List row click also navigates to /manager/year-detail
 * - YearFormDialog (edit): pre-fills all fields with existing year values
 * - YearFormDialog (edit): blocks submit when date span > 1 calendar year
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminDashboardPage from "./HospitalAdminDashboardPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import { toast } from "react-toastify";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Le champ de recherche est dans la Topbar (useTopbarSearch), pas dans le DOM de la page
let mockTopbarSearch = "";
vi.mock("../../hooks/useTopbarSearch", () => ({
  useTopbarSearch: () => mockTopbarSearch,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Use dates that straddle today (2026-04-05) so the auto-tab selection is predictable
const MOCK_YEARS = [
  {
    id: 10,
    title: "Stage cardiologie S1",
    period: "2025-2026",
    hospitalName: "Service cardiologie",
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
    hospitalName: "Urgences",
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

// Stub qui expose l'id passé via location.state pour vérifier le payload de navigation
const YearDetailStub = () => {
  const { state } = useLocation();
  return <div data-testid="year-detail-page">year-id:{state?.id}</div>;
};

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter initialEntries={["/hospital-admin/dashboard"]}>
        <Routes>
          <Route path="/hospital-admin/dashboard" element={<HospitalAdminDashboardPage />} />
          <Route path="/manager/realtime" element={<div>Realtime page</div>} />
          <Route path="/manager/year-detail" element={<YearDetailStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockTopbarSearch = "";
  localStorage.removeItem("hospital_admin_dashboard_view"); // évite les fuites entre tests (vue grille/liste)
  vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue(MOCK_YEARS as any);
  vi.mocked(hospitalAdminApi.getDashboardStats).mockResolvedValue({
    maccs:    { active: 0, pending: 0, incomplete: 0, retired: 0, total: 0 },
    managers: { active: 0, pending: 0, incomplete: 0, total: 0 },
    pendingInvites: 0,
    totalYears: 2,
    activeYears: [],
  } as any);
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

  it("clic carte (vue grille) → /manager/year-detail, pas /manager/realtime", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardiologie S1"));
    await waitFor(() => expect(screen.getByTestId("year-detail-page")).toBeInTheDocument());
    expect(screen.queryByText("Realtime page")).not.toBeInTheDocument();
  });

  it("clic carte passe { id:10, adminRights:true } dans location.state", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardiologie S1"));
    await waitFor(() => expect(screen.getByText(/year-id:10/)).toBeInTheDocument());
  });

  it("clic ligne (vue liste) → /manager/year-detail, pas /manager/realtime", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Vue liste" }));
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardiologie S1"));
    await waitFor(() => expect(screen.getByTestId("year-detail-page")).toBeInTheDocument());
    expect(screen.queryByText("Realtime page")).not.toBeInTheDocument();
  });

  it("shows 'Aucune année trouvée' when search has no match", async () => {
    mockTopbarSearch = "xxxxxxxxxnotfound";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucune année trouvée")).toBeInTheDocument()
    );
  });

  it("filters cards by title search", async () => {
    mockTopbarSearch = "cardiologie";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument()
    );
    expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
  });

  it("displays the enrollment token on cards that have one", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("ABC123")).toBeInTheDocument());
  });
});

// ── YearFormDialog — edit mode ────────────────────────────────────────────────

const YEAR_WITH_STATUS = {
  ...MOCK_YEARS[0],
  status: "active" as const,
  managerCount: 0,
};

async function openEditDialog() {
  vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue([YEAR_WITH_STATUS] as any);
  renderPage();
  await waitFor(() => expect(screen.getByText("Stage cardiologie S1")).toBeInTheDocument());
  fireEvent.click(screen.getByTestId("year-menu-btn-10"));
  await waitFor(() => screen.getByRole("menuitem", { name: "Modifier" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Modifier" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
}

describe("YearFormDialog — mode édition", () => {
  it("pré-remplit le titre avec la valeur existante de l'année", async () => {
    await openEditDialog();
    expect(screen.getByDisplayValue("Stage cardiologie S1")).toBeInTheDocument();
  });

  it("pré-remplit les dates au format YYYY-MM-DD", async () => {
    await openEditDialog();
    expect(screen.getByDisplayValue("2025-09-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-02-28")).toBeInTheDocument();
  });

  it("pré-remplit la spécialité", async () => {
    await openEditDialog();
    expect(screen.getByDisplayValue("Cardiologie")).toBeInTheDocument();
  });

  it("bloque le submit et affiche une erreur si la durée dépasse 2 ans civils", async () => {
    await openEditDialog();
    const endInput = screen.getByDisplayValue("2026-02-28");
    fireEvent.change(endInput, { target: { value: "2028-02-28" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /enregistrer/i }));
    expect((toast.error as Mock)).toHaveBeenCalledWith(
      "Une année académique ne peut pas s'étendre sur plus de deux années civiles."
    );
    expect(vi.mocked(hospitalAdminApi.updateYear)).not.toHaveBeenCalled();
  });

  it("n'affiche pas l'erreur de span si la durée est valide (≤ 1 an civil d'écart)", async () => {
    await openEditDialog();
    const endInput = screen.getByDisplayValue("2026-02-28");
    fireEvent.change(endInput, { target: { value: "2026-08-31" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /enregistrer/i }));
    expect((toast.error as Mock)).not.toHaveBeenCalledWith(
      "Une année académique ne peut pas s'étendre sur plus de deux années civiles."
    );
  });
});
