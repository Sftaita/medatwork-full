/**
 * Tests for Absence.tsx (Absences form).
 *
 * Covers:
 * - Renders correctly
 * - Validation: year, type, dateOfStart required
 * - Validation multidate: dateOfEnd required; end before/same as start
 * - Success: toast shown, form reset (year preserved, multidate reset to false)
 * - Error: handleApiError called once, no crash on network error — regression #2
 * - Inline banners (not dialogs) for sickLeave / paternityLeave / maternityLeave
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Absence from "./Absence";

// ── Hoisted shared state ─────────────────────────────────────────────────────
const mockPost    = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ post: mockPost }));
const mockHandleApiError = vi.hoisted(() => vi.fn());

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Replace TDateField with a simple input so fireEvent.change works in tests.
vi.mock("./timerUi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./timerUi")>();
  return {
    ...actual,
    TDateField: ({
      value,
      onChange,
      error,
      ariaLabel,
    }: {
      value: unknown;
      onChange: (s: string) => void;
      error?: string;
      ariaLabel?: string;
    }) => (
      <div>
        <input
          aria-label={ariaLabel}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {error && <div>{error}</div>}
      </div>
    ),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
const YEARS = [{ id: 1, title: "Stage 2025-2026" }];

function renderAbsence(props: Partial<React.ComponentProps<typeof Absence>> = {}) {
  return render(
    <MemoryRouter>
      <Absence years={YEARS} yearsLoading={false} compact={false} {...props} />
    </MemoryRouter>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function selectAbsenceType(value: string) {
  fireEvent.change(screen.getByLabelText(/type d'absence/i), { target: { value } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Absence — rendu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le bouton Enregistrer", () => {
    renderAbsence();
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
  });

  it("affiche le switch Dates multiples", () => {
    renderAbsence();
    expect(screen.getByText("Dates multiples")).toBeInTheDocument();
  });

  it("masque le champ fin par défaut (multidate désactivé)", () => {
    renderAbsence();
    expect(screen.queryByLabelText(/fin de l'absence/i)).not.toBeInTheDocument();
  });

  it("affiche le champ fin quand multidate est activé", () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByLabelText(/fin de l'absence/i)).toBeInTheDocument();
  });
});

describe("Absence — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche une erreur si l'année n'est pas renseignée", async () => {
    renderAbsence({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/sélectionner une année/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("affiche une erreur si le type n'est pas sélectionné", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/sélectionner le type d'absence/i)).toBeInTheDocument()
    );
  });

  it("affiche une erreur si la date de début est absente", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/renseigner la date de début/i)).toBeInTheDocument()
    );
  });

  it("affiche une erreur si la date de fin est absente en mode multidate", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("checkbox")); // activer multidate

    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(screen.getByText(/renseigner la date de fin/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("n'appelle pas l'API si des erreurs sont présentes", async () => {
    renderAbsence({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() => expect(mockPost).not.toHaveBeenCalled());
  });
});

describe("Absence — soumission réussie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValueOnce({ data: { message: "ok" } });
  });

  it("appelle POST avec les bons champs", async () => {
    renderAbsence();

    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    const [url, payload] = mockPost.mock.calls[0] as [string, Record<string, any>];
    expect(url).toContain("absences/addRecord");
    expect(payload.type).toBe("annualLeave");
    expect(payload.year).toBe(1);
    expect(payload.dateOfEnd).toBeNull();
  });

  it("affiche le toast de succès", async () => {
    const { toast } = await import("react-toastify");
    renderAbsence();

    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Enregistrement validé !", expect.anything())
    );
  });

  it("réinitialise multidate à false après succès", async () => {
    renderAbsence();

    fireEvent.click(screen.getByRole("checkbox")); // activer multidate
    expect(screen.getByLabelText(/fin de l'absence/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    fireEvent.change(screen.getByLabelText(/fin de l'absence/i), { target: { value: "2025-03-12" } });
    selectAbsenceType("annualLeave");

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText(/fin de l'absence/i)).not.toBeInTheDocument()
    );
  });

  it("préserve l'année sélectionnée après reset", async () => {
    renderAbsence();

    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(screen.getByText("Stage 2025-2026")).toBeInTheDocument();
  });
});

describe("Absence — gestion d'erreur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle handleApiError exactement une fois sur erreur API", async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });

    renderAbsence();
    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });

  it("n'appelle PAS toast.error séparément (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });

    renderAbsence();
    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ne plante pas sur erreur réseau sans objet response", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));

    renderAbsence();
    fireEvent.change(screen.getByLabelText(/début de l'absence/i), { target: { value: "2025-03-10" } });
    selectAbsenceType("annualLeave");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Absence — banners types sensibles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche la note Certificat médical pour congé maladie", () => {
    renderAbsence();
    selectAbsenceType("sickLeave");
    expect(screen.getByText("Certificat médical")).toBeInTheDocument();
  });

  it("affiche la note Certificat de naissance pour congé paternité", () => {
    renderAbsence();
    selectAbsenceType("paternityLeave");
    expect(screen.getByText("Certificat de naissance")).toBeInTheDocument();
  });

  it("affiche la note Certificat de naissance pour congé maternité", () => {
    renderAbsence();
    selectAbsenceType("maternityLeave");
    expect(screen.getByText("Certificat de naissance")).toBeInTheDocument();
  });

  it("n'affiche pas de note pour congé annuel", () => {
    renderAbsence();
    selectAbsenceType("annualLeave");
    expect(screen.queryByText("Certificat médical")).not.toBeInTheDocument();
    expect(screen.queryByText("Certificat de naissance")).not.toBeInTheDocument();
  });
});
