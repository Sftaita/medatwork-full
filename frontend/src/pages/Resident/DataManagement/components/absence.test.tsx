/**
 * Tests for DataManagement/components/absence.tsx
 *
 * Covers:
 * - Spinner pendant le chargement
 * - Affiche les lignes (début, fin optionnelle, type traduit, année)
 * - Chip "Validé" pour les absences non éditables
 * - Suppression optimiste + toast succès
 * - Rollback si suppression échoue
 * - handleApiError une seule fois (pas de double toast)
 * - Bouton Supprimer désactivé si isEditable=false
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Absence from "./absence";

// ── Hoisted shared state ─────────────────────────────────────────────────────
const mockGet    = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet, delete: mockDelete }));
const mockHandleApiError = vi.hoisted(() => vi.fn());

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_ABSENCES = [
  {
    id: 20,
    isEditable: true,
    dateOfStart: "2026-04-05",
    dateOfEnd: "2026-04-07",
    type: "annualLeave",
    title: "Stage 2025-2026",
  },
  {
    id: 21,
    isEditable: false,
    dateOfStart: "2026-04-10",
    dateOfEnd: null,
    type: "sickLeave",
    title: "Stage 2025-2026",
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <Absence />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Absence — chargement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le skeleton (pas de données visibles) pendant le chargement", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.queryByText("Début")).not.toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("affiche les lignes avec le type traduit", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_ABSENCES });
    renderComponent();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByText("Congé annuel")).toBeInTheDocument();
    expect(screen.getByText("Congé maladie")).toBeInTheDocument();
  });

  it("affiche la date de fin quand elle existe", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_ABSENCES });
    renderComponent();
    await waitFor(() => screen.getByText("Congé annuel"));
    expect(screen.getByText("07-04-2026")).toBeInTheDocument();
  });

  it("n'affiche pas de date de fin quand elle est null", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_ABSENCES });
    renderComponent();
    await waitFor(() => screen.getByText("Congé maladie"));
    // id=21 a dateOfEnd null → cellule vide (pas de texte de date pour cette ligne)
    const cells = screen.getAllByRole("cell");
    // Vérifier qu'aucune cellule n'affiche "null"
    cells.forEach((cell) => expect(cell.textContent).not.toBe("null"));
  });

  it("affiche le chip 'Validé' pour les absences non éditables", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_ABSENCES });
    renderComponent();
    await waitFor(() => expect(screen.getByText("Validé")).toBeInTheDocument());
  });

  it("appelle handleApiError si le chargement échoue", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Absence — suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce({ data: MOCK_ABSENCES });
  });

  it("retire la ligne immédiatement (optimiste)", async () => {
    mockDelete.mockReturnValue(new Promise(() => {}));
    renderComponent();
    await waitFor(() => screen.getByText("Congé annuel"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    expect(screen.queryByText("Congé annuel")).not.toBeInTheDocument();
  });

  it("affiche le toast de succès après suppression réussie", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockResolvedValueOnce({});
    renderComponent();
    await waitFor(() => screen.getByText("Congé annuel"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Événement supprimé avec succès.", expect.anything())
    );
  });

  it("rollback : remet la ligne si la suppression échoue", async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 403 } });
    renderComponent();
    await waitFor(() => screen.getByText("Congé annuel"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(screen.getByText("Congé annuel")).toBeInTheDocument();
  });

  it("appelle handleApiError exactement une fois (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => screen.getByText("Congé annuel"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("désactive le bouton Supprimer pour les absences non éditables", async () => {
    renderComponent();
    await waitFor(() => screen.getByText("Validé"));

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    expect(deleteButtons[1]).toBeDisabled();
  });
});
