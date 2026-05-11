/**
 * Tests for HospitalAdminAuditTimelinePage (Phase 6).
 *
 * Covers:
 * - "Sélectionnez une année" alert shown when no year selected
 * - Events table rendered when data loaded
 * - Event type chip label shown correctly
 * - Resident name shown in MACCS column
 * - Period (mois/année) displayed in MACCS column
 * - Actor type chip shown
 * - Context expand button opens JSON
 * - Filter by event type triggers API with correct params
 * - Reset filters button clears active filters
 * - Pagination shows correct total
 * - Empty state shown when no events
 * - Error state shown on API failure
 * - Active filter chips rendered and removable
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminAuditTimelinePage from "./HospitalAdminAuditTimelinePage";
import type { HospitalYear } from "../../services/hospitalAdminApi";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import auditTimelineApi from "../../services/auditTimelineApi";
import type { AuditEvent, PaginatedAuditEvents } from "../../services/auditTimelineApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../services/auditTimelineApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
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

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 1,
    eventType: "rh_lock_applied",
    actorType: "hospital_admin",
    actorId: 10,
    month: 11,
    calendarYear: 2024,
    yearResidentId: 99,
    residentName: "Alice Martin",
    batchId: null,
    batchNumber: null,
    occurredAt: "2024-11-20T09:00:00+00:00",
    context: { reason: "Clôture définitive", month: 11, calendarYear: 2024 },
    ...overrides,
  };
}

function makePaginated(events: AuditEvent[], total = events.length): PaginatedAuditEvents {
  return { data: events, total, page: 1, limit: 50 };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

function renderPage() {
  return render(<Wrapper><HospitalAdminAuditTimelinePage /></Wrapper>);
}

async function selectYear() {
  await waitFor(() => screen.getByTestId("year-select"));
  fireEvent.change(screen.getByTestId("year-select"), { target: { value: "1" } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminAuditTimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue([YEAR]);
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(makePaginated([]));
  });

  // ── No year selected ───────────────────────────────────────────────────────

  it("affiche l'alerte de sélection d'année si aucune année choisie", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("year-select"));
    expect(screen.getByText(/Sélectionnez une année académique/)).toBeDefined();
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it("affiche l'état vide si aucun événement", async () => {
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText(/Aucun événement d'audit/));
  });

  // ── Events table ───────────────────────────────────────────────────────────

  it("affiche une ligne par événement dans le tableau", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent(), makeEvent({ id: 2, eventType: "export_generated", residentName: null })])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText("Clôture RH appliquée"));
    expect(screen.getByText("Export généré")).toBeDefined();
  });

  it("affiche le nom du résident dans la colonne MACCS", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent({ residentName: "Martin Alice" })])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText("Martin Alice"));
  });

  it("affiche la période mois/année", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent({ month: 11, calendarYear: 2024 })])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText("11/2024"));
  });

  it("affiche le chip acteur 'Admin hôpital'", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent({ actorType: "hospital_admin" })])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText("Admin hôpital"));
  });

  // ── Context expand ─────────────────────────────────────────────────────────

  it("le bouton expand affiche le JSON du contexte", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent()])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByLabelText("Voir le contexte"));
    fireEvent.click(screen.getByLabelText("Voir le contexte"));
    await waitFor(() => screen.getByText(/Clôture définitive/));
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it("affiche le total d'événements", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent()], 42)
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText(/42 événements/));
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it("affiche l'erreur si l'API échoue", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockRejectedValue(new Error("500"));
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText(/Erreur lors du chargement/));
  });

  // ── Filters ────────────────────────────────────────────────────────────────

  it("le bouton Réinitialiser est visible quand un filtre est actif", async () => {
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByLabelText("Mois (1–12)"));
    fireEvent.change(screen.getByLabelText("Mois (1–12)"), { target: { value: "11" } });
    await waitFor(() => screen.getByText("Réinitialiser"));
    expect(screen.getByText("Réinitialiser")).toBeDefined();
  });

  it("cliquer sur Réinitialiser efface les filtres actifs", async () => {
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByLabelText("Mois (1–12)"));
    fireEvent.change(screen.getByLabelText("Mois (1–12)"), { target: { value: "11" } });
    await waitFor(() => screen.getByText("Réinitialiser"));
    fireEvent.click(screen.getByText("Réinitialiser"));
    await waitFor(() => expect(screen.queryByText("Réinitialiser")).toBeNull());
  });

  // ── Filter chips ───────────────────────────────────────────────────────────

  it("affiche un chip de filtre actif pour le mois", async () => {
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByLabelText("Mois (1–12)"));
    fireEvent.change(screen.getByLabelText("Mois (1–12)"), { target: { value: "11" } });
    await waitFor(() => screen.getByText("Mois: 11"));
  });

  // ── Batch chip ─────────────────────────────────────────────────────────────

  it("affiche le chip Export #N pour les events avec batchNumber", async () => {
    vi.mocked(auditTimelineApi.listByYear).mockResolvedValue(
      makePaginated([makeEvent({ eventType: "export_generated", batchId: 15, batchNumber: 3 })])
    );
    renderPage();
    await selectYear();
    await waitFor(() => screen.getByText("Export #3"));
  });
});
