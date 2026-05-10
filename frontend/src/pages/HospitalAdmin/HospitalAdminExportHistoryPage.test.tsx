/**
 * Tests for HospitalAdminExportHistoryPage — Phase 3 V2 Enterprise.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import HospitalAdminExportHistoryPage from "./HospitalAdminExportHistoryPage";
import type { HospitalYear } from "../../services/hospitalAdminApi";
import type { ExportBatch, ExportSnapshotSummary, ExportSnapshotDetail } from "../../services/exportsHistoryApi";

// ── Hoisted mocks (must be before vi.mock calls) ─────────────────────────────
// vi.hoisted() runs before vi.mock() factories — safe to reference in factories.

const mockListMyYears     = vi.hoisted(() => vi.fn());
const mockListBatches     = vi.hoisted(() => vi.fn());
const mockListSnapshots   = vi.hoisted(() => vi.fn());
const mockGetSnapshotDetail = vi.hoisted(() => vi.fn());

vi.mock("../../services/hospitalAdminApi", () => ({
  default: { listMyYears: mockListMyYears },
}));

vi.mock("../../services/exportsHistoryApi", () => ({
  default: {
    listBatches:       mockListBatches,
    listSnapshots:     mockListSnapshots,
    getSnapshotDetail: mockGetSnapshotDetail,
    getBatch:          vi.fn(),
  },
}));

vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

const BATCH_1: ExportBatch = {
  id: 1, yearId: 1, batchNumber: 1,
  generatedAt: "2024-11-20T10:00:00+00:00",
  generatedByType: "manager", generatedById: 42,
  itemCount: 3, fileHash: "a".repeat(64), fileSizeBytes: 2048,
  notes: null, createdAt: "2024-11-20T10:00:00+00:00",
};

const BATCH_2: ExportBatch = {
  id: 2, yearId: 1, batchNumber: 2,
  generatedAt: "2024-12-15T14:30:00+00:00",
  generatedByType: "hospital_admin", generatedById: 7,
  itemCount: 5, fileHash: "b".repeat(64), fileSizeBytes: 4096,
  notes: "Clôture décembre", createdAt: "2024-12-15T14:30:00+00:00",
};

const SNAPSHOT_1: ExportSnapshotSummary = {
  id: 10, yearResidentId: 10,
  residentFirstname: "Alice", residentLastname: "Martin",  // displayed as "Martin Alice"
  month: 11, calendarYear: 2024,
  dataFingerprint: "c".repeat(64), validatedByMdsAtExport: true,
  timesheetCount: 5, gardeHospitalCount: 1, absenceCount: 0, totalMinutes: 480,
  workerHRIDAtExport: "W001", sectionHRIDAtExport: "S001",
  createdAt: "2024-11-20T10:00:01+00:00",
};

const SNAPSHOT_DETAIL: ExportSnapshotDetail = {
  ...SNAPSHOT_1,
  payloadLines: "AS=|W001|S001|2024-11-04|1|activeShifts|28800|64800|36000|0||\n",
  batchId: 1, batchNumber: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

function renderPage() {
  return render(<Wrapper><HospitalAdminExportHistoryPage /></Wrapper>);
}

async function selectYear() {
  renderPage();
  await waitFor(() => screen.getByTestId("year-select"));
  fireEvent.change(screen.getByTestId("year-select"), { target: { value: "1" } });
  // Wait for actual batch content to appear
  await waitFor(() => screen.getAllByText("#1").length > 0, { timeout: 3000 });
}

async function openBatchDrawer() {
  await selectYear();
  // Click on the first data row (any row containing "#1")
  const rows = screen.getAllByRole("row");
  const batchRow = rows.find((r) => r.textContent?.includes("#1") && r.textContent?.includes("Manager"));
  fireEvent.click(batchRow ?? rows[1]);
  // Wait for snapshots to load AND render
  await waitFor(() => screen.getByText("Martin Alice"), { timeout: 3000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminExportHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMyYears.mockResolvedValue([YEAR]);
    mockListBatches.mockResolvedValue({ data: [BATCH_2, BATCH_1], total: 2, page: 1, limit: 20 });
    mockListSnapshots.mockResolvedValue({ data: [SNAPSHOT_1], total: 1 });
    mockGetSnapshotDetail.mockResolvedValue(SNAPSHOT_DETAIL);
  });

  // ── Affichage de base ─────────────────────────────────────────────────────

  it("affiche le titre de la page", () => {
    renderPage();
    expect(screen.getByText("Historique des exports")).toBeDefined();
  });

  it("affiche un message si aucune année sélectionnée", () => {
    renderPage();
    expect(screen.getByText(/sélectionnez une année/i)).toBeDefined();
  });

  it("appelle listBatches après sélection de l'année", async () => {
    // selectYear() waits until batch content is visible — listBatches must have been called
    await selectYear();
    expect(mockListBatches.mock.calls.length).toBeGreaterThan(0);
  });

  it("affiche les batches après sélection de l'année", async () => {
    await selectYear();
    await waitFor(() => screen.getAllByText("#1").length > 0);
    expect(screen.getAllByText("#1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#2").length).toBeGreaterThan(0);
  });

  it("affiche le type d'acteur pour chaque batch", async () => {
    await selectYear();
    await waitFor(() => screen.getByText("Manager"));
    expect(screen.getByText("Admin hôpital")).toBeDefined();
  });

  it("affiche le hash court (8 chars + …) pour le premier batch", async () => {
    await selectYear();
    await waitFor(() => screen.getByText("aaaaaaaa…"));
  });

  it("affiche le nombre de MACCS par batch", async () => {
    await selectYear();
    await waitFor(() => screen.getAllByText("3").length > 0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  // ── Drawer détail batch ───────────────────────────────────────────────────

  it("ouvre le drawer et charge les snapshots au clic sur un batch", async () => {
    await openBatchDrawer();
    // Le drawer est ouvert et listSnapshots a été appelé
    expect(mockListSnapshots).toHaveBeenCalledWith(expect.any(Number));
  });

  it("affiche le nom du résident dans le drawer", async () => {
    await openBatchDrawer();
    await waitFor(() => screen.getByText("Martin Alice"));
  });

  it("n'affiche PAS payloadLines dans la liste des snapshots", async () => {
    await openBatchDrawer();
    await waitFor(() => screen.getByText("Martin Alice"));
    // payloadLines ne doit pas apparaître dans la liste des snapshots
    expect(screen.queryByText(/AS=\|W001/)).toBeNull();
  });

  // ── Détail snapshot ───────────────────────────────────────────────────────

  it("appelle getSnapshotDetail au clic sur une ligne snapshot", async () => {
    await openBatchDrawer();
    await waitFor(() => screen.getByText("Martin Alice"));
    fireEvent.click(screen.getByText("Martin Alice").closest("tr")!);
    await waitFor(() => expect(mockGetSnapshotDetail).toHaveBeenCalledWith(10));
  });

  it("affiche payloadLines dans le détail snapshot", async () => {
    await openBatchDrawer();
    await waitFor(() => screen.getByText("Martin Alice"));
    fireEvent.click(screen.getByText("Martin Alice").closest("tr")!);
    await waitFor(() => screen.getByText(/AS=\|W001/));
  });

  it("affiche le fingerprint complet dans le détail snapshot", async () => {
    await openBatchDrawer();
    await waitFor(() => screen.getByText("Martin Alice"));
    fireEvent.click(screen.getByText("Martin Alice").closest("tr")!);
    await waitFor(() => screen.getByText("c".repeat(64)));
  });

  // ── Filtres ───────────────────────────────────────────────────────────────

  it("le champ filtre N° batch est présent", async () => {
    await selectYear();
    // Le champ est un TextField avec label "N° batch" rendu comme input
    const inputs = screen.getAllByRole("textbox");
    // Au moins un champ de saisie doit être présent (le filtre numéro batch)
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("saisir un numéro de batch déclenche un nouvel appel à listBatches", async () => {
    await selectYear();
    const callsBefore = mockListBatches.mock.calls.length;

    // Trouver l'input de recherche numéro batch (premier textbox visible)
    const inputs = screen.getAllByRole("textbox");
    // Le premier input devrait être le filtre numéro batch
    fireEvent.change(inputs[0], { target: { value: "2" } });

    await waitFor(() => mockListBatches.mock.calls.length > callsBefore);
    // Vérifie que le dernier appel inclut batchNumber=2
    const lastCall = mockListBatches.mock.calls[mockListBatches.mock.calls.length - 1];
    expect(lastCall[1]).toMatchObject({ batchNumber: 2 });
  });

  // ── Régressions ───────────────────────────────────────────────────────────

  it("la page n'expose pas de bouton d'export Staff Planner", () => {
    // La page historique est en lecture seule — aucun bouton de génération
    renderPage();
    expect(screen.queryByText(/générer staff planner/i)).toBeNull();
    expect(screen.queryByText(/SPImport/i)).toBeNull();
  });
});
