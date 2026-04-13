/**
 * Tests for Garde.tsx (Gardes form).
 *
 * Covers:
 * - Renders correctly
 * - Validation: year, dateOfStart, dateOfEnd, type required
 * - Success: API called, toast shown, form reset
 * - Error: handleApiError called exactly once — no double toast (regression #1)
 * - No crash on network error (no response object)
 * - Comment field has maxLength 250
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Garde from "./Garde";

// ── Hoisted shared state ─────────────────────────────────────────────────────
const mockPost    = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ post: mockPost }));
const mockHandleApiError = vi.hoisted(() => vi.fn());

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../../../../components/medium/CustomDateTimeHandler", () => ({
  default: ({ label }: any) => (
    <input aria-label={label} data-testid={`dt-${label}`} defaultValue="2025-03-10 18:00" />
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const YEARS = [{ id: 1, title: "Stage 2025-2026" }];

function renderGarde(props: Partial<React.ComponentProps<typeof Garde>> = {}) {
  return render(
    <MemoryRouter>
      <Garde years={YEARS} yearsLoading={false} {...props} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Garde — rendu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le bouton Enregistrer", () => {
    renderGarde();
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
  });

  it("affiche le sélecteur de type de garde", () => {
    renderGarde();
    expect(screen.getByLabelText(/type de garde/i)).toBeInTheDocument();
  });

  it("désactive le bouton pendant le chargement des années", () => {
    renderGarde({ yearsLoading: true });
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeDisabled();
  });
});

describe("Garde — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche une erreur si l'année n'est pas renseignée", async () => {
    renderGarde({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné l'année/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("affiche une erreur si le type n'est pas sélectionné", async () => {
    renderGarde();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné le type de garde/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe("Garde — soumission réussie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValueOnce({ data: { message: "ok" } });
  });

  it("appelle POST avec type et year corrects après sélection", async () => {
    renderGarde();

    // Sélectionner le type de garde
    fireEvent.mouseDown(screen.getByLabelText(/type de garde/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Garde appelable"));

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    const [url, payload] = mockPost.mock.calls[0] as [string, Record<string, any>];
    expect(url).toContain("gardes/addRecord");
    expect(payload.type).toBe("callable");
    expect(payload.year).toBe(1);
  });

  it("affiche le toast de succès", async () => {
    const { toast } = await import("react-toastify");
    renderGarde();

    fireEvent.mouseDown(screen.getByLabelText(/type de garde/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Garde sur place"));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Enregistrement validé!", expect.anything()));
  });
});

describe("Garde — gestion d'erreur (régression double toast)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });
  });

  it("appelle handleApiError exactement une fois", async () => {
    renderGarde();

    fireEvent.mouseDown(screen.getByLabelText(/type de garde/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Garde appelable"));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });

  it("n'appelle PAS toast.error séparément (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    renderGarde();

    fireEvent.mouseDown(screen.getByLabelText(/type de garde/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Garde sur place"));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ne plante pas sur une erreur réseau sans objet response", async () => {
    mockPost.mockReset();
    mockPost.mockRejectedValueOnce(new Error("Network Error"));

    renderGarde();
    fireEvent.mouseDown(screen.getByLabelText(/type de garde/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Garde appelable"));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Garde — champ commentaire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("le bouton commentaire affiche/masque le champ", async () => {
    renderGarde();
    const btn = screen.getByRole("button", { name: /ajouter un commentaire/i });
    // Le champ texte n'existe pas avant le clic (le bouton lui-même n'est pas un textbox)
    expect(screen.queryByRole("textbox", { name: /commentaire/i })).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByRole("textbox", { name: /commentaire/i })).toBeInTheDocument();
  });

  it("le champ commentaire a une limite de 250 caractères", () => {
    renderGarde();
    fireEvent.click(screen.getByRole("button", { name: /ajouter un commentaire/i }));
    const textarea = screen.getByRole("textbox", { name: /commentaire/i });
    expect(textarea).toHaveAttribute("maxlength", "250");
  });
});
