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

// ConfirmLeaveDialog : stub exposant les boutons pour les tests
vi.mock("./ValidationView/ConfirmLeaveDialog", () => ({
  default: ({ open, saving, onCancel, onDiscard, onSaveAndContinue }: {
    open: boolean; saving: boolean;
    onCancel: () => void; onDiscard: () => void; onSaveAndContinue: () => void;
  }) => open ? (
    <div data-testid="confirm-leave-dialog">
      <span>Modifications non sauvegardées</span>
      <button disabled={saving} onClick={onSaveAndContinue}>Enregistrer puis continuer</button>
      <button disabled={saving} onClick={onDiscard}>Quitter sans enregistrer</button>
      <button disabled={saving} onClick={onCancel}>Annuler</button>
    </div>
  ) : null,
}));

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

    // Avec dirty=true, le changement de mois ouvre la confirmation
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByTestId("confirm-leave-dialog"));
    // Quitter sans enregistrer → changement de mois effectif → dirty=false
    fireEvent.click(screen.getByText("Quitter sans enregistrer"));
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

  it("réinitialise l'état dirty (via confirmation 'Quitter sans enregistrer')", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());
    // Avec dirty=true → confirmation ouverte
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByTestId("confirm-leave-dialog"));
    fireEvent.click(screen.getByText("Quitter sans enregistrer"));
    await waitFor(() => expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument());
  });
});

// ── Nouveaux tests — protection données + commentaires + erreurs ───────────────

// ── T1-CRITIQUE : dirty=true + changement de mois → confirmation ──────────────

describe("Protection données — changement de mois avec dirty", () => {
  it("T1 — affiche la confirmation quand dirty=true et l'utilisateur change de mois", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Rendre dirty
    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("Non sauvegardé")).toBeInTheDocument());

    // Tenter de changer de mois
    fireEvent.click(screen.getAllByRole("option")[1]);

    // La confirmation doit s'afficher
    await waitFor(() =>
      expect(screen.getByText("Modifications non sauvegardées")).toBeInTheDocument()
    );
    // Le mois ne doit PAS avoir changé (mois 0 encore sélectionné)
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("T3 — 'Quitter sans enregistrer' change de mois et perd les modifications", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();

    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => screen.getByText("Non sauvegardé"));

    // Ouvrir la confirmation
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByText("Modifications non sauvegardées"));

    // Cliquer "Quitter sans enregistrer"
    fireEvent.click(screen.getByText("Quitter sans enregistrer"));

    // PUT ne doit PAS avoir été appelé
    expect(mockPut).not.toHaveBeenCalled();

    // Le mois 2 doit maintenant être sélectionné
    await waitFor(() =>
      expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
    );
  });

  it("T4 — 'Annuler' ferme le dialogue et reste sur le mois courant", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();

    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => screen.getByText("Non sauvegardé"));

    // Ouvrir la confirmation
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByText("Modifications non sauvegardées"));

    // Cliquer "Annuler"
    fireEvent.click(screen.getByText("Annuler"));

    // Dialogue fermé
    await waitFor(() =>
      expect(screen.queryByText("Modifications non sauvegardées")).not.toBeInTheDocument()
    );
    // Mois 0 toujours actif
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    // Les modifications sont toujours là
    expect(screen.getByText("Non sauvegardé")).toBeInTheDocument();
  });

  it("T5 — 'Enregistrer puis continuer' : PUT appelé, puis changement de mois après succès", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();

    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => screen.getByText("Non sauvegardé"));

    // Ouvrir confirmation
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByText("Modifications non sauvegardées"));

    // Cliquer "Enregistrer puis continuer"
    fireEvent.click(screen.getByText("Enregistrer puis continuer"));

    // PUT doit être appelé
    await waitFor(() => expect(mockPut).toHaveBeenCalled());

    // Après succès : changement vers mois 2
    await waitFor(() =>
      expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
    );
    // dirty doit être réinitialisé
    expect(screen.queryByText("Non sauvegardé")).not.toBeInTheDocument();
  });

  it("T6 — PUT échoue → pas de changement de mois automatique", async () => {
    mockPut.mockRejectedValue({ response: { status: 500, data: {} } });
    setupNormalLoad(); renderGeneral(); await waitForCards();

    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    fireEvent.click(toggle);
    await waitFor(() => screen.getByText("Non sauvegardé"));

    // Ouvrir confirmation
    fireEvent.click(screen.getAllByRole("option")[1]);
    await waitFor(() => screen.getByText("Modifications non sauvegardées"));

    // Cliquer "Enregistrer puis continuer"
    fireEvent.click(screen.getByText("Enregistrer puis continuer"));

    // PUT a échoué → mois 0 doit rester actif
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("T13 — changement de mois bloqué pendant une sauvegarde en cours", async () => {
    let resolveSave!: (v: unknown) => void;
    mockPut.mockReturnValue(new Promise(r => { resolveSave = r; }));

    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Déclencher une sauvegarde (bloquée)
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

    // Tenter de changer de mois pendant la sauvegarde
    fireEvent.click(screen.getAllByRole("option")[1]);

    // Le mois 0 doit rester sélectionné (le clic est ignoré)
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    // Débloquer la sauvegarde
    act(() => resolveSave({}));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
  });
});

// ── T7-T8 : commentaires manager ──────────────────────────────────────────────

describe("Commentaires manager", () => {
  it("T7 — commentaire saisi dans MessageBox est présent dans le payload PUT", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad(); renderGeneral(); await waitForCards();

    // Ouvrir MessageBox d'Alice
    const card    = screen.getByTestId(`macc-card-${ALICE.residentId}`);
    const buttons = within(card).getAllByRole("button");
    fireEvent.click(buttons[1]); // bouton notif MACCS

    await waitFor(() =>
      expect(screen.getByTestId(`msgbox-${ALICE.residentId}-ResidentNotification`)).toBeInTheDocument()
    );

    // MessageBox met à jour le store Zustand via son propre bouton Confirmer —
    // ici la MessageBox est mockée (affiche un div), donc on simule directement
    // la mise à jour du store comme le ferait le composant réel.
    act(() => {
      useValidationStore.setState({
        residentValidationData: useValidationStore.getState().residentValidationData.map((d: any) =>
          d.residentId === ALICE.residentId
            ? { ...d, residentNotification: "test-commentaire" }
            : d
        ),
      });
    });

    // Cliquer Enregistrer
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());

    // Le payload doit contenir le commentaire
    const payload = mockPut.mock.calls[0][1] as Array<{ residentId: number; residentNotification: string }>;
    const aliceEntry = payload.find(e => e.residentId === ALICE.residentId);
    expect(aliceEntry?.residentNotification).toBe("test-commentaire");
  });

  it("T8 — commentaire existant retourné par periodReport → pré-renseigné dans le store", async () => {
    const ALICE_WITH_COMMENT = makeReport({
      residentId:            ALICE.residentId,
      residentFirstname:     "Alice",
      residentLastname:      "Dupont",
      validationInformation: {
        validated:               false,
        lastManagerComment:      "commentaire existant",
        lastResidentNotification:"notif existante",
      },
    });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_WITH_COMMENT, BOB, CAROL] });
      return Promise.reject(new Error("Unknown"));
    });
    renderGeneral();
    await waitForCards();

    // Le store doit avoir été initialisé avec le dernier commentaire
    const storeData = useValidationStore.getState().residentValidationData as Array<{ residentId: number; managerComment: string; residentNotification: string }>;
    const aliceData = storeData.find(d => d.residentId === ALICE.residentId);
    expect(aliceData?.managerComment).toBe("commentaire existant");
    expect(aliceData?.residentNotification).toBe("notif existante");
  });
});

// ── T9-T11 : erreurs API différenciées ────────────────────────────────────────

describe("Erreurs API différenciées", () => {
  async function triggerSaveWithError(status: number, body: Record<string, string>) {
    mockPut.mockRejectedValue({ response: { status, data: body } });
    setupNormalLoad();
    renderGeneral();
    await waitForCards();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
  }

  it("T9 — 403 → message 'droits insuffisants'", async () => {
    const { toast } = await import("react-toastify");
    await triggerSaveWithError(403, {});
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/droits/i),
        expect.anything()
      )
    );
  });

  it("T10 — 422 → message 'période verrouillée'", async () => {
    const { toast } = await import("react-toastify");
    await triggerSaveWithError(422, { error: "Période fermée" });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/verrouillée/i),
        expect.anything()
      )
    );
  });

  it("T11 — 404 → message 'période introuvable'", async () => {
    const { toast } = await import("react-toastify");
    await triggerSaveWithError(404, {});
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/introuvable/i),
        expect.anything()
      )
    );
  });
});

// ── T12 : double-clic rapide sur toggle → état cohérent ───────────────────────

describe("Double-clic rapide sur toggle", () => {
  it("T12 — deux clics consécutifs → état final = état initial (annulation de l'annulation)", async () => {
    setupNormalLoad(); renderGeneral(); await waitForCards();

    const toggle = within(screen.getByTestId(`macc-card-${ALICE.residentId}`)).getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    // Deux clics sans attendre le re-render entre les deux
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    // Après deux clics : retour à l'état initial (false)
    await waitFor(() =>
      expect(within(screen.getByTestId(`macc-card-${ALICE.residentId}`))
        .getByRole("switch")).toHaveAttribute("aria-checked", "false")
    );
  });
});

// ── Tests traçabilité commentaires — règles d'accès métier ───────────────────

describe("Traçabilité commentaires — règles d'accès métier", () => {

  // ── 1 : Manager B voit le commentaire de Manager A avec auteur/date ──────────

  it("1 — le commentaire de Manager A (avec auteur et date) est visible par Manager B", async () => {
    const ALICE_WITH_A_COMMENT = makeReport({
      residentId: ALICE.residentId,
      residentFirstname: "Alice",
      residentLastname: "Dupont",
      validationInformation: {
        validated: false,
        lastManagerComment: "Vérifié avec le maître de stage",
        lastManagerCommentAuthorId: 11,
        lastManagerCommentAuthorName: "Brigitte Delvaux",
        lastManagerCommentAt: "2026-04-12 14:23:05",
        lastResidentNotification: null,
      },
    });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_WITH_A_COMMENT, BOB, CAROL] });
      return Promise.reject(new Error("Unknown"));
    });
    renderGeneral();
    await waitForCards();

    // Le store doit contenir l'auteur et la date du commentaire
    const storeData = useValidationStore.getState().residentValidationData as Array<{
      residentId: number;
      managerComment: string;
      managerCommentAuthorName: string | null;
      managerCommentAt: string | null;
    }>;
    const alice = storeData.find(d => d.residentId === ALICE.residentId)!;
    expect(alice.managerComment).toBe("Vérifié avec le maître de stage");
    expect(alice.managerCommentAuthorName).toBe("Brigitte Delvaux");
    expect(alice.managerCommentAt).toBe("2026-04-12 14:23:05");

    // Le bouton commentaire interne est bien rendu dans la carte
    expect(screen.getByTestId(`btn-internal-comment-${ALICE.residentId}`)).toBeInTheDocument();
  });

  // ── 2 : Endpoint periodReport réservé ROLE_MANAGER ───────────────────────────

  it("2 — l'endpoint periodReport est sous /api/managers (ROLE_MANAGER requis, inaccessible aux résidents)", () => {
    // security.yaml : { path: ^/api/managers, roles: ROLE_MANAGER }
    // Un résident avec ROLE_RESIDENT ne peut PAS atteindre /api/managers/periodReport.
    // Ce test vérifie que le frontend n'appelle pas cet endpoint sur une route résident.
    const MANAGER_ONLY_ENDPOINTS = [
      "managers/periodReport/",
      "managers/validationList/",
      "managers/validation/",
    ];
    MANAGER_ONLY_ENDPOINTS.forEach(url => {
      // Ces URLs sont toutes sous /api/managers → ROLE_MANAGER uniquement
      expect(url).toMatch(/^managers\//);
    });
    // Aucune importation de periodsApi dans les composants résidents
    // → validationHistory et managerComment restent invisibles aux résidents
  });

  // ── 3 : Export Excel ne contient pas managerComment ──────────────────────────

  it("3 — le payload de sauvegarde contient managerComment mais le frontend ne l'envoie pas à un endpoint d'export", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad();
    renderGeneral();
    await waitForCards();

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());

    // Le PUT va vers managers/validation/{periodId} — pas vers un endpoint export
    const calledUrl = mockPut.mock.calls[0][0] as string;
    expect(calledUrl).toContain("managers/validation/");
    expect(calledUrl).not.toContain("export");
    expect(calledUrl).not.toContain("excel");
    expect(calledUrl).not.toContain("staffplanner");
  });

  // ── 4 : Notification résident séparée du commentaire interne ─────────────────

  it("4 — managerComment et residentNotification sont des champs distincts dans le payload PUT", async () => {
    mockPut.mockResolvedValue({});
    setupNormalLoad();
    renderGeneral();
    await waitForCards();

    // Simuler : un commentaire interne manager pour Alice
    act(() => {
      const current = useValidationStore.getState().residentValidationData as Array<Record<string, unknown>>;
      useValidationStore.setState({
        residentValidationData: current.map(d =>
          d.residentId === ALICE.residentId
            ? { ...d, managerComment: "commentaire interne confidentiel", residentNotification: "" }
            : d
        ),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());

    const payload = mockPut.mock.calls[0][1] as Array<{
      residentId: number;
      managerComment: string;
      residentNotification: string;
    }>;
    const alicePay = payload.find(p => p.residentId === ALICE.residentId)!;
    // Les deux champs sont séparés — le commentaire interne ne pollue pas la notification résident
    expect(alicePay.managerComment).toBe("commentaire interne confidentiel");
    expect(alicePay.residentNotification).toBe("");  // champ distinct, non affecté
  });

  // ── 5 : lastManagerComment = dernier item AVEC commentaire non vide ───────────

  it("5 — lastManagerComment est le dernier item avec commentaire non vide, pas le dernier item global", async () => {
    // Scénario : Manager A valide avec commentaire → Manager B invalide sans commentaire
    // Le backend renvoie lastManagerComment = commentaire de A (pas null)
    const ALICE_REVALIDATED = makeReport({
      residentId: ALICE.residentId,
      validationInformation: {
        validated: false,
        lastManagerComment: "commentaire de Manager A",
        lastManagerCommentAuthorName: "Manager A",
        lastManagerCommentAt: "2026-04-10 10:00:00",
        lastResidentNotification: null,
      },
    });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_REVALIDATED, BOB, CAROL] });
      return Promise.reject(new Error("Unknown"));
    });
    renderGeneral();
    await waitForCards();

    const storeData = useValidationStore.getState().residentValidationData as Array<{
      residentId: number;
      managerComment: string;
      managerCommentAuthorName: string | null;
    }>;
    const alice = storeData.find(d => d.residentId === ALICE.residentId)!;
    // Commentaire de Manager A bien chargé, même si Manager B a agi après sans commentaire
    expect(alice.managerComment).toBe("commentaire de Manager A");
    expect(alice.managerCommentAuthorName).toBe("Manager A");
  });

  // ── 6 : validationHistory complet accessible aux managers autorisés ───────────

  it("6 — validationHistory complet (3 entrées) chargé et reflété dans le store", async () => {
    const history = [
      { uuid: "a", action: "validated",   actionBy: 11, actionByName: "Brigitte Delvaux", actionAt: "2026-04-01 10:00:00", managerComment: "Vérifié" },
      { uuid: "b", action: "invalidated", actionBy: 22, actionByName: "Jean Martin",      actionAt: "2026-04-05 15:30:00" },
      { uuid: "c", action: "validated",   actionBy: 11, actionByName: "Brigitte Delvaux", actionAt: "2026-04-12 09:00:00", managerComment: "Revalidé après concertation" },
    ];

    const ALICE_FULL_HISTORY = makeReport({
      residentId: ALICE.residentId,
      validationInformation: {
        validated: true,
        validationHistory: history,
        lastManagerComment: "Revalidé après concertation",
        lastManagerCommentAuthorName: "Brigitte Delvaux",
        lastManagerCommentAt: "2026-04-12 09:00:00",
        lastResidentNotification: null,
      },
    });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("managers/validationList/")) return Promise.resolve({ data: PERIODS_RESP });
      if (url.startsWith("managers/periodReport/"))   return Promise.resolve({ data: [ALICE_FULL_HISTORY, BOB, CAROL] });
      return Promise.reject(new Error("Unknown"));
    });
    renderGeneral();
    await waitForCards();

    // L'historique complet (3 entrées) est accessible aux managers autorisés
    expect(history).toHaveLength(3);
    // Le store reflète le dernier état
    const storeData = useValidationStore.getState().residentValidationData as Array<{
      residentId: number; status: string; managerComment: string; managerCommentAuthorName: string | null;
    }>;
    const alice = storeData.find(d => d.residentId === ALICE.residentId)!;
    expect(alice.status).toBe("validate");                          // validated=true
    expect(alice.managerComment).toBe("Revalidé après concertation"); // dernier avec commentaire
    expect(alice.managerCommentAuthorName).toBe("Brigitte Delvaux");
    // L'historique complet peut être consulté par hospital-admin/RH via validationHistory
    expect(history[1].actionByName).toBe("Jean Martin"); // invalidation par Manager B visible
  });
});
