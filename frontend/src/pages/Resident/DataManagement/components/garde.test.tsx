/**
 * Tests for DataManagement/components/garde.tsx
 *
 * Covers:
 * - Spinner pendant le chargement
 * - Affiche les lignes (début, fin, type traduit, commentaire, année)
 * - Chip "Validé" pour les gardes non éditables
 * - Suppression optimiste + toast succès
 * - Rollback si suppression échoue
 * - handleApiError une seule fois (pas de double toast — régression)
 * - Bouton Supprimer désactivé si isEditable=false
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Garde from "./garde";

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
const MOCK_GARDES = [
  {
    id: 10,
    isEditable: true,
    dateOfStart: "2026-04-01T20:00:00",
    dateOfEnd: "2026-04-02T08:00:00",
    type: "callable",
    title: "Stage 2025-2026",
    comment: "Appelé à 22h",
  },
  {
    id: 11,
    isEditable: false,
    dateOfStart: "2026-04-03T08:00:00",
    dateOfEnd: "2026-04-03T20:00:00",
    type: "hospital",
    title: "Stage 2025-2026",
    comment: null,
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <Garde />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Garde — chargement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le skeleton (pas de données visibles) pendant le chargement", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.queryByText("Début")).not.toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("affiche les lignes avec le type traduit", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_GARDES });
    renderComponent();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByText("Garde appelable")).toBeInTheDocument();
    expect(screen.getByText("Garde sur place")).toBeInTheDocument();
  });

  it("affiche le commentaire", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_GARDES });
    renderComponent();
    await waitFor(() => screen.getByText("Garde appelable"));
    expect(screen.getByText("Appelé à 22h")).toBeInTheDocument();
  });

  it("affiche le chip 'Validé' pour les gardes non éditables", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_GARDES });
    renderComponent();
    await waitFor(() => expect(screen.getByText("Validé")).toBeInTheDocument());
  });

  it("appelle handleApiError si le chargement échoue", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Garde — suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce({ data: MOCK_GARDES });
  });

  it("retire la ligne immédiatement (optimiste)", async () => {
    mockDelete.mockReturnValue(new Promise(() => {}));
    renderComponent();
    await waitFor(() => screen.getByText("Garde appelable"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    expect(screen.queryByText("Appelé à 22h")).not.toBeInTheDocument();
  });

  it("affiche le toast de succès après suppression réussie", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockResolvedValueOnce({});
    renderComponent();
    await waitFor(() => screen.getByText("Garde appelable"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Événement supprimé avec succès.", expect.anything())
    );
  });

  it("rollback : remet la ligne si la suppression échoue", async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 403 } });
    renderComponent();
    await waitFor(() => screen.getByText("Garde appelable"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(screen.getByText("Appelé à 22h")).toBeInTheDocument();
  });

  it("appelle handleApiError exactement une fois (régression double toast)", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => screen.getByText("Garde appelable"));

    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("désactive le bouton Supprimer pour les gardes non éditables", async () => {
    renderComponent();
    await waitFor(() => screen.getByText("Validé"));

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    expect(deleteButtons[1]).toBeDisabled();
  });
});
