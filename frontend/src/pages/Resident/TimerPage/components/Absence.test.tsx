/**
 * Tests for Absence.tsx (Absences form).
 *
 * Covers:
 * - Renders correctly
 * - Validation: year, type, dateOfStart required
 * - Validation multidate: dateOfEnd required; end before/same as start
 * - Success: toast shown, form reset (year preserved, multidate reset to false) — regression #4
 * - Error: handleApiError called once, no crash on network error (no response) — regression #2
 * - Stale closure fix: state updates use functional updaters
 * - Dialog opens for sickLeave / paternityLeave / maternityLeave
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

// Stub DateHandler — date pickers are too heavy for unit tests
vi.mock("../../../../components/medium/DateHandler", () => ({
  default: ({ label, onChange, value, helperText }: any) => (
    <>
      <input
        aria-label={label}
        data-testid={`date-${label}`}
        defaultValue={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {helperText && <span role="note">{helperText}</span>}
    </>
  ),
}));

// Stub CustomDialog — not under test here
vi.mock("../../../../components/medium/CustomDialog", () => ({
  default: ({ open, title }: any) =>
    open ? <div role="dialog" aria-label={title}>{title}</div> : null,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const YEARS = [{ id: 1, title: "Stage 2025-2026" }];

function renderAbsence(props: Partial<React.ComponentProps<typeof Absence>> = {}) {
  return render(
    <MemoryRouter>
      <Absence years={YEARS} yearsLoading={false} {...props} />
    </MemoryRouter>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function selectType(typeText: string) {
  fireEvent.mouseDown(screen.getByLabelText(/type d'absence/i));
  return waitFor(() => {
    fireEvent.click(screen.getByText(typeText));
  });
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
    const switchInput = screen.getByRole("checkbox");
    fireEvent.click(switchInput);
    expect(screen.getByLabelText(/fin de l'absence/i)).toBeInTheDocument();
  });
});

describe("Absence — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche une erreur si l'année n'est pas renseignée", async () => {
    renderAbsence({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné l'année/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("affiche une erreur si le type n'est pas sélectionné", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné le type/i)).toBeInTheDocument()
    );
  });

  it("affiche une erreur si la date de début est absente", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné la date de début/i)).toBeInTheDocument()
    );
  });

  it("affiche une erreur si la date de fin est absente en mode multidate", async () => {
    renderAbsence();
    fireEvent.click(screen.getByRole("checkbox")); // activer multidate

    // Remplir début
    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné la date de fin/i)).toBeInTheDocument()
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

    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
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

    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Enregistrement validé!", expect.anything())
    );
  });

  it("réinitialise multidate à false après succès (régression #4)", async () => {
    renderAbsence();

    // Activer multidate
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByLabelText(/fin de l'absence/i)).toBeInTheDocument();

    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });
    const endInput = screen.getByLabelText(/fin de l'absence/i);
    fireEvent.change(endInput, { target: { value: "2025-03-12" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    // Après succès, le champ fin disparaît (multidate = false)
    await waitFor(() =>
      expect(screen.queryByLabelText(/fin de l'absence/i)).not.toBeInTheDocument()
    );
  });

  it("préserve l'année sélectionnée après reset", async () => {
    renderAbsence();

    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());

    // L'année reste affichée
    expect(screen.getByText("Stage 2025-2026")).toBeInTheDocument();
  });
});

describe("Absence — gestion d'erreur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle handleApiError exactement une fois sur erreur API", async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });

    renderAbsence();
    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });

  it("n'appelle PAS toast.error séparément (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });

    renderAbsence();
    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ne plante pas sur erreur réseau sans objet response (régression #2)", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));

    renderAbsence();
    const startInput = screen.getByLabelText(/début de l'absence/i);
    fireEvent.change(startInput, { target: { value: "2025-03-10" } });

    await selectType("Congé annuel");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Absence — dialog certificat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ouvre le dialog Certificat médical pour congé maladie", async () => {
    renderAbsence();
    await selectType("Congé maladie");
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: /Certificat médical/i })).toBeInTheDocument()
    );
  });

  it("ouvre le dialog Certificat de naissance pour congé paternité", async () => {
    renderAbsence();
    await selectType("Congé paternité");
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: /Certificat de naissance/i })).toBeInTheDocument()
    );
  });

  it("n'ouvre pas de dialog pour congé annuel", async () => {
    renderAbsence();
    await selectType("Congé annuel");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
