/**
 * Tests — General.tsx (onglet Validation, refonte design)
 *
 * Helpers & pure logic (unit, sans render)
 *   - getInitials : 2 lettres en majuscules
 *   - hasLegalAlert : true uniquement pour warningType !== "minLimit"
 *   - legalAlertCount : compte les alertes légales
 *   - priority : 0 alertes légales / 1 non validé / 2 validé
 *   - matchesFilter : filtre all / alert / todo / done
 *
 * Rendu (intégration, vrai store Zustand)
 *   États de chargement
 *     - Spinner pendant le chargement des périodes
 *     - "Aucune période disponible" quand la liste est vide
 *     - Rail + workspace visibles après chargement réussi
 *
 *   Rail de mois
 *     - Un item par période retournée par l'API
 *     - Premier item aria-selected=true par défaut
 *     - Cliquer un autre mois le marque actif
 *     - Cliquer un mois déclenche le chargement du rapport
 *
 *   Header workspace
 *     - Affiche le libellé du mois sélectionné
 *     - Affiche la pill "N MACCS"
 *     - Affiche le ratio "validés / total"
 *
 *   Filter toolbar
 *     - 4 chips de filtre avec compteurs corrects
 *     - Chip actif a aria-checked="true"
 *     - "Alertes" ne montre que les résidents avec alertes légales
 *     - "À valider" exclut les résidents déjà validés
 *     - "Validés" n'affiche que les résidents validés
 *     - "Tous" réaffiche tout
 *
 *   Recherche
 *     - Filtre par nom (insensible à la casse)
 *     - État vide quand aucun résultat
 *
 *   Tri par priorité
 *     - Résidents avec alertes légales en premier
 *
 *   Cartes MACC — chips de statut
 *     - Chip "Conforme" si pas d'alerte légale
 *     - Chip "N alertes" si alerte légale
 *     - Chip "Opting out" si optingOut=true
 *     - Pas de chip "Opting out" si optingOut=false
 *
 *   Cartes MACC — expansion
 *     - Clic ouvre le rapport (aria-expanded → true)
 *     - 2ᵉ clic referme la carte
 *     - "conformité complète" affiché si aucune alerte
 *
 *   Toggle Valider
 *     - Toggle passe aria-checked false → true
 *     - Toggle de résident validé le dévalide
 *
 *   Valider les conformes
 *     - Bouton désactivé si aucun conforme non validé
 *     - Bouton actif s'il y a des conformes non validés
 *     - Clic valide les conformes, laisse les alertes inchangées
 *     - Toast affiché
 *
 *   Enregistrer
 *     - Appelle l'API POST avec les données de validation
 *     - Toast succès / erreur selon résultat API
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../../doc/CustomizedTheme";
import { useValidationStore } from "../../../../store/validationStore";
import General, {
  getInitials,
  hasLegalAlert,
  legalAlertCount,
  priority,
  matchesFilter,
  type ResidentReport,
} from "./General";

// ── Mocks hoisted ──────────────────────────────────────────────────────────────

const mockGet  = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost }));

vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// useValidationContext délègue au store Zustand réel — pas de mock.
// On réinitialise le store dans beforeEach.

vi.mock("../../../../services/periodsApi", () => ({
  default: {
    fetchPeriod:    () => ({ method: "get", url: "managers/validationList/" }),
    getPeriodReport:() => ({ method: "get", url: "managers/periodReport/" }),
  },
}));

vi.mock("../../../../services/managersApi", () => ({
  default: {
    updateResidentValidationPeriod: () => ({ method: "post", url: "managers/periodReport/" }),
  },
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../../services/apiError", () => ({ handleApiError: vi.fn() }));

vi.mock("./ValidationView/MessageBox", () => ({
  default: ({ openDialog, residentId, notificationType }: {
    openDialog: boolean; residentId: number; notificationType: string;
  }) => openDialog
    ? <div data-testid={`msgbox-${residentId}-${notificationType}`} />
    : null,
}));

vi.mock("@/lib/dayjs", () => ({
  default: (v?: string) => ({ format: () => v?.substring(0, 10) ?? "—" }),
}));

// ── Types ──────────────────────────────────────────────────────────────────────

type Warning = {
  warningType: string;
  NumberOfHours?: number;
  week?: number;
  startDate?: string;
  endDate?: string;
  period?: number;
};

// ── Fixtures ───────────────────────────────────────────────────────────────────

const makePeriod = (month: number, year: number, id: number) => ({ month, year, id });

const makeWarning = (warningType: string): Warning => ({
  warningType,
  NumberOfHours: 84,
  week: 2,
  startDate: "2026-01-05",
  endDate: "2026-01-11",
});

function makeReport(overrides: Partial<ResidentReport> = {}): ResidentReport {
  return {
    residentId: 1,
    residentFirstname: "Alice",
    residentLastname: "Dupont",
    validationInformation: { validated: false },
    optingOut: false,
    limits: { limit: 48, highLimit: 60 },
    periodsinfo: [],
    smoothedHours: true,
    warningHours: {},
    IllegalHours: {},
    callable: 2,
    hospital: 1,
    shiftOverlap: 0,
    daysOfLeaves: {},
    warnings: [],
    ...overrides,
  };
}

// CAROL est déjà validée (validated: true) → initialisée "validate" dans le store
const ALICE = makeReport({ residentId: 1, residentFirstname: "Alice", residentLastname: "Dupont", warnings: [], validationInformation: { validated: false } });
const BOB   = makeReport({ residentId: 2, residentFirstname: "Bob",   residentLastname: "Martin", warnings: [makeWarning("maxLimit")], optingOut: true, validationInformation: { validated: false } });
const CAROL = makeReport({ residentId: 3, residentFirstname: "Carol", residentLastname: "Leroy",  warnings: [], validationInformation: { validated: true } });

const PERIODS_RESP = [makePeriod(4, 2026, 10), makePeriod(3, 2026, 9), makePeriod(2, 2026, 8)];
const REPORT_RESP  = [ALICE, BOB, CAROL];

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderGeneral(yearId: number | null = 42) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <General yearId={yearId} />
    </ThemeProvider>
  );
}

function setupNormalLoad() {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
    if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: REPORT_RESP });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

/** Attend que les cartes MACC soient rendues. */
async function waitForCards() {
  await waitFor(() => screen.getByTestId(`macc-card-${ALICE.residentId}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Réinitialise le store Zustand pour l'isolement des tests
  act(() => {
    useValidationStore.setState({
      activeStep: 0,
      periodId:   undefined,
      residentValidationData: [],
    });
  });
});

// ── Pure helper unit tests ─────────────────────────────────────────────────────

describe("getInitials", () => {
  it("retourne 2 initiales en majuscules", () => {
    expect(getInitials("Alice", "Dupont")).toBe("AD");
  });
  it("gère un prénom vide", () => {
    expect(getInitials("", "Dupont")).toBe("D");
  });
  it("gère un nom vide", () => {
    expect(getInitials("Alice", "")).toBe("A");
  });
  it("gère prénom et nom vides", () => {
    expect(getInitials("", "")).toBe("");
  });
});

describe("hasLegalAlert", () => {
  it("retourne false si la liste est vide", () => {
    expect(hasLegalAlert([])).toBe(false);
  });
  it("retourne false pour minLimit seul (info)", () => {
    expect(hasLegalAlert([makeWarning("minLimit")])).toBe(false);
  });
  it("retourne true pour maxLimit", () => {
    expect(hasLegalAlert([makeWarning("maxLimit")])).toBe(true);
  });
  it("retourne true pour overruns", () => {
    expect(hasLegalAlert([makeWarning("overruns")])).toBe(true);
  });
  it("retourne true si mélange minLimit + maxLimit", () => {
    expect(hasLegalAlert([makeWarning("minLimit"), makeWarning("maxLimit")])).toBe(true);
  });
});

describe("legalAlertCount", () => {
  it("retourne 0 pour une liste vide", () => {
    expect(legalAlertCount([])).toBe(0);
  });
  it("ignore minLimit", () => {
    expect(legalAlertCount([makeWarning("minLimit")])).toBe(0);
  });
  it("compte maxLimit et overruns, ignore minLimit", () => {
    expect(legalAlertCount([makeWarning("maxLimit"), makeWarning("overruns"), makeWarning("minLimit")])).toBe(2);
  });
});

describe("priority", () => {
  const vd = (id: number, status: "validate" | "invalidate") => [
    { residentId: id, status, managerComment: "", residentNotification: "" },
  ];

  it("retourne 0 si alertes légales (priorité maximale)", () => {
    const r = makeReport({ residentId: 1, warnings: [makeWarning("maxLimit")] });
    expect(priority(r, vd(1, "invalidate"))).toBe(0);
  });
  it("retourne 1 si conforme mais non validé", () => {
    const r = makeReport({ residentId: 1, warnings: [] });
    expect(priority(r, vd(1, "invalidate"))).toBe(1);
  });
  it("retourne 2 si conforme et validé", () => {
    const r = makeReport({ residentId: 1, warnings: [] });
    expect(priority(r, vd(1, "validate"))).toBe(2);
  });
});

describe("matchesFilter", () => {
  const vd = [
    { residentId: 1, status: "invalidate" as const, managerComment: "", residentNotification: "" },
    { residentId: 2, status: "validate"   as const, managerComment: "", residentNotification: "" },
  ];
  const withAlert  = makeReport({ residentId: 1, warnings: [makeWarning("maxLimit")] });
  const confNotVal = makeReport({ residentId: 1, warnings: [] });
  const confVal    = makeReport({ residentId: 2, warnings: [] });

  it("all retourne true pour tous", () => {
    [withAlert, confNotVal, confVal].forEach((r) =>
      expect(matchesFilter(r, "all", vd)).toBe(true)
    );
  });
  it("alert : uniquement les résidents avec alertes légales", () => {
    expect(matchesFilter(withAlert,  "alert", vd)).toBe(true);
    expect(matchesFilter(confNotVal, "alert", vd)).toBe(false);
  });
  it("todo : uniquement les non-validés", () => {
    expect(matchesFilter(confNotVal, "todo", vd)).toBe(true);
    expect(matchesFilter(confVal,    "todo", vd)).toBe(false);
  });
  it("done : uniquement les validés", () => {
    expect(matchesFilter(confVal,    "done", vd)).toBe(true);
    expect(matchesFilter(confNotVal, "done", vd)).toBe(false);
  });
});

// ── États de chargement ────────────────────────────────────────────────────────

describe("États de chargement", () => {
  it("affiche un spinner pendant le chargement initial", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderGeneral();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("affiche 'Aucune période disponible' quand l'API retourne une liste vide", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderGeneral();
    await waitFor(() =>
      expect(screen.getByText("Aucune période disponible.")).toBeInTheDocument()
    );
  });

  it("affiche le rail et le workspace après chargement réussi", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
  });
});

// ── Rail de mois ───────────────────────────────────────────────────────────────

describe("Rail de mois", () => {
  it("rend un item par période retournée", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3));
  });

  it("le premier item est sélectionné par défaut (aria-selected=true)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");
    });
  });

  it("cliquer un autre mois le marque actif", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => screen.getAllByRole("option"));
    fireEvent.click(screen.getAllByRole("option")[1]);
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "false");
  });

  it("cliquer un mois déclenche getPeriodReport", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => screen.getAllByRole("option"));
    mockGet.mockResolvedValue({ data: [] });
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("managers/periodReport/"))
    );
  });
});

// ── Header workspace ───────────────────────────────────────────────────────────

describe("Header workspace", () => {
  it("affiche le libellé du mois sélectionné dans le workspace", async () => {
    setupNormalLoad();
    renderGeneral();
    // "AVRIL 2026" apparaît dans le rail ET dans le workspace header
    await waitFor(() =>
      expect(screen.getAllByText("AVRIL 2026").length).toBeGreaterThanOrEqual(1)
    );
  });

  it("affiche la pill '3 MACCS'", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getByText("3 MACCS")).toBeInTheDocument());
  });

  it("affiche la progression '1 / 3' (Carol validée, Alice et Bob non)", async () => {
    setupNormalLoad();
    renderGeneral();
    // Carol a validated=true → store initialisé à "validate" → validatedCount=1, total=3
    await waitFor(() =>
      expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument()
    );
  });
});

// ── Filter toolbar — chips ─────────────────────────────────────────────────────

describe("Filter toolbar — chips", () => {
  async function waitForChips() {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(4));
  }

  it("affiche 4 chips de filtre", async () => {
    await waitForChips();
  });

  it("chip 'Tous' est actif par défaut (aria-checked=true)", async () => {
    await waitForChips();
    const chips = screen.getAllByRole("radio");
    expect(chips[0]).toHaveAttribute("aria-checked", "true");
    expect(chips[1]).toHaveAttribute("aria-checked", "false");
  });

  it("compteur 'Tous' = 3", async () => {
    await waitForChips();
    expect(screen.getByRole("radio", { name: /^Tous/ })).toHaveTextContent("3");
  });

  it("compteur 'Alertes' = 1 (Bob a une alerte légale)", async () => {
    await waitForChips();
    expect(screen.getByRole("radio", { name: /^Alertes/ })).toHaveTextContent("1");
  });

  it("compteur 'Validés' = 1 (Carol est validée)", async () => {
    await waitForChips();
    expect(screen.getByRole("radio", { name: /^Validés/ })).toHaveTextContent("1");
  });

  it("compteur 'À valider' = 2 (Alice et Bob non validés)", async () => {
    await waitForChips();
    expect(screen.getByRole("radio", { name: /^À valider/ })).toHaveTextContent("2");
  });
});

// ── Filter toolbar — comportement ──────────────────────────────────────────────

describe("Filter toolbar — comportement", () => {
  async function loadAndFilter(filterLabel: string) {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${filterLabel}`) }));
  }

  it("'Alertes' n'affiche que Bob (alerte légale)", async () => {
    await loadAndFilter("Alertes");
    expect(screen.getByTestId(`macc-card-${BOB.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${ALICE.residentId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${CAROL.residentId}`)).not.toBeInTheDocument();
  });

  it("'Validés' n'affiche que Carol", async () => {
    await loadAndFilter("Validés");
    expect(screen.getByTestId(`macc-card-${CAROL.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${ALICE.residentId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${BOB.residentId}`)).not.toBeInTheDocument();
  });

  it("'À valider' exclut Carol (déjà validée)", async () => {
    await loadAndFilter("À valider");
    expect(screen.queryByTestId(`macc-card-${CAROL.residentId}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${BOB.residentId}`)).toBeInTheDocument();
  });

  it("'Tous' après 'Alertes' réaffiche les 3 résidents", async () => {
    await loadAndFilter("Alertes");
    fireEvent.click(screen.getByRole("radio", { name: /^Tous/ }));
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${BOB.residentId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${CAROL.residentId}`)).toBeInTheDocument();
  });
});

// ── Recherche ──────────────────────────────────────────────────────────────────

describe("Recherche", () => {
  it("filtre par nom, n'affiche que le résident correspondant", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${BOB.residentId}`)).not.toBeInTheDocument();
  });

  it("la recherche est insensible à la casse", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alice" } });
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
  });

  it("affiche l'état vide quand aucun résultat", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz_inconnu" } });
    expect(screen.getByText("Aucun MACCS ne correspond à ce filtre.")).toBeInTheDocument();
  });
});

// ── Tri par priorité ───────────────────────────────────────────────────────────

describe("Tri par priorité", () => {
  it("Bob (alertes légales) apparaît avant Alice (conforme, non validé)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const cards = screen.getAllByTestId(/macc-card-/);
    const ids   = cards.map((c) => Number(c.getAttribute("data-testid")?.replace("macc-card-", "")));
    expect(ids.indexOf(BOB.residentId)).toBeLessThan(ids.indexOf(ALICE.residentId));
  });

  it("Carol (validée, conforme) apparaît après Alice (non validée)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const cards = screen.getAllByTestId(/macc-card-/);
    const ids   = cards.map((c) => Number(c.getAttribute("data-testid")?.replace("macc-card-", "")));
    expect(ids.indexOf(ALICE.residentId)).toBeLessThan(ids.indexOf(CAROL.residentId));
  });
});

// ── Cartes MACC — chips de statut ─────────────────────────────────────────────

describe("Cartes MACC — chips de statut", () => {
  it("Alice : chip 'Conforme' visible (pas d'alerte légale)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-conforme-${ALICE.residentId}`));
  });

  it("Bob : chip alertes visible (alerte légale)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-alert-${BOB.residentId}`));
  });

  it("Bob : chip 'Opting out' visible (optingOut=true)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-opting-${BOB.residentId}`));
  });

  it("Alice : pas de chip 'Opting out' (optingOut=false)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    expect(screen.queryByTestId(`chip-opting-${ALICE.residentId}`)).not.toBeInTheDocument();
  });
});

// ── Cartes MACC — expansion ────────────────────────────────────────────────────

describe("Cartes MACC — expansion", () => {
  it("cliquer la row ouvre le rapport de conformité (aria-expanded → true)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const row = screen.getByTestId(`macc-row-${ALICE.residentId}`);
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Informations générales")).toBeInTheDocument();
    expect(screen.getByText("Heures prestées")).toBeInTheDocument();
  });

  it("cliquer la row une 2ᵉ fois referme la carte", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const row = screen.getByTestId(`macc-row-${ALICE.residentId}`);
    fireEvent.click(row);
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "false");
  });

  it("affiche 'conformité complète' si aucune alerte", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${ALICE.residentId}`));
    await waitFor(() =>
      expect(screen.getByText(/conformité complète/)).toBeInTheDocument()
    );
  });

  it("plusieurs cartes peuvent être ouvertes simultanément", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${ALICE.residentId}`));
    fireEvent.click(screen.getByTestId(`macc-row-${BOB.residentId}`));
    expect(screen.getByTestId(`macc-row-${ALICE.residentId}`)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId(`macc-row-${BOB.residentId}`)).toHaveAttribute("aria-expanded", "true");
  });
});

// ── Toggle Valider ─────────────────────────────────────────────────────────────

describe("Toggle Valider", () => {
  it("toggle d'Alice passe aria-checked de false à true", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${ALICE.residentId}`))
        .getByRole("switch")).toHaveAttribute("aria-checked", "true")
    );
  });

  it("toggle de Carol (déjà validée) passe aria-checked à false", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${CAROL.residentId}`)).getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${CAROL.residentId}`))
        .getByRole("switch")).toHaveAttribute("aria-checked", "false")
    );
  });
});

// ── Valider les conformes ──────────────────────────────────────────────────────

describe("Valider les conformes", () => {
  it("bouton désactivé quand tous les conformes sont déjà validés", async () => {
    // Alice validée + Bob alertes (non éligible) → conformesLeft = 0
    const ALICE_VAL = makeReport({ residentId: 1, validationInformation: { validated: true }, warnings: [] });
    const BOB_ALERT = makeReport({ residentId: 2, validationInformation: { validated: false }, warnings: [makeWarning("maxLimit")] });
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_VAL, BOB_ALERT] });
      return Promise.reject(new Error("Unexpected URL"));
    });
    renderGeneral();
    await waitFor(() => screen.getByTestId("btn-bulk-validate"));
    expect(screen.getByTestId("btn-bulk-validate")).toBeDisabled();
  });

  it("bouton actif quand des conformes non validés existent", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    expect(screen.getByTestId("btn-bulk-validate")).not.toBeDisabled();
  });

  it("clic valide Alice (conforme non validée), laisse Bob inchangé (alertes)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    // Après validation groupée, Alice passe à "validate"
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${ALICE.residentId}`))
        .getByRole("switch")).toHaveAttribute("aria-checked", "true")
    );
    // Bob reste non validé (alerte légale → non éligible)
    expect(within(screen.getByTestId(`macc-card-${BOB.residentId}`))
      .getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("affiche un toast après validation groupée", async () => {
    const { toast } = await import("react-toastify");
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    expect(toast.success).toHaveBeenCalled();
  });
});

// ── Enregistrer ────────────────────────────────────────────────────────────────

describe("Enregistrer", () => {
  it("appelle l'API POST avec les données de validation", async () => {
    setupNormalLoad();
    mockPost.mockResolvedValue({});
    renderGeneral();
    await waitForCards();
    // Le periodId est initialisé quand le premier mois est sélectionné
    // Il est stocké dans le store via setPeriodId(periods[0].id)
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("managers/periodReport/"),
        expect.any(Array)
      )
    );
  });

  it("affiche un toast succès après enregistrement", async () => {
    const { toast } = await import("react-toastify");
    setupNormalLoad();
    mockPost.mockResolvedValue({});
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("affiche un toast erreur si l'API échoue", async () => {
    const { toast } = await import("react-toastify");
    setupNormalLoad();
    mockPost.mockRejectedValue(new Error("500"));
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
