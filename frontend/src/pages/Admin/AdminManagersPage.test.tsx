/**
 * Tests for AdminManagersPage.
 *
 * Covers:
 * - Loading spinner
 * - KPI cards : labels et valeurs
 * - Tableau : nom, email, statut, hôpitaux
 * - Tri par nom asc par défaut
 * - Recherche par nom, email, hôpital
 * - Filter chips : Actifs, Non activés filtrent le tableau
 * - État vide "Aucun manager"
 * - "Aucun résultat" après recherche sans résultat
 * - Menu 3-points : Activer / Désactiver, Supprimer, Activer manuellement
 * - Dialog de confirmation de suppression
 * - "Activer manuellement" visible uniquement pour non-activés
 * - "Renvoyer l'email d'activation" visible uniquement pour non-activés
 * - Appelle resendManagerActivation avec le bon id
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminManagersPage from "./AdminManagersPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_STATS = { total: 3, active: 1, inactive: 0, pending: 1, notActivated: 1 };

const MOCK_MANAGERS = [
  {
    id: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@chu.be",
    status: "active",
    validatedAt: "2025-09-01T00:00:00+00:00",
    hospitals: [{ id: 10, name: "CHU Liège" }],
  },
  {
    id: 2,
    firstname: "Bob",
    lastname: "Martin",
    email: "bob@chu.be",
    status: "pending_hospital",
    validatedAt: null,
    hospitals: [],
  },
  {
    id: 3,
    firstname: "Carla",
    lastname: "Rossi",
    email: "carla@chu.be",
    status: "active",
    validatedAt: null,
    hospitals: [{ id: 10, name: "CHU Liège" }],
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminManagersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getManagerStats).mockResolvedValue(MOCK_STATS);
  vi.mocked(adminApi.listManagers).mockResolvedValue(MOCK_MANAGERS as any);
});

describe("AdminManagersPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listManagers).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders KPI cards with correct labels and values", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Total managers")).toBeInTheDocument());
    // "Actifs" / "Non activés" appear in both KPI card and filter chip — at least 1 each
    expect(screen.getAllByText("Actifs").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Non activés").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Inactifs").length).toBeGreaterThanOrEqual(1);
    // total = 3 (KPI card + filter chip count)
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("renders managers in table rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
    expect(screen.getAllByText("CHU Liège").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche les badges de statut dans le tableau", async () => {
    renderPage();
    // Alice (validatedAt set, active) → "Actif"
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    // Bob et Carla (validatedAt=null) → "Non activé" × 2
    expect(screen.getAllByText("Non activé").length).toBe(2);
  });

  it("renders managers sorted by lastname", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    const names = rows
      .slice(1) // skip header
      .map((r) => r.textContent ?? "");
    const dupont = names.findIndex((n) => n.includes("Dupont"));
    const martin = names.findIndex((n) => n.includes("Martin"));
    const rossi = names.findIndex((n) => n.includes("Rossi"));
    expect(dupont).toBeLessThan(martin);
    expect(martin).toBeLessThan(rossi);
  });

  it("filters by name via search input", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "alice" },
    });
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("filters by hospital name", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "Liège" },
    });
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("shows 'Aucun résultat' alert when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun manager' alert when list is empty", async () => {
    vi.mocked(adminApi.listManagers).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Aucun manager enregistré.")).toBeInTheDocument());
  });

  it("opens actions menu on MoreVert click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer / Désactiver")).toBeInTheDocument());
  });

  it("opens delete confirmation dialog", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    await waitFor(() =>
      expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    );
  });

  it("calls deleteManager on confirm", async () => {
    vi.mocked(adminApi.deleteManager).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(adminApi.deleteManager).toHaveBeenCalledWith(1));
  });

  it("shows 'Activer manuellement' only for non-activated managers", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Alice (validatedAt set) — no manual activate option
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer / Désactiver")).toBeInTheDocument());
    expect(screen.queryByText("Activer manuellement")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Bob (validatedAt=null) — has manual activate option
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer manuellement")).toBeInTheDocument());
  });

  it("calls activateManager when 'Activer manuellement' is clicked", async () => {
    vi.mocked(adminApi.activateManager).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Activer manuellement"));
    await waitFor(() => expect(adminApi.activateManager).toHaveBeenCalledWith(2));
  });

  it("filter chip 'Non activés' n'affiche que Bob et Carla", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    // Cliquer sur le chip "Non activés"
    fireEvent.click(screen.getByRole("button", { name: /Non activés/i }));
    await waitFor(() => expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument());
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
  });

  it("filter chip 'Actifs' n'affiche que Alice", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Actifs/ }));
    await waitFor(() => expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument());
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.queryByText("Rossi Carla")).not.toBeInTheDocument();
  });

  // ── Resend activation ────────────────────────────────────────────────────────

  it("shows 'Renvoyer l\\'email d\\'activation' only for non-activated managers", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Alice (validatedAt set) — no resend option
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer / Désactiver")).toBeInTheDocument());
    expect(screen.queryByText("Renvoyer l'email d'activation")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Bob (validatedAt=null) — has resend option
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Renvoyer l'email d'activation")).toBeInTheDocument()
    );
  });

  it("calls resendManagerActivation with the correct manager id", async () => {
    vi.mocked(adminApi.resendManagerActivation).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    // Bob is index 1 (sorted: Dupont, Martin, Rossi)
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Renvoyer l'email d'activation"));
    await waitFor(() =>
      expect(adminApi.resendManagerActivation).toHaveBeenCalledWith(2)
    );
  });
});
