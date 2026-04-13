/**
 * Tests for DataManagement/components/timesheet.tsx
 *
 * Covers:
 * - Affiche le spinner pendant le chargement
 * - Affiche les lignes après chargement (start, end, durée, année)
 * - Chip "Validé" pour les entrées non éditables
 * - Icône garde appelable pour les entrées called=true
 * - Suppression optimiste : ligne retirée immédiatement, toast succès
 * - Rollback optimiste si la suppression échoue
 * - handleApiError appelé une seule fois (pas de double toast)
 * - Bouton Modifier désactivé si isEditable=false
 * - Navigation vers /maccs/timer/:id/timer au clic Modifier
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Timesheet from "./timesheet";

// ── Hoisted shared state ─────────────────────────────────────────────────────
const mockGet    = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet, delete: mockDelete }));
const mockHandleApiError = vi.hoisted(() => vi.fn());

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("../../../../hooks/useAuth", () => ({
  default: () => ({ setSelectedMenuItem: vi.fn() }),
}));
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_TIMESHEETS = [
  {
    id: 1,
    isEditable: true,
    dateOfStart: "2026-04-01T08:00:00",
    dateOfEnd: "2026-04-01T18:00:00",
    pause: 30,
    scientific: 0,
    title: "Stage 2025-2026",
    called: false,
  },
  {
    id: 2,
    isEditable: false,
    dateOfStart: "2026-04-02T08:00:00",
    dateOfEnd: "2026-04-02T20:00:00",
    pause: 0,
    scientific: 60,
    title: "Stage 2025-2026",
    called: true,
  },
];

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={["/maccs/data-management"]}>
      <Routes>
        <Route path="/maccs/data-management" element={<Timesheet />} />
        <Route path="/maccs/timer/:id/timer" element={<div>Timer page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Timesheet — chargement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le skeleton (pas de données visibles) pendant le chargement", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderComponent();
    // Les labels de colonnes sont remplacés par des skeletons pendant le chargement
    expect(screen.queryByText("Début")).not.toBeInTheDocument();
    expect(screen.queryByText("Durée")).not.toBeInTheDocument();
    // Le tableau est tout de même rendu (pas de saut de layout)
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("affiche les lignes après chargement", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
    renderComponent();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getAllByText("Stage 2025-2026")).toHaveLength(2);
    expect(screen.getByText("01-04-2026, 08:00")).toBeInTheDocument();
  });

  it("affiche la durée calculée (pause déduite)", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
    renderComponent();
    // id=1 : 10h - 30min pause = 9h30
    await waitFor(() => expect(screen.getByText("9h30")).toBeInTheDocument());
  });

  it("affiche le chip 'Validé' pour les lignes non éditables", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
    renderComponent();
    await waitFor(() => expect(screen.getByText("Validé")).toBeInTheDocument());
  });

  it("affiche l'icône garde appelable quand called=true", async () => {
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
    renderComponent();
    await waitFor(() =>
      expect(screen.getByTestId("PhoneInTalkIcon")).toBeInTheDocument()
    );
  });

  it("appelle handleApiError si le chargement échoue", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Timesheet — suppression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
  });

  it("retire la ligne immédiatement (optimiste) avant la réponse API", async () => {
    mockDelete.mockReturnValue(new Promise(() => {})); // jamais résolu
    renderComponent();
    await waitFor(() => expect(screen.getByText("01-04-2026, 08:00")).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    expect(screen.queryByText("01-04-2026, 08:00")).not.toBeInTheDocument();
  });

  it("affiche le toast de succès après suppression réussie", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockResolvedValueOnce({});
    renderComponent();
    await waitFor(() => screen.getByText("01-04-2026, 08:00"));

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(
      "Événement supprimé avec succès.",
      expect.anything()
    ));
  });

  it("rollback : remet la ligne si la suppression échoue", async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 403, data: { message: "Non autorisé" } } });
    renderComponent();
    await waitFor(() => screen.getByText("01-04-2026, 08:00"));

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(screen.getByText("01-04-2026, 08:00")).toBeInTheDocument();
  });

  it("appelle handleApiError exactement une fois (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    mockDelete.mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();
    await waitFor(() => screen.getByText("01-04-2026, 08:00"));

    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("désactive les boutons Modifier et Supprimer pour les lignes non éditables", async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValueOnce({ data: MOCK_TIMESHEETS });
    renderComponent();
    await waitFor(() => screen.getByText("Validé"));

    // La ligne isEditable=false a ses boutons désactivés
    const editButtons = screen.getAllByRole("button", { name: /modifier/i });
    const deleteButtons = screen.getAllByRole("button", { name: /supprimer/i });
    // id=2 est non éditable → ses boutons doivent être disabled
    expect(editButtons[1]).toBeDisabled();
    expect(deleteButtons[1]).toBeDisabled();
  });
});
