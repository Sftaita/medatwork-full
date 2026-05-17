/**
 * Tests for WeekTaskAllocation
 *
 * Covers:
 * — Retourne null quand isLoading=true
 * — Affiche Alert quand years est vide et pas en loading
 * — Rendu de WeekScheduleTable avec les données mappées
 * — Mapping residents → people (initiales, couleur palette)
 * — Mapping intervals → weeks (num, mois, année)
 * — Mapping yearWeekTemplates → postes
 * — Mapping assignments → rotation
 * — handleYearChange : met à jour residents/intervals/templates + reset pendingChange
 * — handleCellClick : ouvre le Menu au bon élément
 * — handleResidentAssignment : met à jour assignments + appelle l'API (create)
 * — handleRemoveAssignment : met à jour assignments + appelle l'API (delete)
 * — Assignation d'un résident déjà sur un autre poste la même semaine :
 *     supprime l'ancienne case ET crée la nouvelle en un seul appel API
 * — Menu affiche tous les résidents disponibles
 * — Menu affiche "Retirer l'assignation" uniquement si la case est occupée
 * — YearSelect affiché avec la bonne valeur
 * — todayWeekIdx : semaine courante calculée à partir de la date du jour
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeekTaskAllocation from "./WeekTaskAllocation";
import type { Assignments } from "@/store/weekDispatcherStore";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockAxios = vi.hoisted(() => ({
  get:  vi.fn(),
  post: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("../../../../../hooks/useAxiosPrivate", () => ({ default: () => mockAxios }));

vi.mock("../../../../../services/calendarApi", () => ({
  default: { dispatchWeek: () => ({ method: "post", url: "/dispatch" }) },
}));

vi.mock("../../../../../services/apiError", () => ({ handleApiError: vi.fn() }));

vi.mock("react-toastify", () => ({
  toast:         { success: vi.fn(), error: vi.fn() },
  toastSuccess:  {},
  toastError:    {},
}));
vi.mock("../../../../../doc/ToastParams", () => ({
  toastSuccess: {},
  toastError:   {},
}));

// WeekTemplateImport dialog — on ne le teste pas ici
vi.mock("./WeekTemplateImport", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="import-dialog" /> : null,
}));

// WeekScheduleTable — délègue intégralement à mockWST pour permettre mockImplementation par test
const mockWST = vi.hoisted(() => vi.fn());
vi.mock("./WeekScheduleTable", () => ({
  default: (props: any) => mockWST(props),
}));

// YearSelect
vi.mock("../../../../../components/YearSelect", () => ({
  default: ({ value, onChange, years }: any) => (
    <select data-testid="year-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map((y: any) => (
        <option key={y.id} value={y.id}>{y.title}</option>
      ))}
    </select>
  ),
}));

// ── Context store mock ────────────────────────────────────────────────────────

const makeAssignments = (): Assignments => ({
  1: { 10: { id: 1, residentId: 100, firstname: "Alice", lastname: "Martin", allowed: true } },
  2: { 10: null },
});

let mockStore: ReturnType<typeof makeMockStore>;

function makeMockStore(overrides: Partial<typeof mockStore> = {}) {
  return {
    currentYearId:       1,
    setCurrentYearId:    vi.fn(),
    years: [
      {
        yearId: 1,
        yearInfo: { title: "Chirurgie 2024-25", location: "CHU", period: "2024-2025" },
        residents: [
          { residentId: 100, firstname: "Alice", lastname: "Martin", allowed: true, id: 1 },
          { residentId: 101, firstname: "Bob",   lastname: "Dupont", allowed: true, id: 2 },
        ],
        weekIntervals: [
          { weekIntervalId: 10, dateOfStart: "2024-10-07", dateOfEnd: "2024-10-13", weekNumber: 41, monthNumber: 10, yearNumber: 2024 },
          { weekIntervalId: 11, dateOfStart: "2024-10-14", dateOfEnd: "2024-10-20", weekNumber: 42, monthNumber: 10, yearNumber: 2024 },
        ],
        yearWeekTemplates: [
          { yearWeekTemplateId: 1, title: "Chirurgie vasculaire", color: "#9C27B0", yearId: 1, weekTemplateId: 10, description: null },
          { yearWeekTemplateId: 2, title: "Urologie",            color: "#e85a6a", yearId: 1, weekTemplateId: 11, description: null },
        ],
        status: "active",
      },
    ],
    residents: [
      { residentId: 100, firstname: "Alice", lastname: "Martin", allowed: true, id: 1 },
      { residentId: 101, firstname: "Bob",   lastname: "Dupont", allowed: true, id: 2 },
    ],
    setResidents:        vi.fn(),
    intervals: [
      { weekIntervalId: 10, dateOfStart: "2024-10-07", dateOfEnd: "2024-10-13", weekNumber: 41, monthNumber: 10, yearNumber: 2024 },
      { weekIntervalId: 11, dateOfStart: "2024-10-14", dateOfEnd: "2024-10-20", weekNumber: 42, monthNumber: 10, yearNumber: 2024 },
    ],
    setInterval:         vi.fn(),
    yearWeekTemplates: [
      { yearWeekTemplateId: 1, title: "Chirurgie vasculaire", color: "#9C27B0", yearId: 1, weekTemplateId: 10, description: null },
      { yearWeekTemplateId: 2, title: "Urologie",            color: "#e85a6a", yearId: 1, weekTemplateId: 11, description: null },
    ],
    setYearWeekTemplates: vi.fn(),
    assignments:          makeAssignments(),
    // Exécute réellement le callback fonctionnel pour que les effets de bord (opsToSend) aient lieu
    setAssignments: vi.fn().mockImplementation(function(this: any, updater: any) {
      if (typeof updater === "function") {
        mockStore.assignments = updater(mockStore.assignments);
      } else {
        mockStore.assignments = updater;
      }
    }),
    pendingChange:        [],
    setPendingChange:     vi.fn(),
    ...overrides,
  };
}

vi.mock("../../../../../hooks/useWeekDispatcherContext", () => ({
  default: () => mockStore,
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

// Implémentation par défaut du mock WeekScheduleTable
const defaultWSTImpl = (props: any) => (
  <div data-testid="wst">
    {props.yearSelector}
    <button data-testid="cell-btn" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("tpl-1", 0, e)} />
    <button data-testid="add-btn"  onClick={() => props.onAddPoste?.()} />
  </div>
);

beforeEach(() => {
  vi.clearAllMocks();
  mockStore = makeMockStore();
  mockWST.mockImplementation(defaultWSTImpl);
  mockAxios.post.mockResolvedValue({ data: {} });
});

// ── Loading / empty states ────────────────────────────────────────────────────

describe("WeekTaskAllocation — états loading / vide", () => {
  it("affiche le skeleton quand isLoading=true", () => {
    // Depuis la refactorisation locale, le composant affiche WeekDispatcherSkeleton
    // plutôt que de retourner null, pour une meilleure UX
    const { container } = render(<WeekTaskAllocation isLoading />);
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector(".MuiSkeleton-root")).toBeInTheDocument();
  });

  it("affiche une Alert quand years est vide et non chargé", () => {
    mockStore = makeMockStore({ years: [] });
    render(<WeekTaskAllocation isLoading={false} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/aucune année en cours/i)).toBeInTheDocument();
  });

  it("affiche WeekScheduleTable quand les données sont disponibles", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    expect(screen.getByTestId("wst")).toBeInTheDocument();
  });
});

// ── Mapping des données ───────────────────────────────────────────────────────

describe("WeekTaskAllocation — mapping données → WeekScheduleTable", () => {
  it("passe les postes corrects (id=string, name=title)", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const { postes } = mockWST.mock.calls[0][0];
    expect(postes).toHaveLength(2);
    expect(postes[0]).toMatchObject({ id: "1", name: "Chirurgie vasculaire" });
    expect(postes[1]).toMatchObject({ id: "2", name: "Urologie" });
  });

  it("passe les semaines correctes (weekNumber, mois français)", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const { weeks } = mockWST.mock.calls[0][0];
    expect(weeks).toHaveLength(2);
    expect(weeks[0].num).toBe(41);
    expect(weeks[0].idx).toBe(0);
    expect(weeks[1].num).toBe(42);
    expect(weeks[1].idx).toBe(1);
  });

  it("passe les résidents comme people avec initiales en majuscules", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const { people } = mockWST.mock.calls[0][0];
    expect(people["100"]).toMatchObject({ name: "Alice Martin", initials: "AM" });
    expect(people["101"]).toMatchObject({ name: "Bob Dupont",   initials: "BD" });
  });

  it("chaque résident a une couleur issue de la palette", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const { people } = mockWST.mock.calls[0][0];
    expect(people["100"].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(people["101"].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("mappe assignments vers rotation (residentId comme string, null pour vide)", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const { rotation } = mockWST.mock.calls[0][0];
    // Poste 1, semaine index 0 (weekIntervalId=10) → Alice (100)
    expect(rotation["1"][0]).toBe("100");
    // Poste 2, semaine index 0 (weekIntervalId=10) → null
    expect(rotation["2"][0]).toBeNull();
  });

  it("passe le YearSelect dans yearSelector", () => {
    render(<WeekTaskAllocation isLoading={false} />);
    expect(screen.getByTestId("year-select")).toBeInTheDocument();
  });
});

// ── handleYearChange ──────────────────────────────────────────────────────────

describe("WeekTaskAllocation — handleYearChange", () => {
  it("appelle setCurrentYearId avec le nouvel id", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    const sel = screen.getByTestId("year-select");
    fireEvent.change(sel, { target: { value: "1" } });
    await waitFor(() => expect(mockStore.setCurrentYearId).toHaveBeenCalledWith(1));
  });

  it("appelle setResidents avec les résidents de la nouvelle année", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    fireEvent.change(screen.getByTestId("year-select"), { target: { value: "1" } });
    await waitFor(() => expect(mockStore.setResidents).toHaveBeenCalled());
  });

  it("appelle setInterval avec les intervalles de la nouvelle année", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    fireEvent.change(screen.getByTestId("year-select"), { target: { value: "1" } });
    await waitFor(() => expect(mockStore.setInterval).toHaveBeenCalled());
  });

  it("appelle setYearWeekTemplates avec les templates de la nouvelle année", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    fireEvent.change(screen.getByTestId("year-select"), { target: { value: "1" } });
    await waitFor(() => expect(mockStore.setYearWeekTemplates).toHaveBeenCalled());
  });
});

// ── handleCellClick → Menu ────────────────────────────────────────────────────

describe("WeekTaskAllocation — handleCellClick / Menu", () => {
  it("ouvre le menu avec les résidents au clic sur une cellule", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell-btn"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("liste tous les résidents dans le menu", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell-btn"));
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("Bob Dupont")).toBeInTheDocument();
  });

  it("affiche 'Retirer l'assignation' quand la cellule est occupée (poste 1, semaine 0)", async () => {
    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="cell-occupied" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("1", 0, e)} />
      </div>
    ));
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell-occupied"));
    expect(screen.getByText(/Retirer l.assignation/)).toBeInTheDocument();
  });
});

// ── handleResidentAssignment ──────────────────────────────────────────────────

describe("WeekTaskAllocation — handleResidentAssignment", () => {
  beforeEach(() => {
    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="cell" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("2", 0, e)} />
      </div>
    ));
  });

  it("appelle l'API avec method=create après assignation", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell"));
    await userEvent.click(screen.getByText("Alice Martin"));
    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith(
      "/dispatch",
      expect.arrayContaining([
        expect.objectContaining({ method: "create", residentId: 100 }),
      ])
    ));
  });

  it("met à jour setAssignments de façon optimiste", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell"));
    await userEvent.click(screen.getByText("Alice Martin"));
    expect(mockStore.setAssignments).toHaveBeenCalled();
  });

  it("ferme le menu après assignation", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell"));
    await userEvent.click(screen.getByText("Alice Martin"));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});

// ── handleRemoveAssignment ────────────────────────────────────────────────────

describe("WeekTaskAllocation — handleRemoveAssignment", () => {
  beforeEach(() => {
    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="cell-occupied" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("1", 0, e)} />
      </div>
    ));
  });

  it("appelle l'API avec method=delete après suppression", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell-occupied"));
    await userEvent.click(screen.getByText(/Retirer l.assignation/));
    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith(
      "/dispatch",
      expect.arrayContaining([
        expect.objectContaining({ method: "delete", residentId: 100 }),
      ])
    ));
  });

  it("met à jour setAssignments de façon optimiste (null)", async () => {
    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell-occupied"));
    await userEvent.click(screen.getByText(/Retirer l.assignation/));
    expect(mockStore.setAssignments).toHaveBeenCalled();
  });
});

// ── Résident déjà assigné sur un autre poste la même semaine ─────────────────

describe("WeekTaskAllocation — collision de résident (même semaine, autre poste)", () => {
  it("inclut un delete de l'ancien poste ET un create sur le nouveau en un seul appel API", async () => {
    // Assignations : poste 1 sem 0 = Alice (100), poste 2 sem 0 = vide
    // On assigne Alice sur poste 2 sem 0 → doit supprimer poste 1 sem 0

    mockStore = makeMockStore({
      assignments: {
        1: { 10: { id: 1, residentId: 100, firstname: "Alice", lastname: "Martin", allowed: true } },
        2: { 10: null },
      },
    });

    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="cell" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("2", 0, e)} />
      </div>
    ));

    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell"));
    await userEvent.click(screen.getByText("Alice Martin"));

    await waitFor(() => {
      const [, body] = mockAxios.post.mock.calls[0];
      const ops = body as Array<{ method: string; residentId: number; yearWeekTemplateId: number }>;
      const hasDelete = ops.some((o) => o.method === "delete" && o.residentId === 100 && o.yearWeekTemplateId === 1);
      const hasCreate = ops.some((o) => o.method === "create" && o.residentId === 100 && o.yearWeekTemplateId === 2);
      expect(hasDelete).toBe(true);
      expect(hasCreate).toBe(true);
    });
  });
});

// ── Import de poste ───────────────────────────────────────────────────────────

describe("WeekTaskAllocation — import dialog", () => {
  it("ouvre le dialog WeekTemplateImport au clic sur onAddPoste", async () => {
    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="add" onClick={() => props.onAddPoste?.()} />
      </div>
    ));
    render(<WeekTaskAllocation isLoading={false} />);
    expect(screen.queryByTestId("import-dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("add"));
    expect(screen.getByTestId("import-dialog")).toBeInTheDocument();
  });
});

// ── Résilience API ────────────────────────────────────────────────────────────

describe("WeekTaskAllocation — résilience erreur API", () => {
  it("affiche un toast d'erreur si l'API échoue", async () => {
    const { toast } = await import("react-toastify");
    mockAxios.post.mockRejectedValueOnce(new Error("Network Error"));

    mockWST.mockImplementation((props: any) => (
      <div data-testid="wst">
        {props.yearSelector}
        <button data-testid="cell" onClick={(e: React.MouseEvent<HTMLElement>) => props.onCellClick?.("2", 0, e)} />
      </div>
    ));

    render(<WeekTaskAllocation isLoading={false} />);
    await userEvent.click(screen.getByTestId("cell"));
    await userEvent.click(screen.getByText("Bob Dupont"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
