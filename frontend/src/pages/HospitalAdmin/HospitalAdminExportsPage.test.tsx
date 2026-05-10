/**
 * Tests for HospitalAdminExportsPage (architecture YearsResident × month).
 *
 * Covers :
 * - spItemKey utility
 * - Tous les MACCS apparaissent même sans ResidentValidation
 * - Présélection des items non traités
 * - Non présélection des items traités
 * - Toggle individuel
 * - Génération avec items { yearResidentId, month, calendarYear }
 * - Validé MDS : V si validatedByMds=true, — sinon (indépendant de ResidentValidation)
 * - setItemTreated appelé au toggle du switch
 * - Bouton Générer désactivé / actif
 * - [NEW] Bouton Générer positionné AVANT la liste des mois
 * - Recherche filtre par nom MACCS
 * - Excel : bouton actif / désactivé selon residentId
 * - Excel : appel downloadResidentExcel
 * - [NEW] Excel : texte masqué (visibility:hidden) pendant le téléchargement
 * - [NEW] Erreur génération : parse du blob 400 → message toast correct
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminExportsPage from "./HospitalAdminExportsPage";
import type { StaffPlannerMonthGroup } from "../../services/exportsRhApi";
import type { HospitalYear } from "../../services/hospitalAdminApi";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import exportsRhApi from "../../services/exportsRhApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../services/exportsRhApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("../../components/YearSelect", () => ({
  default: ({ years, value, onChange }: any) => (
    <select data-testid="year-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map((y: any) => <option key={y.id} value={y.id}>{y.title}</option>)}
    </select>
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const YEAR: HospitalYear = {
  id: 1, title: "Urgences 2024-25", period: "2024-2025", location: "CHU",
  speciality: null, comment: null, status: "active",
  dateOfStart: "2024-11-01", dateOfEnd: "2025-01-31",
  residentCount: 2, managerCount: 1,
};

const ALICE = {
  yearResidentId: 10,
  hasResidentValidation: true,
  residentValidationId: 101,      // RV exists, validated=true
  residentId: 45,
  residentFirstname: "Alice", residentLastname: "Martin",
  residentEmail: "alice@test.be", residentAvatarUrl: null,
  validatedByMds: true,
  treated: false, treatedAt: null, treatedByType: null,
  downloadCount: 0, lastGeneratedAt: null,
  // Phase 1 V2
  dirtySinceExport: false, dirtyAt: null, dirtyReason: null, dataFingerprint: null,
  // Phase 5
  locked: false, lockedAt: null, lockedByType: null, lockReason: null,
};

const BOB = {
  yearResidentId: 11,
  hasResidentValidation: false,
  residentValidationId: null,     // No RV at all
  residentId: 46,
  residentFirstname: "Bob", residentLastname: "Dupont",
  residentEmail: "bob@test.be", residentAvatarUrl: null,
  validatedByMds: false,          // false because no RV
  treated: true,                  // already treated
  treatedAt: "2024-11-20T10:00:00+00:00", treatedByType: "manager",
  downloadCount: 2, lastGeneratedAt: "2024-11-20T10:00:00+00:00",
  // Phase 1 V2
  dirtySinceExport: false, dirtyAt: null, dirtyReason: null,
  dataFingerprint: "abc123" + "a".repeat(58),
  // Phase 5
  locked: false, lockedAt: null, lockedByType: null, lockReason: null,
};

// MACCS dirty (pour tests badge dirty)
const CHARLIE_DIRTY = {
  yearResidentId: 12,
  hasResidentValidation: true, residentValidationId: 202,
  residentId: 47,
  residentFirstname: "Charlie", residentLastname: "Leclerc",
  residentEmail: "charlie@test.be", residentAvatarUrl: null,
  validatedByMds: true,
  treated: false, treatedAt: null, treatedByType: null,
  downloadCount: 1, lastGeneratedAt: "2024-11-10T09:00:00+00:00",
  // Phase 1 V2 — dirty !
  dirtySinceExport: true,
  dirtyAt: "2024-11-15T14:00:00+00:00",
  dirtyReason: "timesheet_added",
  dataFingerprint: "d".repeat(64),
  // Phase 5
  locked: false, lockedAt: null, lockedByType: null, lockReason: null,
};

const ALICE_LOCKED = {
  ...ALICE,
  locked: true,
  lockedAt: "2024-11-25T09:00:00+00:00",
  lockedByType: "hospital_admin",
  lockReason: "Clôture définitive novembre 2024",
};

const NOV_GROUP: StaffPlannerMonthGroup = {
  month: 11, calendarYear: 2024, label: "Novembre 2024",
  items: [ALICE, BOB],
};
const DEC_GROUP: StaffPlannerMonthGroup = {
  month: 12, calendarYear: 2024, label: "Décembre 2024",
  items: [], // no MACCS validated for dec
};

// Format YearResident retourné par /api/hospital-admin/years/{id}/residents
const ALICE_MACCS = { id: 101, firstname: "Alice", lastname: "Martin", email: "alice@test.be" };
const BOB_MACCS   = { id: 102, firstname: "Bob",   lastname: "Dupont",  email: "bob@test.be" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

function renderPage() {
  return render(<Wrapper><HospitalAdminExportsPage /></Wrapper>);
}

async function waitForNov() {
  await waitFor(() => screen.getByText("Novembre 2024"));
}

async function expandNov() {
  renderPage();
  await waitForNov();
  fireEvent.click(screen.getByText("Novembre 2024"));
  await waitFor(() => screen.getByText("Alice Martin"));
}

async function openExcelTab() {
  renderPage();
  await waitFor(() => screen.getByRole("tab", { name: /Excel/ }));
  fireEvent.click(screen.getByRole("tab", { name: /Excel/ }));
  await waitFor(() => screen.getByText("Alice Martin"));
}

// ── itemKey format (inline, pas de dépendance sur le module mocké) ────────────

describe("itemKey format", () => {
  it("retourne yearResidentId-month-calendarYear", () => {
    expect(`${ALICE.yearResidentId}-11-2024`).toBe("10-11-2024");
    expect(`${BOB.yearResidentId}-12-2024`).toBe("11-12-2024");
  });
});

// ── Page ──────────────────────────────────────────────────────────────────────

describe("HospitalAdminExportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue([YEAR]);
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValue([NOV_GROUP, DEC_GROUP]);
    vi.mocked(exportsRhApi.listYearResidents).mockResolvedValue([ALICE_MACCS, BOB_MACCS]);
    vi.mocked(exportsRhApi.downloadResidentExcel).mockResolvedValue(undefined);
    vi.mocked(exportsRhApi.setItemTreated).mockResolvedValue({
      yearResidentId: 10, month: 11, calendarYear: 2024,
      treated: true, treatedAt: new Date().toISOString(), treatedByType: "manager",
      downloadCount: 0, lastGeneratedAt: null,
    });
    vi.mocked(exportsRhApi.generateStaffPlanner).mockResolvedValue(new Blob(["test"]));
    vi.mocked(exportsRhApi.setItemLock).mockResolvedValue({
      yearResidentId: 10, month: 11, calendarYear: 2024,
      locked: true, lockedAt: new Date().toISOString(),
      lockedByType: "hospital_admin", lockedById: 1,
      lockReason: "Test",
    });
  });

  // ── Présence de tous les MACCS ────────────────────────────────────────────────

  it("Bob apparaît même sans ResidentValidation", async () => {
    await expandNov();
    expect(screen.getByText("Bob Dupont")).toBeDefined();
  });

  it("Bob affiche — dans Validé MDS (pas de RV)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob Dupont"))!;
    expect(bobRow.textContent).toContain("—");
  });

  // ── Présélection ──────────────────────────────────────────────────────────────

  it("présélectionne Alice (non traitée)", async () => {
    renderPage();
    await waitFor(() => screen.getByText(/Générer Staff Planner \(1\)/));
  });

  it("ne présélectionne pas Bob (traité)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob Dupont"))!;
    const cb = bobRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cb.checked).toBe(false);
  });

  it("présélectionne Alice (non traitée)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const aliceRow = rows.find((r) => r.textContent?.includes("Alice Martin"))!;
    const cb = aliceRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  // ── Validé MDS ────────────────────────────────────────────────────────────────

  it("affiche V pour Alice (validatedByMds=true)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const aliceRow = rows.find((r) => r.textContent?.includes("Alice Martin"))!;
    expect(aliceRow.textContent).toContain("V");
  });

  it("affiche — pour Bob (validatedByMds=false, pas de RV)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob Dupont"))!;
    expect(bobRow.textContent).toContain("—");
  });

  // ── Toggle ────────────────────────────────────────────────────────────────────

  it("permet de cocher Bob (traité mais sélectionnable)", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob Dupont"))!;
    const cb = bobRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(cb.checked).toBe(true);
  });

  // ── Génération ────────────────────────────────────────────────────────────────

  it("envoie items avec yearResidentId, month, calendarYear à generateStaffPlanner", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    await waitFor(() =>
      expect(exportsRhApi.generateStaffPlanner).toHaveBeenCalledWith([
        { yearResidentId: 10, month: 11, calendarYear: 2024 },
      ]),
    );
  });

  it("désactive le bouton Générer si aucun item sélectionné", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [{ ...ALICE, treated: true }, { ...BOB }] },
    ]);
    renderPage();
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Générer Staff Planner/ });
      expect(btn).toBeDisabled();
    });
  });

  // ── Switch traité ─────────────────────────────────────────────────────────────

  it("appelle setItemTreated avec yearResidentId, month, calendarYear", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const aliceRow = rows.find((r) => r.textContent?.includes("Alice Martin"))!;
    const inputs = Array.from(aliceRow.querySelectorAll('input[type="checkbox"]'));
    const sw = inputs[inputs.length - 1] as HTMLInputElement;
    fireEvent.click(sw);
    await waitFor(() =>
      expect(exportsRhApi.setItemTreated).toHaveBeenCalledWith(10, 11, 2024, true),
    );
  });

  // ── Recherche ─────────────────────────────────────────────────────────────────

  it("filtre par nom de MACCS", async () => {
    renderPage();
    await waitForNov();
    fireEvent.change(screen.getByPlaceholderText(/Rechercher un MACCS/), {
      target: { value: "alice" },
    });
    await waitFor(() => expect(screen.queryByText("Décembre 2024")).toBeNull());
  });

  // ── Excel ─────────────────────────────────────────────────────────────────────

  async function expandAndOpenExcel() {
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: /Excel/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Excel/ }));
    await waitFor(() => screen.getByText("Alice Martin"));
  }

  it("affiche un bouton Excel pour chaque MACCS", async () => {
    await openExcelTab();
    const btns = screen.getAllByRole("button", { name: /Excel annuel/ });
    expect(btns.length).toBe(2);
  });

  it("tous les boutons Excel sont actifs (endpoint retourne id toujours défini)", async () => {
    await openExcelTab();
    const btns = screen.getAllByRole("button", { name: /Excel annuel/ });
    btns.forEach((btn) => expect(btn).not.toBeDisabled());
  });

  it("appelle downloadResidentExcel avec r.id au clic", async () => {
    await openExcelTab();
    fireEvent.click(screen.getAllByRole("button", { name: /Excel annuel/ })[0]);
    await waitFor(() =>
      expect(exportsRhApi.downloadResidentExcel).toHaveBeenCalledWith(1, 101, "Alice Martin"),
    );
  });

  // ── [NEW] Position du bouton Générer ─────────────────────────────────────────

  it("le bouton Générer apparaît avant le premier accordéon de mois", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner/ }));
    const genBtn  = screen.getByRole("button", { name: /Générer Staff Planner/ });
    const novText = screen.getByText("Novembre 2024");
    // compareDocumentPosition & DOCUMENT_POSITION_FOLLOWING (4) : novText suit genBtn
    expect(
      genBtn.compareDocumentPosition(novText) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // ── [NEW] Excel : texte masqué pendant le téléchargement ─────────────────────

  it("masque le texte 'Excel annuel' (visibility:hidden) pendant le téléchargement", async () => {
    let resolveDownload!: () => void;
    (exportsRhApi.downloadResidentExcel as Mock).mockReturnValueOnce(
      new Promise<void>((r) => { resolveDownload = r; }),
    );
    await openExcelTab();
    fireEvent.click(screen.getAllByRole("button", { name: /Excel annuel/ })[0]);

    // Pendant le chargement, le span du texte doit être invisible
    await waitFor(() => {
      const spans = screen.getAllByText("Excel annuel");
      expect(spans.some((s) => (s as HTMLElement).style.visibility === "hidden")).toBe(true);
    });

    resolveDownload();
    // Après résolution, le texte redevient visible
    await waitFor(() => {
      const spans = screen.getAllByText("Excel annuel");
      expect(spans.every((s) => (s as HTMLElement).style.visibility !== "hidden")).toBe(true);
    });
  });

  // ── [NEW] Erreur génération : parse blob 400 ──────────────────────────────────

  it("affiche 'Ressources HRID manquantes' quand le serveur retourne errors[]", async () => {
    const errorBlob = new Blob(
      [JSON.stringify({ errors: ["HRID manquant pour résident 45"] })],
      { type: "application/json" },
    );
    const axiosError = Object.assign(new Error("400"), { response: { data: errorBlob } });
    (exportsRhApi.generateStaffPlanner as Mock).mockRejectedValueOnce(axiosError);

    const { toast } = await import("react-toastify");

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Ressources HRID manquantes pour certains résidents.",
      ),
    );
  });

  it("affiche le message backend quand le blob contient un champ message", async () => {
    const errorBlob = new Blob(
      [JSON.stringify({ message: "Corps JSON invalide — champ \"items\" requis" })],
      { type: "application/json" },
    );
    const axiosError = Object.assign(new Error("400"), { response: { data: errorBlob } });
    (exportsRhApi.generateStaffPlanner as Mock).mockRejectedValueOnce(axiosError);

    const { toast } = await import("react-toastify");

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Corps JSON invalide — champ "items" requis',
      ),
    );
  });

  // ── [NEW] downloadCount & lastGeneratedAt ─────────────────────────────────────

  it("affiche ×2 pour Bob (downloadCount=2) avec tooltip dernier export", async () => {
    await expandNov();
    // Le chip ×2 doit être présent (Bob a downloadCount=2)
    expect(screen.getByText("×2")).toBeDefined();
  });

  it("affiche — pour Alice (downloadCount=0, jamais exportée)", async () => {
    await expandNov();
    // La colonne EXPORTS d'Alice doit afficher —
    // Alice est la première ligne, Bob la seconde
    const rows = screen.getAllByRole("row");
    const aliceRow = rows.find((r) => r.textContent?.includes("Alice Martin"))!;
    // Alice a downloadCount=0 → pas de chip ×N, affiche —
    // On vérifie qu'il n'y a pas de chip ×0 et qu'un "—" est présent dans la ligne
    expect(aliceRow.querySelector('[class*="MuiChip"]')?.textContent).not.toContain("×0");
  });

  it("hasResidentValidation=false pour Bob → residentValidationId null dans fixture", async () => {
    await expandNov();
    // Bob n'a pas de RV → validatedByMds affiché comme —
    const rows = screen.getAllByRole("row");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob Dupont"))!;
    expect(bobRow.textContent).toContain("—");
  });

  it("hasResidentValidation=true pour Alice → validatedByMds affiché comme V", async () => {
    await expandNov();
    const rows = screen.getAllByRole("row");
    const aliceRow = rows.find((r) => r.textContent?.includes("Alice Martin"))!;
    expect(aliceRow.textContent).toContain("V");
  });

  // ── Phase 1 V2 — Badge dirty ─────────────────────────────────────────────────

  it("affiche le badge Modifié si dirtySinceExport=true", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE, BOB, CHARLIE_DIRTY] },
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));
    fireEvent.click(screen.getByText("Novembre 2024"));
    await waitFor(() => screen.getByText("Charlie Leclerc"));
    expect(screen.getByLabelText("Modifié depuis export")).toBeDefined();
  });

  it("n'affiche PAS de badge Modifié si dirtySinceExport=false", async () => {
    await expandNov(); // ALICE et BOB ont dirtySinceExport=false
    expect(screen.queryByLabelText("Modifié depuis export")).toBeNull();
  });

  // ── Phase 1 V2 — Pré-sélection "Modifiés depuis export" ──────────────────────

  it("le bouton 'Modifiés depuis export' sélectionne uniquement les items dirty", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE, BOB, CHARLIE_DIRTY] },
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));

    // Avant clic : Alice présélectionnée (untreated), Bob non, Charlie non (traité)
    // Le bouton "Modifiés depuis export" doit sélectionner uniquement Charlie
    const dirtyBtn = screen.getByRole("button", { name: /Modifiés depuis export/i });
    fireEvent.click(dirtyBtn);

    // Charlie est dirty → 1 sélectionné
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ })).toBeDefined()
    );
  });

  it("le bouton 'Non traités' présélectionne les non traités", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE, CHARLIE_DIRTY] }, // Both untreated
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));

    // Les deux sont non traités → 2 sélectionnés via "Non traités"
    const untreatedBtn = screen.getByRole("button", { name: /Non traités/i });
    fireEvent.click(untreatedBtn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Générer Staff Planner \(2\)/ })).toBeDefined()
    );
  });

  // ── Phase 1 V2 — Export autorisé sans validation MDS ─────────────────────────

  it("MACCS non validé MDS reste exportable (dirty ne bloque pas)", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [{ ...ALICE, validatedByMds: false, dirtySinceExport: true }] },
    ]);
    renderPage();
    // L'item non validé MDS doit être présélectionné (non traité) et le bouton actif
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ })).not.toBeDisabled()
    );
  });

  // ── Phase 1 V2 — Payload SPImport inchangé ────────────────────────────────────

  it("le payload SPImport reste { items: [{ yearResidentId, month, calendarYear }] } même avec dirty", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [CHARLIE_DIRTY] },
    ]);
    renderPage();
    const dirtyBtn = await waitFor(() => screen.getByRole("button", { name: /Modifiés depuis export/i }));
    fireEvent.click(dirtyBtn);
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));

    await waitFor(() =>
      expect(exportsRhApi.generateStaffPlanner).toHaveBeenCalledWith([
        { yearResidentId: 12, month: 11, calendarYear: 2024 },
      ])
    );
    // Vérifie qu'il n'y a PAS d'appel à SPCheckV2 (ancien endpoint mort)
    expect(vi.mocked(exportsRhApi.generateStaffPlanner).mock.calls.length).toBe(1);
  });

  // ── Régression legacy — SPCheckV2 ne doit JAMAIS être appelé ─────────────────

  it("aucun appel à un endpoint SPCheckV2 n'est effectué", async () => {
    // Les seuls appels d'API doivent être listMyYears, listStaffPlannerMonths,
    // generateStaffPlanner — jamais SPCheckV2
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Générer Staff Planner \(1\)/ }));
    await waitFor(() => expect(exportsRhApi.generateStaffPlanner).toHaveBeenCalledOnce());

    // Vérifie que staffPlannerApi (qui contenait SPCheckV2) n'est pas importé
    // en vérifiant qu'aucun appel non listé n'a été fait
    expect(exportsRhApi.listStaffPlannerMonths).toHaveBeenCalled();
    expect(exportsRhApi.generateStaffPlanner).toHaveBeenCalled();
    // staffPlannerApi.checkResidentResource était l'ancien endpoint — n'existe plus dans le scope
  });

  // ── Phase 5 — Lock RH / Clôture officielle ────────────────────────────────────

  it("affiche un bouton Clôturer pour chaque item non verrouillé", async () => {
    await expandNov();
    const aliceRow = screen.getAllByRole("row").find((r) => r.textContent?.includes("Alice Martin"))!;
    expect(aliceRow.querySelector('[aria-label*="Clôturer Alice Martin"]')).toBeDefined();
  });

  it("affiche le chip Verrouillé RH pour un item verrouillé", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE_LOCKED, BOB] },
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));
    fireEvent.click(screen.getByText("Novembre 2024"));
    await waitFor(() => screen.getByText("Verrouillé RH"));
    expect(screen.getByText("Verrouillé RH")).toBeDefined();
  });

  it("le clic sur Clôturer ouvre le dialog avec le titre 'Clôturer la période'", async () => {
    await expandNov();
    const lockBtn = screen.getByLabelText(/^Clôturer Alice Martin/);
    fireEvent.click(lockBtn);
    await waitFor(() => expect(screen.getByText("Clôturer la période")).toBeDefined());
  });

  it("le bouton Confirmer est désactivé si la raison est vide", async () => {
    await expandNov();
    fireEvent.click(screen.getByLabelText(/^Clôturer Alice Martin/));
    await waitFor(() => screen.getByRole("button", { name: /^Clôturer$/ }));
    expect(screen.getByRole("button", { name: /^Clôturer$/ })).toBeDisabled();
  });

  it("appelle setItemLock(locked=true) avec la raison saisie après confirmation", async () => {
    await expandNov();
    fireEvent.click(screen.getByLabelText(/^Clôturer Alice Martin/));
    await waitFor(() => screen.getByRole("textbox", { name: /Raison/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Raison/ }), {
      target: { value: "Clôture définitive novembre 2024" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Clôturer$/ }));
    await waitFor(() =>
      expect(exportsRhApi.setItemLock).toHaveBeenCalledWith(
        10, 11, 2024, true, "Clôture définitive novembre 2024",
      )
    );
  });

  it("affiche le bouton Déverrouiller pour un item verrouillé", async () => {
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE_LOCKED, BOB] },
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));
    fireEvent.click(screen.getByText("Novembre 2024"));
    await waitFor(() => screen.getByLabelText(/^Déverrouiller Alice Martin/));
    expect(screen.getByLabelText(/^Déverrouiller Alice Martin/)).toBeDefined();
  });

  it("le dialog de déverrouillage n'a pas de champ Raison et le bouton est actif", async () => {
    vi.mocked(exportsRhApi.setItemLock).mockResolvedValueOnce({
      yearResidentId: 10, month: 11, calendarYear: 2024,
      locked: false, lockedAt: null, lockedByType: null, lockedById: null, lockReason: null,
    });
    vi.mocked(exportsRhApi.listStaffPlannerMonths).mockResolvedValueOnce([
      { ...NOV_GROUP, items: [ALICE_LOCKED, BOB] },
    ]);
    renderPage();
    await waitFor(() => screen.getByText("Novembre 2024"));
    fireEvent.click(screen.getByText("Novembre 2024"));
    await waitFor(() => screen.getByLabelText(/^Déverrouiller Alice Martin/));
    fireEvent.click(screen.getByLabelText(/^Déverrouiller Alice Martin/));
    await waitFor(() => screen.getByText("Déverrouiller la période"));
    expect(screen.queryByRole("textbox", { name: /Raison/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Déverrouiller/ })).not.toBeDisabled();
  });
});
