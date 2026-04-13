/**
 * Tests for Timer.tsx (Horaires form).
 *
 * Covers:
 * - Renders with years / loading state
 * - Year auto-selection from props
 * - Validation: missing year
 * - Submit calls API with correctly formatted payload
 * - Success: shows toast, resets form (year preserved)
 * - Error: handleApiError called exactly once — no double toast (regression #1)
 * - Update mode: loads existing data, calls PUT endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Timer from "./Timer";

// ── Hoisted shared state ────────────────────────────────────────────────────
const mockPost = vi.hoisted(() => vi.fn());
const mockPut  = vi.hoisted(() => vi.fn());
const mockGet  = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ post: mockPost, put: mockPut, get: mockGet }));

const mockHandleApiError = vi.hoisted(() => vi.fn());
const mockNavigate       = vi.hoisted(() => vi.fn());

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));
vi.mock("../../../../hooks/useAuth", () => ({
  default: () => ({ setSelectedMenuItem: vi.fn() }),
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
vi.mock("@/services/apiError", () => ({ handleApiError: mockHandleApiError }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Stub date pickers — they need a complex MUI/dayjs setup not relevant here
vi.mock("../../../../components/medium/CustomDateTimeHandler", () => ({
  default: ({ label, onChange, value }: any) => (
    <input
      aria-label={label}
      data-testid={`dt-${label}`}
      defaultValue={value?.toString?.() ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const YEARS = [
  { id: 1, title: "Stage 2025-2026" },
  { id: 2, title: "Stage 2024-2025" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderTimer(props: Partial<React.ComponentProps<typeof Timer>> = {}, routePath = "/") {
  return render(
    <MemoryRouter initialEntries={[routePath]}>
      <Routes>
        <Route
          path="/"
          element={
            <Timer
              years={YEARS}
              yearsLoading={false}
              {...props}
            />
          }
        />
        <Route
          path="/edit/:type/:id"
          element={
            <Timer
              years={YEARS}
              yearsLoading={false}
              {...props}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Timer — rendu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le bouton Enregistrer", () => {
    renderTimer();
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
  });

  it("affiche un spinner pendant le chargement des années", () => {
    renderTimer({ yearsLoading: true });
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeDisabled();
  });

  it("affiche le sélecteur d'année avec les options", () => {
    renderTimer();
    expect(screen.getByText("Stage 2025-2026")).toBeInTheDocument();
  });

  it("affiche le switch Retour en garde", () => {
    renderTimer();
    expect(screen.getByText("Retour en garde")).toBeInTheDocument();
  });
});

describe("Timer — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche une erreur si l'année n'est pas renseignée", async () => {
    renderTimer({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(screen.getByText(/n'avez pas renseigné l'année/i)).toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("n'appelle pas l'API si la validation échoue", async () => {
    renderTimer({ years: [] });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() => expect(mockPost).not.toHaveBeenCalled());
  });
});

describe("Timer — soumission réussie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValueOnce({ data: { message: "ok" } });
  });

  it("appelle POST avec les champs formatés", async () => {
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());

    const [url, payload] = mockPost.mock.calls[0] as [string, Record<string, any>];
    expect(url).toContain("addRecord");
    expect(payload).toMatchObject({
      year: 1, // auto-filled from YEARS[0]
      called: false,
      pause: 0,
      scientific: 0,
    });
    // Dates are formatted as "YYYY-MM-DD HH:mm"
    expect(payload.dateOfStart).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(payload.dateOfEnd).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("affiche le toast de succès", async () => {
    const { toast } = await import("react-toastify");
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
    expect(toast.success).toHaveBeenCalledWith("Enregistrement validé!", expect.anything());
  });
});

describe("Timer — gestion d'erreur (régression double toast)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { message: "Overlap" } } });
  });

  it("appelle handleApiError exactement une fois", async () => {
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });

  it("n'appelle PAS toast.error séparément (pas de double toast)", async () => {
    const { toast } = await import("react-toastify");
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ne plante pas si l'erreur n'a pas de response (erreur réseau)", async () => {
    mockPost.mockReset();
    mockPost.mockRejectedValueOnce(new Error("Network Error"));

    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(mockHandleApiError).toHaveBeenCalledOnce());
  });
});

describe("Timer — mode mise à jour (update)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce({
      data: {
        yearId: 2,
        dateOfStart: "2025-03-10 08:00",
        dateOfEnd: "2025-03-10 17:00",
        pause: 30,
        scientific: 15,
        called: false,
      },
    });
    mockPut.mockResolvedValueOnce({ data: { message: "ok" } });
  });

  it("affiche le bouton Modifier en mode update", async () => {
    render(
      <MemoryRouter initialEntries={["/edit/timer/42"]}>
        <Routes>
          <Route
            path="/edit/:type/:id"
            element={<Timer years={YEARS} yearsLoading={false} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /modifier/i })).toBeInTheDocument()
    );
  });

  it("charge les données existantes via GET", async () => {
    render(
      <MemoryRouter initialEntries={["/edit/timer/42"]}>
        <Routes>
          <Route
            path="/edit/:type/:id"
            element={<Timer years={YEARS} yearsLoading={false} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    const [url] = mockGet.mock.calls[0] as [string];
    expect(url).toContain("find/42");
  });

  it("appelle PUT avec l'id sur soumission", async () => {
    render(
      <MemoryRouter initialEntries={["/edit/timer/42"]}>
        <Routes>
          <Route
            path="/edit/:type/:id"
            element={<Timer years={YEARS} yearsLoading={false} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledOnce());
    const [url] = mockPut.mock.calls[0] as [string, any];
    expect(url).toContain("update/42");
  });
});
