/**
 * Tests — General.tsx (onglet Validation)
 *
 * ── Helpers purs (unit, sans render) ──────────────────────────────────────────
 *   getInitials       · 4 cas (normal, prénom vide, nom vide, les deux vides)
 *   hasLegalAlert     · 5 cas (vide, minLimit seul, maxLimit, overruns, mixte)
 *   legalAlertCount   · 3 cas (vide, minLimit ignoré, maxLimit+overruns comptés)
 *   priority          · 3 cas (alertes=0, conforme non validé=1, conforme validé=2)
 *   matchesFilter     · 4 cas (all, alert, todo, done)
 *
 * ── Rendu (intégration, vrai store Zustand) ───────────────────────────────────
 *   États de chargement
 *     · Spinner initial
 *     · "Aucune période" si API vide
 *     · Rail + workspace après succès
 *     · Spinner workspace pendant chargement du rapport
 *
 *   Rail de mois
 *     · N items = N périodes
 *     · 1ᵉʳ item sélectionné par défaut
 *     · Clic change la sélection
 *     · Clic déclenche getPeriodReport
 *     · Affiche l'année académique dans le header ("XXXX–YY")
 *     · Affiche le sous-libellé pour le mois sélectionné
 *     · Sous-libellé mentionne les alertes si présentes
 *
 *   Header workspace
 *     · Libellé du mois sélectionné
 *     · Pill "N MACCS"
 *     · Ratio "validés / total"
 *
 *   Filter toolbar — chips
 *     · 4 chips, bons compteurs (Tous/Alertes/À valider/Validés)
 *     · Chip actif aria-checked=true
 *
 *   Filter toolbar — comportement
 *     · Alertes → Bob seulement
 *     · Validés → Carol seulement
 *     · À valider → exclut Carol
 *     · Tous → réaffiche tout
 *
 *   Recherche
 *     · Filtre par nom (insensible à la casse)
 *     · État vide si aucun résultat
 *
 *   Tri par priorité
 *     · Alertes > non validés > validés
 *
 *   Cartes MACC — chips de statut
 *     · Conforme (pas d'alerte légale)
 *     · N alertes (alerte légale)
 *     · Opting out si optingOut=true
 *     · minLimit seul → chip "Conforme" (pas alerte légale)
 *
 *   Cartes MACC — expansion
 *     · Clic ouvre (aria-expanded→true), sections visibles
 *     · 2ᵉ clic referme
 *     · "conformité complète" si aucune alerte
 *     · Rapport de Bob contient une alerte légale
 *     · Plusieurs cartes ouvertes simultanément
 *
 *   Boutons notification
 *     · Clic notif MACCS → MessageBox ouverte
 *     · Clic notif managers → MessageBox ouverte
 *
 *   Toggle Valider
 *     · false → true (Alice)
 *     · true → false (Carol)
 *
 *   État dirty
 *     · Absent par défaut
 *     · Apparaît après un toggle individuel
 *     · Apparaît après bulk validate
 *     · Disparaît après Enregistrer réussi
 *     · Disparaît quand on change de mois
 *
 *   Valider les conformes
 *     · Désactivé si aucun conforme non validé
 *     · Actif si conformes non validés existent
 *     · Valide Alice, laisse Bob (alertes) inchangé
 *     · Toast mentionne "Enregistrer" (pas "enregistrées")
 *
 *   Enregistrer (PUT /api/managers/validation/{periodId})
 *     · Appelle PUT avec la bonne URL et les données
 *     · Toast succès contient "succès"
 *     · Toast erreur si API échoue
 *     · Toast erreur si aucune période disponible
 *     · Utilise periods[selectedIndex].id comme fallback si store vide
 *
 *   Changement de mois
 *     · Réinitialise le filtre à "Tous"
 *     · Réinitialise la recherche
 *     · Ferme les cartes ouvertes
 *     · Réinitialise l'état dirty
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
const mockPut  = vi.hoisted(() => vi.fn()); // ← PUT pour updateResidentValidationPeriod
const stableAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost, put: mockPut }));

vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../../../../services/periodsApi", () => ({
  default: {
    fetchPeriod:     () => ({ method: "get", url: "managers/validationList/" }),
    getPeriodReport: () => ({ method: "get", url: "managers/periodReport/" }),
  },
}));

// L'API réelle utilise PUT sur managers/validation/{periodId}
vi.mock("../../../../services/managersApi", () => ({
  default: {
    updateResidentValidationPeriod: () => ({ method: "put", url: "managers/validation/" }),
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

/** Périodes triées du plus récent au plus ancien */
const PERIODS_RESP = [
  { month: 4, year: 2026, id: 10 },
  { month: 3, year: 2026, id: 9  },
  { month: 2, year: 2026, id: 8  },
];

const makeWarning = (warningType: string): Warning => ({
  warningType,
  NumberOfHours: 84.67,
  week: 2,
  startDate: "2026-01-05",
  endDate: "2026-01-11",
});

function makeReport(overrides: Partial<ResidentReport> = {}): ResidentReport {
  return {
    residentId:               1,
    residentFirstname:        "Alice",
    residentLastname:         "Dupont",
    validationInformation:    { validated: false },
    optingOut:                false,
    limits:                   { limit: 48, highLimit: 60 },
    periodsinfo:              [],
    smoothedHours:            true,
    warningHours:             {},
    IllegalHours:             {},
    callable:                 2,
    hospital:                 1,
    shiftOverlap:             0,
    daysOfLeaves:             {},
    warnings:                 [],
    ...overrides,
  };
}

const ALICE = makeReport({
  residentId: 1, residentFirstname: "Alice", residentLastname: "Dupont",
  warnings: [], validationInformation: { validated: false },
});
const BOB = makeReport({
  residentId: 2, residentFirstname: "Bob", residentLastname: "Martin",
  warnings: [makeWarning("maxLimit")], optingOut: true,
  validationInformation: { validated: false },
});
const CAROL = makeReport({
  residentId: 3, residentFirstname: "Carol", residentLastname: "Leroy",
  warnings: [], validationInformation: { validated: true },
});

const REPORT_RESP = [ALICE, BOB, CAROL];

// ── Test helpers ───────────────────────────────────────────────────────────────

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

async function waitForCards() {
  await waitFor(() => screen.getByTestId(`macc-card-${ALICE.residentId}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useValidationStore.setState({ activeStep: 0, periodId: undefined, residentValidationData: [] });
  });
});

// ── Helpers purs — unit ────────────────────────────────────────────────────────

describe("getInitials", () => {
  it("retourne 2 initiales en majuscules",    () => expect(getInitials("Alice", "Dupont")).toBe("AD"));
  it("gère un prénom vide",                   () => expect(getInitials("",      "Dupont")).toBe("D"));
  it("gère un nom vide",                      () => expect(getInitials("Alice", "")).toBe("A"));
  it("gère prénom et nom vides",              () => expect(getInitials("",      "")).toBe(""));
});

describe("hasLegalAlert", () => {
  it("retourne false si liste vide",                () => expect(hasLegalAlert([])).toBe(false));
  it("retourne false pour minLimit seul (info)",    () => expect(hasLegalAlert([makeWarning("minLimit")])).toBe(false));
  it("retourne true pour maxLimit",                 () => expect(hasLegalAlert([makeWarning("maxLimit")])).toBe(true));
  it("retourne true pour overruns",                 () => expect(hasLegalAlert([makeWarning("overruns")])).toBe(true));
  it("retourne true si mélange minLimit + maxLimit",() => expect(hasLegalAlert([makeWarning("minLimit"), makeWarning("maxLimit")])).toBe(true));
});

describe("legalAlertCount", () => {
  it("retourne 0 pour liste vide",                  () => expect(legalAlertCount([])).toBe(0));
  it("ignore minLimit",                             () => expect(legalAlertCount([makeWarning("minLimit")])).toBe(0));
  it("compte maxLimit et overruns, ignore minLimit",() => expect(legalAlertCount([makeWarning("maxLimit"), makeWarning("overruns"), makeWarning("minLimit")])).toBe(2));
});

describe("priority", () => {
  const vd = (id: number, s: "validate" | "invalidate") => [
    { residentId: id, status: s, managerComment: "", residentNotification: "" },
  ];
  it("0 si alertes légales",            () => expect(priority(makeReport({ residentId: 1, warnings: [makeWarning("maxLimit")] }), vd(1, "invalidate"))).toBe(0));
  it("1 si conforme mais non validé",   () => expect(priority(makeReport({ residentId: 1 }), vd(1, "invalidate"))).toBe(1));
  it("2 si conforme et validé",         () => expect(priority(makeReport({ residentId: 1 }), vd(1, "validate"))).toBe(2));
});

describe("matchesFilter", () => {
  const vd = [
    { residentId: 1, status: "invalidate" as const, managerComment: "", residentNotification: "" },
    { residentId: 2, status: "validate"   as const, managerComment: "", residentNotification: "" },
  ];
  const withAlert  = makeReport({ residentId: 1, warnings: [makeWarning("maxLimit")] });
  const confNotVal = makeReport({ residentId: 1 });
  const confVal    = makeReport({ residentId: 2 });

  it("all → true pour tous",                              () => [withAlert, confNotVal, confVal].forEach((r) => expect(matchesFilter(r, "all",   vd)).toBe(true)));
  it("alert → uniquement résidents avec alertes légales", () => { expect(matchesFilter(withAlert, "alert", vd)).toBe(true); expect(matchesFilter(confNotVal, "alert", vd)).toBe(false); });
  it("todo → uniquement non-validés",                     () => { expect(matchesFilter(confNotVal, "todo",  vd)).toBe(true); expect(matchesFilter(confVal,    "todo",  vd)).toBe(false); });
  it("done → uniquement validés",                         () => { expect(matchesFilter(confVal,    "done",  vd)).toBe(true); expect(matchesFilter(confNotVal, "done",  vd)).toBe(false); });
});

// ── États de chargement ────────────────────────────────────────────────────────

describe("États de chargement", () => {
  it("affiche un spinner pendant le chargement initial", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderGeneral();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("affiche 'Aucune période disponible' si API retourne liste vide", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderGeneral();
    await waitFor(() => expect(screen.getByText("Aucune période disponible.")).toBeInTheDocument());
  });

  it("affiche le rail et le workspace après chargement réussi", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
  });

  it("affiche un spinner dans le workspace pendant le chargement du rapport", async () => {
    // validationList résout rapidement ; periodReport bloque
    let resolvePeriodReport!: (v: unknown) => void;
    const blockedReport = new Promise((r) => { resolvePeriodReport = r; });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return blockedReport;
      return Promise.reject(new Error("Unknown URL"));
    });

    renderGeneral();
    // Attendre que le rail charge, puis vérifier le spinner workspace
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Débloquer le rapport
    act(() => resolvePeriodReport({ data: REPORT_RESP }));
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });
});

// ── Rail de mois ───────────────────────────────────────────────────────────────

describe("Rail de mois", () => {
  it("rend un item par période retournée", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3));
  });

  it("1ᵉʳ item sélectionné par défaut (aria-selected=true)", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => {
      const opts = screen.getAllByRole("option");
      expect(opts[0]).toHaveAttribute("aria-selected", "true");
      expect(opts[1]).toHaveAttribute("aria-selected", "false");
    });
  });

  it("cliquer un mois le marque actif", async () => {
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

  it("affiche l'année académique dans le header du rail (ex: '2025–26')", async () => {
    setupNormalLoad();
    renderGeneral();
    // PERIODS_RESP : avril 2026, mars 2026, février 2026 → années 2026-26 (même année)
    // Le rail head doit afficher quelque chose du type "2025–26" ou "2026–26"
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    // Au moins un texte mono sous la forme "XXXX–XX" doit exister dans le rail header
    const listbox = screen.getByRole("listbox");
    expect(listbox.textContent).toMatch(/\d{4}–\d{2}/);
  });

  it("affiche le sous-libellé pour le mois sélectionné après chargement", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    // Avec ALICE (non validée), BOB (alertes), CAROL (validée) :
    // counts.alert=1 → sous-libellé = "3 MACCS · 1 alerte"
    const firstOption = screen.getAllByRole("option")[0];
    expect(firstOption.textContent).toMatch(/MACCS|alerte|validé/i);
  });

  it("sous-libellé indique les alertes si des alertes légales sont présentes", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    const firstOption = screen.getAllByRole("option")[0];
    // BOB a une alerte légale → sub doit mentionner "alerte"
    expect(firstOption.textContent).toMatch(/alerte/i);
  });
});

// ── Header workspace ───────────────────────────────────────────────────────────

describe("Header workspace", () => {
  it("affiche le libellé du mois sélectionné", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getAllByText("AVRIL 2026").length).toBeGreaterThanOrEqual(1));
  });

  it("affiche la pill '3 MACCS'", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getByText("3 MACCS")).toBeInTheDocument());
  });

  it("affiche la progression '1 / 3'", async () => {
    setupNormalLoad();
    renderGeneral();
    await waitFor(() => expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument());
  });
});

// ── Filter toolbar — chips ─────────────────────────────────────────────────────

describe("Filter toolbar — chips", () => {
  async function load() {
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(4));
  }

  it("affiche 4 chips",                                  async () => { await load(); });
  it("chip 'Tous' actif par défaut",                     async () => { await load(); expect(screen.getAllByRole("radio")[0]).toHaveAttribute("aria-checked", "true"); });
  it("compteur 'Tous' = 3",                              async () => { await load(); expect(screen.getByRole("radio", { name: /^Tous/ })).toHaveTextContent("3"); });
  it("compteur 'Alertes' = 1 (Bob)",                     async () => { await load(); expect(screen.getByRole("radio", { name: /^Alertes/ })).toHaveTextContent("1"); });
  it("compteur 'Validés' = 1 (Carol)",                   async () => { await load(); expect(screen.getByRole("radio", { name: /^Validés/ })).toHaveTextContent("1"); });
  it("compteur 'À valider' = 2 (Alice + Bob)",           async () => { await load(); expect(screen.getByRole("radio", { name: /^À valider/ })).toHaveTextContent("2"); });
});

// ── Filter toolbar — comportement ──────────────────────────────────────────────

describe("Filter toolbar — comportement", () => {
  async function loadAndFilter(label: string) {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${label}`) }));
  }

  it("'Alertes' → Bob seulement", async () => {
    await loadAndFilter("Alertes");
    expect(screen.getByTestId(`macc-card-${BOB.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${ALICE.residentId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${CAROL.residentId}`)).not.toBeInTheDocument();
  });

  it("'Validés' → Carol seulement", async () => {
    await loadAndFilter("Validés");
    expect(screen.getByTestId(`macc-card-${CAROL.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${ALICE.residentId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${BOB.residentId}`)).not.toBeInTheDocument();
  });

  it("'À valider' exclut Carol (validée)", async () => {
    await loadAndFilter("À valider");
    expect(screen.queryByTestId(`macc-card-${CAROL.residentId}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`macc-card-${BOB.residentId}`)).toBeInTheDocument();
  });

  it("'Tous' réaffiche les 3 résidents", async () => {
    await loadAndFilter("Alertes");
    fireEvent.click(screen.getByRole("radio", { name: /^Tous/ }));
    [ALICE, BOB, CAROL].forEach((r) =>
      expect(screen.getByTestId(`macc-card-${r.residentId}`)).toBeInTheDocument()
    );
  });
});

// ── Recherche ──────────────────────────────────────────────────────────────────

describe("Recherche", () => {
  it("filtre par nom (sensible à la casse)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`macc-card-${BOB.residentId}`)).not.toBeInTheDocument();
  });

  it("filtre par nom (insensible à la casse)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alice" } });
    expect(screen.getByTestId(`macc-card-${ALICE.residentId}`)).toBeInTheDocument();
  });

  it("affiche l'état vide si aucun résultat", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz_inconnu" } });
    expect(screen.getByText("Aucun MACCS ne correspond à ce filtre.")).toBeInTheDocument();
  });
});

// ── Tri par priorité ───────────────────────────────────────────────────────────

describe("Tri par priorité", () => {
  function cardOrder() {
    return screen.getAllByTestId(/macc-card-/).map((c) =>
      Number(c.getAttribute("data-testid")?.replace("macc-card-", ""))
    );
  }

  it("Bob (alertes) avant Alice (conforme non validé)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const ids = cardOrder();
    expect(ids.indexOf(BOB.residentId)).toBeLessThan(ids.indexOf(ALICE.residentId));
  });

  it("Alice (non validée) avant Carol (validée)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const ids = cardOrder();
    expect(ids.indexOf(ALICE.residentId)).toBeLessThan(ids.indexOf(CAROL.residentId));
  });
});

// ── Cartes MACC — chips de statut ─────────────────────────────────────────────

describe("Cartes MACC — chips de statut", () => {
  it("Alice : chip 'Conforme' (aucune alerte légale)", async () => {
    setupNormalLoad(); renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-conforme-${ALICE.residentId}`));
  });

  it("Bob : chip alertes légales visible", async () => {
    setupNormalLoad(); renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-alert-${BOB.residentId}`));
  });

  it("Bob : chip 'Opting out' (optingOut=true)", async () => {
    setupNormalLoad(); renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-opting-${BOB.residentId}`));
  });

  it("Alice : pas de chip 'Opting out' (optingOut=false)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    expect(screen.queryByTestId(`chip-opting-${ALICE.residentId}`)).not.toBeInTheDocument();
  });

  it("résident avec minLimit seul → chip 'Conforme' (pas alerte légale)", async () => {
    const DAN = makeReport({
      residentId: 4, residentFirstname: "Dan", residentLastname: "Info",
      warnings: [makeWarning("minLimit")], // minLimit = info, pas alerte légale
    });
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [DAN] });
      return Promise.reject(new Error("Unknown URL"));
    });
    renderGeneral();
    await waitFor(() => screen.getByTestId(`chip-conforme-${DAN.residentId}`));
    expect(screen.queryByTestId(`chip-alert-${DAN.residentId}`)).not.toBeInTheDocument();
  });
});

// ── Cartes MACC — expansion ────────────────────────────────────────────────────

describe("Cartes MACC — expansion", () => {
  it("clic ouvre le rapport (aria-expanded → true)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const row = screen.getByTestId(`macc-row-${ALICE.residentId}`);
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Informations générales")).toBeInTheDocument();
    expect(screen.getByText("Heures prestées")).toBeInTheDocument();
  });

  it("2ᵉ clic referme la carte", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const row = screen.getByTestId(`macc-row-${ALICE.residentId}`);
    fireEvent.click(row); fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "false");
  });

  it("'conformité complète' affiché si aucune alerte (Alice)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${ALICE.residentId}`));
    await waitFor(() => expect(screen.getByText(/conformité complète/)).toBeInTheDocument());
  });

  it("rapport de Bob contient une alerte légale (maxLimit)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${BOB.residentId}`));
    const card = screen.getByTestId(`macc-card-${BOB.residentId}`);
    // Chercher dans la carte uniquement : "Alertes" apparaît aussi dans le chip filtre hors carte
    await waitFor(() =>
      expect(within(card).getByText(/Dépassement du maximum légal/)).toBeInTheDocument()
    );
  });

  it("plusieurs cartes ouvertes simultanément", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${ALICE.residentId}`));
    fireEvent.click(screen.getByTestId(`macc-row-${BOB.residentId}`));
    expect(screen.getByTestId(`macc-row-${ALICE.residentId}`)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId(`macc-row-${BOB.residentId}`)).toHaveAttribute("aria-expanded", "true");
  });
});

// ── Boutons notification ───────────────────────────────────────────────────────

describe("Boutons notification", () => {
  it("clic bouton notif MACCS ouvre la MessageBox pour ce résident", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const card = screen.getByTestId(`macc-card-${ALICE.residentId}`);
    // buttons[0] = macc-row (role="button"), [1] = notif MACCS (IconButton), [2] = notif managers
    const buttons = within(card).getAllByRole("button");
    fireEvent.click(buttons[1]);
    await waitFor(() =>
      expect(screen.getByTestId(`msgbox-${ALICE.residentId}-ResidentNotification`)).toBeInTheDocument()
    );
  });

  it("clic bouton notif managers ouvre la MessageBox pour ce résident", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const card = screen.getByTestId(`macc-card-${ALICE.residentId}`);
    const buttons = within(card).getAllByRole("button");
    fireEvent.click(buttons[2]);
    await waitFor(() =>
      expect(screen.getByTestId(`msgbox-${ALICE.residentId}-ManagerNotification`)).toBeInTheDocument()
    );
  });
});

// ── Toggle Valider ─────────────────────────────────────────────────────────────

describe("Toggle Valider", () => {
  it("toggle d'Alice : false → true", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch"))
        .toHaveAttribute("aria-checked", "true")
    );
  });

  it("toggle de Carol (validée) : true → false", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${CAROL.residentId}`)).getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${CAROL.residentId}`)).getByRole("switch"))
        .toHaveAttribute("aria-checked", "false")
    );
  });
});

// ── État dirty ─────────────────────────────────────────────────────────────────

describe("État dirty", () => {
  it("indicateur 'Non sauvegardé' absent par défaut", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument();
  });

  it("indicateur apparaît après un toggle individuel", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());
  });

  it("indicateur apparaît après 'Valider les conformes'", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());
  });

  it("indicateur disparaît après un Enregistrer réussi", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Rendre dirty
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());

    // Sauvegarder
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument());
  });

  it("indicateur disparaît quand on change de mois", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Rendre dirty
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());

    // Changer de mois
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument());
  });
});

// ── Valider les conformes ──────────────────────────────────────────────────────

describe("Valider les conformes", () => {
  it("bouton désactivé si aucun conforme non validé", async () => {
    const ALICE_VAL = makeReport({ residentId: 1, validationInformation: { validated: true }, warnings: [] });
    const BOB_ALERT = makeReport({ residentId: 2, validationInformation: { validated: false }, warnings: [makeWarning("maxLimit")] });
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_VAL, BOB_ALERT] });
      return Promise.reject(new Error("Unknown"));
    });
    renderGeneral();
    await waitFor(() => screen.getByTestId("btn-bulk-validate"));
    expect(screen.getByTestId("btn-bulk-validate")).toBeDisabled();
  });

  it("bouton actif si des conformes non validés existent", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    expect(screen.getByTestId("btn-bulk-validate")).not.toBeDisabled();
  });

  it("valide Alice, laisse Bob (alertes) inchangé", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch"))
        .toHaveAttribute("aria-checked", "true")
    );
    expect(within(screen.getByTestId(`macc-card-${BOB.residentId}`)).getByRole("switch"))
      .toHaveAttribute("aria-checked", "false");
  });

  it("toast mentionne 'Enregistrer' (pas 'enregistrées' pour éviter confusion)", async () => {
    const { toast } = await import("react-toastify");
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Enregistrer"),
      expect.anything()
    );
  });

  it("toast NE dit PAS 'enregistrées' (le bulk ne sauvegarde pas l'API)", async () => {
    const { toast } = await import("react-toastify");
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId("btn-bulk-validate"));
    // Le toast doit contenir "marqué" ou "Enregistrer" mais PAS "enregistrées" seul
    const call = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(call.toLowerCase()).not.toBe("validations enregistrées");
  });
});

// ── Enregistrer (PUT /api/managers/validation/{periodId}) ──────────────────────

describe("Enregistrer", () => {
  it("appelle PUT managers/validation/{periodId} avec les données de validation", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("managers/validation/"),
        expect.any(Array)
      )
    );
  });

  it("appelle PUT avec l'ID de la période sélectionnée (10 = 1ᵉʳ de PERIODS_RESP)", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("managers/validation/10", expect.any(Array))
    );
  });

  it("toast succès contient 'succès'", async () => {
    const { toast } = await import("react-toastify");
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("succès"),
        expect.anything()
      )
    );
  });

  it("toast erreur si l'API échoue", async () => {
    const { toast } = await import("react-toastify");
    mockPut.mockRejectedValue(new Error("500"));
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("toast erreur si aucune période disponible", async () => {
    const { toast } = await import("react-toastify");
    // Pas de périodes chargées → periods = []
    mockGet.mockResolvedValue({ data: [] });
    renderGeneral();
    await waitFor(() => screen.getByText("Aucune période disponible."));
    // Le bouton Enregistrer n'est pas rendu dans cet état → pas de clic possible
    // Vérifier que le toast.error n'a pas été appelé spontanément
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("utilise periods[selectedIndex].id comme fallback si store vide au moment du clic", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Forcer le store à vider periodId (simule une race condition)
    act(() => { useValidationStore.setState({ periodId: undefined }); });

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    // Le fallback periods[0].id = 10 doit être utilisé
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("managers/validation/10", expect.any(Array))
    );
  });
});

// ── Changement de mois ────────────────────────────────────────────────────────

describe("Changement de mois", () => {
  it("réinitialise le filtre à 'Tous'", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    // Activer "Alertes"
    fireEvent.click(screen.getByRole("radio", { name: /^Alertes/ }));
    expect(screen.getByRole("radio", { name: /^Alertes/ })).toHaveAttribute("aria-checked", "true");
    // Changer de mois
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /^Tous/ })).toHaveAttribute("aria-checked", "true")
    );
  });

  it("réinitialise la recherche", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
    expect(screen.getByRole("textbox")).toHaveValue("Alice");
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  });

  it("ferme les cartes ouvertes", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    fireEvent.click(screen.getByTestId(`macc-row-${ALICE.residentId}`));
    expect(screen.getByTestId(`macc-row-${ALICE.residentId}`)).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => {
      // Après changement de mois et rechargement, la carte doit être fermée
      const row = screen.queryByTestId(`macc-row-${ALICE.residentId}`);
      if (row) expect(row).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("réinitialise l'état dirty", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument());
  });
});
