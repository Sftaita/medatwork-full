/**
 * Tests for HospitalAdminYearResidentsPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders resident cards with name and email
 * - Shows "Aucun résident" alert when list is empty
 * - Back button navigates to /hospital-admin/dashboard
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminYearResidentsPage from "./HospitalAdminYearResidentsPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));

const MOCK_RESIDENTS = [
  {
    yrId: 1, residentId: 101,
    firstname: "Alice", lastname: "Dupont", email: "alice@chu.be",
    yearId: 10, yearTitle: "Cardiologie 2025",
    status: "active" as const, optingOut: false, avatarUrl: null,
    createdAt: "2025-09-01T08:00:00Z",
    accountActivated: true, yearPending: false, job: null,
    canCreateYear: false,
  },
  {
    yrId: 2, residentId: 102,
    firstname: "Bob", lastname: "Martin", email: "bob@chu.be",
    yearId: 10, yearTitle: "Cardiologie 2025",
    status: "pending" as const, optingOut: true, avatarUrl: null,
    createdAt: "2025-09-05T08:00:00Z",
    accountActivated: false, yearPending: true, job: null,
    canCreateYear: false,
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(yearId = "10") {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter initialEntries={[`/hospital-admin/years/${yearId}/residents`]}>
        <Routes>
          <Route
            path="/hospital-admin/years/:yearId/residents"
            element={<HospitalAdminYearResidentsPage />}
          />
          <Route path="/hospital-admin/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hospitalAdminApi.listYearResidents).mockResolvedValue(MOCK_RESIDENTS);
});

describe("HospitalAdminYearResidentsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(hospitalAdminApi.listYearResidents).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders residents with name and email", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Bob Martin")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
  });

  it("shows status badges for active and pending residents", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("shows opting-out indicator for opted-out residents", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    // Bob has optingOut: true → "Oui" visible
    expect(screen.getByText("Oui")).toBeInTheDocument();
  });

  it("renders column headers: Nom, Email, Statut, Opting-out, Ajouté le", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Statut")).toBeInTheDocument();
    expect(screen.getByText("Opting-out")).toBeInTheDocument();
    expect(screen.getByText("Ajouté le")).toBeInTheDocument();
  });

  it("shows footer with resident count", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("2 résidents")).toBeInTheDocument();
  });

  it("shows 'Aucun résident' alert when list is empty", async () => {
    vi.mocked(hospitalAdminApi.listYearResidents).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun résident inscrit pour cette année.")).toBeInTheDocument()
    );
  });

  it("calls listYearResidents with the correct yearId from route params", async () => {
    renderPage("42");
    await waitFor(() => expect(hospitalAdminApi.listYearResidents).toHaveBeenCalledWith(42));
  });

  it("navigates back to dashboard on back button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("ArrowBackIcon").closest("button")!);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  });
});
