/**
 * Tests for Statistics.tsx (page statistiques résident).
 *
 * Covers:
 * - Affiche un spinner pendant le chargement initial
 * - Affiche les cards après chargement
 * - URL de premier chargement correcte (régression : mois seul, pas mois+année)
 * - Sélecteur d'années peuplé avec les options retournées par l'API
 * - Changement d'année appelle l'API avec URL correcte (régression : mois/yearId pas mois+année+yearId)
 * - handleApiError appelé si le chargement échoue
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Statistics from "./Statistics";

// ── Hoisted shared state ─────────────────────────────────────────────────────
const mockGet     = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet }));
const mockHandleApiError = vi.hoisted(() => vi.fn());

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Stub des enfants lourds (recharts + CountUp + theme.palette.purple)
vi.mock("./components/TimeCard", () => ({
  default: ({ item }: any) => (
    <div data-testid="time-card">{item?.firstname ?? "–"}</div>
  ),
}));
vi.mock("./components/GraphCard", () => ({
  default: () => <div data-testid="graph-card">GraphCard</div>,
}));
// Le Dialog local (./components/Dialog) est un MUI Dialog — le stub simplifie l'interaction
vi.mock("./components/Dialog", () => ({
  default: ({ open, handleSelect }: any) =>
    open ? (
      <div data-testid="stats-dialog">
        <button onClick={handleSelect}>Valider</button>
      </div>
    ) : null,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const FIRST_LOAD_RESPONSE = {
  data: {
    years: [
      { yearId: 10, title: "Stage 2025-2026" },
      { yearId: 11, title: "Stage 2024-2025" },
    ],
    statistics: [{ firstname: "Alice", lastname: "Martin", totalHours: 38.5 }],
  },
};

const YEAR_CHANGE_RESPONSE = { data: { firstname: "Bob", lastname: "Dupont" } };

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderPage() {
  return render(
    <MemoryRouter>
      <Statistics />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Statistics — chargement initial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche un spinner pendant le chargement (loading=true dès le début)", () => {
    // Ne se résout jamais → le composant reste en état de chargement
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByTestId("time-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("graph-card")).not.toBeInTheDocument();
  });

  it("masque le spinner et affiche les cards après chargement", async () => {
    mockGet.mockResolvedValueOnce(FIRST_LOAD_RESPONSE);
    renderPage();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByTestId("time-card")).toBeInTheDocument();
    expect(screen.getByTestId("graph-card")).toBeInTheDocument();
  });

  it("URL de premier chargement : mois seul, pas mois+année collés (régression)", async () => {
    // Bug corrigé : avant, l'URL était statisticsFirstload/42026 (month=4, year=2026 collés)
    // Correcte : statisticsFirstload/4
    mockGet.mockResolvedValueOnce(FIRST_LOAD_RESPONSE);
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    const url: string = mockGet.mock.calls[0][0];
    // L'URL doit terminer par un nombre à 1-2 chiffres (le mois), jamais 5 chiffres
    expect(url).toMatch(/statisticsFirstload\/\d{1,2}$/);
    expect(url).not.toMatch(/\d{5}/); // pas de nombre à 5 chiffres comme "42026"
  });
});

describe("Statistics — sélecteur d'années", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce(FIRST_LOAD_RESPONSE);
  });

  it("affiche les titres des années dans le sélecteur (toutes les options visibles après ouverture)", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("time-card"));
    // La valeur sélectionnée (année courante) est visible sans ouvrir le menu
    expect(screen.getByText("Stage 2025-2026")).toBeInTheDocument();
    // Les autres options sont dans un portail MUI — ouvrir le menu pour les voir
    fireEvent.mouseDown(screen.getByRole("combobox"));
    await waitFor(() => screen.getByRole("listbox"));
    expect(screen.getByText("Stage 2024-2025")).toBeInTheDocument();
  });

  it("URL de changement d'année : mois/yearId avec séparateur, pas concaténés (régression)", async () => {
    // Bug corrigé : avant, l'URL était statistics/42026/11 (month+year collés puis yearId)
    // Correcte : statistics/4/11 (month / yearId)
    mockGet.mockResolvedValueOnce(YEAR_CHANGE_RESPONSE);
    renderPage();
    await waitFor(() => screen.getByTestId("time-card"));

    // Changer d'année via le combobox MUI
    fireEvent.mouseDown(screen.getByRole("combobox"));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Stage 2024-2025"));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    const secondUrl: string = mockGet.mock.calls[1][0];
    // Format attendu : .../statistics/M/yearId  (1-2 chiffres, slash, entier)
    expect(secondUrl).toMatch(/statistics\/\d{1,2}\/\d+$/);
    expect(secondUrl).not.toMatch(/\d{5}/); // pas de mois+année collés
  });
});

describe("Statistics — gestion d'erreur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle handleApiError si l'API échoue au chargement initial", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: "Erreur serveur" } } });
    renderPage();
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });

  it("masque le spinner même après une erreur (finally branch)", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });
    renderPage();
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("Statistics — bouton mois", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce(FIRST_LOAD_RESPONSE);
  });

  it("affiche le bouton de sélection du mois après chargement", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("time-card"));
    // Le bouton affiche le nom du mois courant (format "AVRIL 2026" ou similaire)
    const monthBtn = screen.getByRole("button");
    expect(monthBtn).toBeInTheDocument();
  });
});
