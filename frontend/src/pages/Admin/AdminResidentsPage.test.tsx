/**
 * Tests for AdminResidentsPage.
 *
 * Covers:
 * - Loading spinner
 * - Rendu : nom, email, statut (Actif / Non activé)
 * - Tri par nom asc par défaut
 * - Recherche par nom, email
 * - Filter chips : Actifs / Non activés
 * - État vide "Aucun résident"
 * - "Aucun résultat" après recherche sans résultat
 * - Menu 3-points : activer manuellement, reset password
 * - "Activer manuellement" visible uniquement pour non-activés
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminResidentsPage from "./AdminResidentsPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Le champ de recherche est dans la Topbar (useTopbarSearch), pas dans le DOM de la page
let mockTopbarSearch = "";
vi.mock("../../hooks/useTopbarSearch", () => ({
  useTopbarSearch: () => mockTopbarSearch,
}));

const MOCK_RESIDENTS = [
  {
    id: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@res.be",
    validatedAt: "2026-01-01T00:00:00+00:00",
  },
  { id: 2, firstname: "Bob", lastname: "Martin", email: "bob@res.be", validatedAt: null },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminResidentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTopbarSearch = "";
  vi.mocked(adminApi.listResidents).mockResolvedValue(MOCK_RESIDENTS as any);
});

describe("AdminResidentsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listResidents).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders residents in table rows (nom prénom order)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@res.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@res.be")).toBeInTheDocument();
  });

  it("renders residents sorted by lastname", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    const names = rows.slice(1).map((r) => r.textContent ?? "");
    const dupont = names.findIndex((n) => n.includes("Dupont"));
    const martin = names.findIndex((n) => n.includes("Martin"));
    expect(dupont).toBeLessThan(martin);
  });

  it("affiche les badges de statut : Actif et Non activé", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getByText("Non activé")).toBeInTheDocument();
  });

  it("filters by name via topbar search", async () => {
    mockTopbarSearch = "bob";
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
  });

  it("chip 'Non activés' filtre uniquement Bob", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Non activés/i }));
    await waitFor(() => expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument());
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
  });

  it("chip 'Actifs' filtre uniquement Alice", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Actifs/ }));
    await waitFor(() => expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument());
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
  });

  it("shows 'Aucun résultat' when topbar search yields nothing", async () => {
    mockTopbarSearch = "zzz";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun résident' alert when list is empty", async () => {
    vi.mocked(adminApi.listResidents).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Aucun résident enregistré.")).toBeInTheDocument());
  });

  it("opens actions menu on MoreVert click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument()
    );
  });

  it("shows 'Activer manuellement' only for non-activated residents", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Alice (validatedAt set) — no manual activate option
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument()
    );
    expect(screen.queryByText("Activer manuellement")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Bob (validatedAt=null) — has manual activate option
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer manuellement")).toBeInTheDocument());
  });

  it("calls activateResident when 'Activer manuellement' is clicked", async () => {
    vi.mocked(adminApi.activateResident).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Activer manuellement"));
    await waitFor(() => expect(adminApi.activateResident).toHaveBeenCalledWith(2));
  });

  it("calls resetResidentPassword when 'Réinitialiser le mot de passe' is clicked", async () => {
    vi.mocked(adminApi.resetResidentPassword).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Réinitialiser le mot de passe"));
    await waitFor(() => expect(adminApi.resetResidentPassword).toHaveBeenCalledWith(1));
  });

  // ── avatarUrl ──────────────────────────────────────────────────────────────

  it("affiche la photo de profil quand avatarUrl est fourni", async () => {
    const withAvatar = [
      {
        ...MOCK_RESIDENTS[0],
        avatarUrl: "http://localhost:8000/api/profile/avatar/11223344aabbccdd",
      },
      MOCK_RESIDENTS[1],
    ];
    vi.mocked(adminApi.listResidents).mockResolvedValue(withAvatar as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const img = document.querySelector('img[src="http://localhost:8000/api/profile/avatar/11223344aabbccdd"]');
    expect(img).toBeTruthy();
  });

  it("n'affiche pas d'img quand avatarUrl est null", async () => {
    const noAvatar = MOCK_RESIDENTS.map((r) => ({ ...r, avatarUrl: null }));
    vi.mocked(adminApi.listResidents).mockResolvedValue(noAvatar as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const img = document.querySelector('img[src*="profile/avatar"]');
    expect(img).toBeNull();
  });
});
