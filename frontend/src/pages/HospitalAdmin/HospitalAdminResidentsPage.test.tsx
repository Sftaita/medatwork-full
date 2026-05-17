/**
 * Tests for HospitalAdminResidentsPage (Gestion des MACCS).
 *
 * Covers:
 * - Loading spinner
 * - Table rows rendered per MACCS
 * - Column headers triables (Nom, Email, Année, Opting-out, Statut)
 * - Status badges (active / pending / not_registered)
 * - Search by name, email, year
 * - Filter by statut (Select)
 * - Filter by année (Select)
 * - Empty state "Aucun MACCS"
 * - No-results state after search/filter
 * - Opting-out indicator
 * - Footer count
 * - Checkbox selection (toggle all)
 * - Tri par colonne : Nom asc par défaut, inversion au 2e clic, tri par Statut
 * - "Ajouter un MACCS" opens dialog
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminResidentsPage from "./HospitalAdminResidentsPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Le champ de recherche est dans la Topbar (useTopbarSearch), pas dans le DOM de la page
let mockTopbarSearch = "";
vi.mock("../../hooks/useTopbarSearch", () => ({
  useTopbarSearch: () => mockTopbarSearch,
}));

// ── Mock data ─────────────────────────────────────────────────────────────────

const ALICE: any = {
  yrId: 10, residentId: 1,
  firstname: "Alice", lastname: "Dupont", email: "alice@chu.be",
  yearId: 1, yearTitle: "Cardiologie 2025",
  status: "active", optingOut: false, avatarUrl: null,
  createdAt: "2025-09-01T08:00:00Z", accountActivated: true, yearPending: false,
};
const BOB: any = {
  yrId: 20, residentId: 2,
  firstname: "Bob", lastname: "Martin", email: "bob@chu.be",
  yearId: 2, yearTitle: "Neurologie 2025",
  status: "pending", optingOut: true, avatarUrl: null,
  createdAt: "2025-09-05T08:00:00Z", accountActivated: false, yearPending: true,
};
const CARLA: any = {
  yrId: 30, residentId: 3,
  firstname: "Carla", lastname: "Rossi", email: "carla@chu.be",
  yearId: 1, yearTitle: "Cardiologie 2025",
  status: "not_registered", optingOut: false, avatarUrl: null,
  createdAt: "2025-10-01T08:00:00Z", accountActivated: false, yearPending: false,
};

const MOCK_ROWS = [ALICE, BOB, CARLA];
const MOCK_YEARS = [
  { id: 1, title: "Cardiologie 2025", period: "2025-2026", status: "active", dateOfStart: "2025-01-01", dateOfEnd: "2026-01-01", location: "CHU", residentCount: 0, managerCount: 0 },
  { id: 2, title: "Neurologie 2025",  period: "2025-2026", status: "active", dateOfStart: "2025-01-01", dateOfEnd: "2026-01-01", location: "CHU", residentCount: 0, managerCount: 0 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <HospitalAdminResidentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTopbarSearch = "";
  vi.mocked(hospitalAdminApi.listResidents).mockResolvedValue(MOCK_ROWS);
  vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue(MOCK_YEARS);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminResidentsPage", () => {

  // ── Loading ──────────────────────────────────────────────────────────────

  it("shows loading skeleton while fetching", () => {
    vi.mocked(hospitalAdminApi.listResidents).mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    // Le composant affiche des lignes Skeleton pendant le chargement
    expect(container.querySelector(".MuiSkeleton-root")).toBeInTheDocument();
  });

  // ── Table rows ─────────────────────────────────────────────────────────────

  it("renders one row per MACCS", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows).toHaveLength(3);
  });

  it("renders MACCS names, emails, and year titles", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
    // Alice + Carla are both in Cardiologie 2025
    expect(screen.getAllByText("Cardiologie 2025")).toHaveLength(2);
    expect(screen.getByText("Neurologie 2025")).toBeInTheDocument();
  });

  // ── Column headers ─────────────────────────────────────────────────────────

  it("shows column headers: Nom, Email, Année académique, Statut", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    // "Statut" also appears as a filter label, so check it exists at least once
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Année académique")).toBeInTheDocument();
    // column header inside <th>
    expect(screen.getAllByText("Statut").length).toBeGreaterThanOrEqual(1);
    const header = screen.getAllByRole("columnheader").find(
      (th) => th.textContent === "Statut"
    );
    expect(header).toBeInTheDocument();
  });

  // ── Status badges ─────────────────────────────────────────────────────────

  it("renders status badges for all three statuses", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Sans compte")).toBeInTheDocument();
  });

  // ── Opting-out ─────────────────────────────────────────────────────────────

  it("shows 'Oui' badge for opted-out MACCS", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("Oui")).toBeInTheDocument();
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  it("shows footer with total count", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText(/3 sur 3 MACCS/)).toBeInTheDocument();
  });

  // ── Empty & no-results ────────────────────────────────────────────────────

  it("shows 'Aucun MACCS' when list is empty", async () => {
    vi.mocked(hospitalAdminApi.listResidents).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun MACCS pour cette période.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun résultat' after search with no match", async () => {
    mockTopbarSearch = "zzzunknown";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  it("filters by name", async () => {
    mockTopbarSearch = "alice";
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("filters by email", async () => {
    mockTopbarSearch = "bob@";
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
  });

  it("filters by year title", async () => {
    // BOB.yearTitle = "Neurologie 2025", ALICE.yearTitle = "Cardiologie 2025"
    mockTopbarSearch = "Neurologie";
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Rossi Carla")).not.toBeInTheDocument();
  });

  // ── Checkbox selection ────────────────────────────────────────────────────

  it("'select all' checkbox selects all visible rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is "select all"
    fireEvent.click(checkboxes[0]);
    // All 3 data checkboxes should now be checked
    const dataCheckboxes = checkboxes.slice(1);
    dataCheckboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  // ── Tri par colonne ───────────────────────────────────────────────────────

  it("trie par Nom ascendant par défaut (D < M < R)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const dataRows = screen.getAllByRole("row").slice(1); // skip header
    expect(dataRows[0].querySelector("td:nth-child(2)")?.textContent).toContain("Dupont");
    expect(dataRows[1].querySelector("td:nth-child(2)")?.textContent).toContain("Martin");
    expect(dataRows[2].querySelector("td:nth-child(2)")?.textContent).toContain("Rossi");
  });

  it("inverse le tri au 2e clic sur la même colonne", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const nomHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Nom")
    )!;
    fireEvent.click(nomHeader); // → desc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].querySelector("td:nth-child(2)")?.textContent).toContain("Rossi");
      expect(rows[2].querySelector("td:nth-child(2)")?.textContent).toContain("Dupont");
    });
    fireEvent.click(nomHeader); // → asc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].querySelector("td:nth-child(2)")?.textContent).toContain("Dupont");
    });
  });

  it("trie par Statut (active < not_registered < pending alphabétiquement)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const statutHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Statut")
    )!;
    fireEvent.click(statutHeader);
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      // "active" < "not_registered" < "pending" lexicographically
      expect(rows[0].querySelector("td:nth-child(2)")?.textContent).toContain("Dupont"); // active
    });
  });

  it("trie par Opting-out (non-optés en premier en asc)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const optingHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Opting-out")
    )!;
    fireEvent.click(optingHeader); // asc: false(0) before true(1) → Bob last
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      // Bob has optingOut: true → should be last in asc
      expect(rows[2].querySelector("td:nth-child(2)")?.textContent).toContain("Martin");
    });
  });

  // ── Filtre Statut ─────────────────────────────────────────────────────────

  it("filtre par statut 'En attente' — affiche uniquement Bob", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const comboboxes = screen.getAllByRole("combobox");
    // 1st combobox = Statut, 2nd = Année
    fireEvent.mouseDown(comboboxes[0]);
    await waitFor(() => expect(screen.getByRole("option", { name: "En attente" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "En attente" }));
    await waitFor(() => {
      expect(screen.getByText("Martin Bob")).toBeInTheDocument();
      expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
      expect(screen.queryByText("Rossi Carla")).not.toBeInTheDocument();
    });
  });

  // ── Filtre Année ──────────────────────────────────────────────────────────

  it("filtre par année — affiche uniquement les MACCS de cette année", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const comboboxes = screen.getAllByRole("combobox");
    // 2nd combobox = YearSelect (label="Année")
    fireEvent.mouseDown(comboboxes[1]);
    // YearSelect rend les MenuItem avec titre + location + période — utiliser regex
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Neurologie 2025/ })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("option", { name: /Neurologie 2025/ }));
    await waitFor(() => {
      expect(screen.getByText("Martin Bob")).toBeInTheDocument();
      expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
      expect(screen.queryByText("Rossi Carla")).not.toBeInTheDocument();
    });
  });

  // ── Dialog ────────────────────────────────────────────────────────────────

  it("opens 'Ajouter un MACCS' dialog on button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Ajouter un MACCS/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Ajouter un MACCS" })).toBeInTheDocument();
  });
});
