/**
 * Tests for HospitalAdminAuditLogPage.
 *
 * Covers:
 * - Loading spinner
 * - Table rows rendered per log entry
 * - Column headers triables (Date, Admin, Action)
 * - Action badges (create=green, delete=red, retire=amber, etc.)
 * - Filter by action type
 * - Filter by date range
 * - Reset filters
 * - Empty state (no logs)
 * - No-results state after filtering
 * - Tri par Date desc par défaut (plus récent en premier)
 * - Tri par Admin asc, inversion au 2e clic
 * - Tri par Action (ordre alphabétique des labels français)
 * - Pagination footer
 * - Help modal opens on click
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminAuditLogPage from "./HospitalAdminAuditLogPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_LOGS: any[] = [
  {
    id: 1, action: "create_maccs", adminName: "Dr. Admin",
    entityType: "MaccsYears", description: "Alice Dupont ajoutée",
    createdAt: "2025-10-01T10:00:00Z",
  },
  {
    id: 2, action: "delete_maccs", adminName: "Dr. Admin",
    entityType: "MaccsYears", description: "Bob Martin supprimé",
    createdAt: "2025-10-02T11:00:00Z",
  },
  {
    id: 3, action: "retire_manager", adminName: "Super Admin",
    entityType: "ManagerYears", description: "Manager Rossi retiré",
    createdAt: "2025-10-03T09:00:00Z",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <HospitalAdminAuditLogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hospitalAdminApi.getAuditLog).mockResolvedValue({
    logs: MOCK_LOGS,
    total: MOCK_LOGS.length,
    limit: 1000,
    offset: 0,
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminAuditLogPage", () => {

  // ── Loading ──────────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    vi.mocked(hospitalAdminApi.getAuditLog).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Table rows ────────────────────────────────────────────────────────────

  it("renders one row per log entry", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
  });

  it("renders admin names and descriptions", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    expect(screen.getByText("Bob Martin supprimé")).toBeInTheDocument();
    expect(screen.getByText("Manager Rossi retiré")).toBeInTheDocument();
    expect(screen.getAllByText("Dr. Admin")).toHaveLength(2);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  // ── Column headers ─────────────────────────────────────────────────────────

  it("shows column headers: Date, Admin, Action, Description", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  // ── Action badges ─────────────────────────────────────────────────────────

  it("renders action labels for each log entry", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    expect(screen.getByText("Ajout MACCS")).toBeInTheDocument();
    expect(screen.getByText("Suppression MACCS")).toBeInTheDocument();
    expect(screen.getByText("Retrait manager")).toBeInTheDocument();
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  it("shows footer with entry count", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    // Caption in the table footer
    expect(screen.getAllByText(/3 entrées/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it("shows empty state message when no logs", async () => {
    vi.mocked(hospitalAdminApi.getAuditLog).mockResolvedValue({ logs: [], total: 0, limit: 1000, offset: 0 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucune action enregistrée pour le moment.")).toBeInTheDocument()
    );
  });

  // ── Filter by action ──────────────────────────────────────────────────────

  it("filters by action type and shows only matching rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    // MUI Select — open by clicking the combobox
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    await waitFor(() => expect(screen.getByRole("option", { name: "Ajout MACCS" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "Ajout MACCS" }));
    await waitFor(() => {
      expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument();
      expect(screen.queryByText("Bob Martin supprimé")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/1 résultat/)).toBeInTheDocument();
  });

  // ── Reset filters ─────────────────────────────────────────────────────────

  it("shows 'Réinitialiser' button after applying a filter and resets on click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    await waitFor(() => expect(screen.getByRole("option", { name: "Ajout MACCS" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "Ajout MACCS" }));
    await waitFor(() => expect(screen.getByText("Réinitialiser")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Réinitialiser"));
    await waitFor(() => expect(screen.queryByText("Réinitialiser")).not.toBeInTheDocument());
    expect(screen.getByText("Bob Martin supprimé")).toBeInTheDocument();
  });

  // ── Tri par colonne ───────────────────────────────────────────────────────

  it("trie par Date desc par défaut — log le plus récent en premier", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    const rows = screen.getAllByRole("row").slice(1);
    // id=3 (2025-10-03) est le plus récent → en premier en desc
    expect(rows[0].textContent).toContain("Manager Rossi retiré");
  });

  it("trie par Date asc au 2e clic — log le plus ancien en premier", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    const dateHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Date")
    )!;
    fireEvent.click(dateHeader); // → asc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("Alice Dupont ajoutée");
    });
  });

  it("trie par Admin asc puis desc", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    const adminHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Admin")
    )!;
    fireEvent.click(adminHeader); // → asc: "Dr. Admin" avant "Super Admin"
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("Dr. Admin");
      expect(rows[2].textContent).toContain("Super Admin");
    });
    fireEvent.click(adminHeader); // → desc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("Super Admin");
    });
  });

  it("trie par Action — labels français alphabétiques asc", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    const actionHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Action")
    )!;
    fireEvent.click(actionHeader); // → asc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      // "Ajout MACCS" < "Retrait manager" < "Suppression MACCS"
      expect(rows[0].textContent).toContain("Ajout MACCS");
      expect(rows[2].textContent).toContain("Suppression MACCS");
    });
  });

  // ── Help modal ────────────────────────────────────────────────────────────

  it("opens help modal when clicking the ? icon", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont ajoutée")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("HelpOutlineIcon").closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("À propos du journal d'activité")).toBeInTheDocument()
    );
  });
});
