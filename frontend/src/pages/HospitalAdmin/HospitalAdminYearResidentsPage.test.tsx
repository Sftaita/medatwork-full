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
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));

const MOCK_RESIDENTS = [
  { id: 1, firstname: "Alice", lastname: "Dupont", email: "alice@chu.be" },
  { id: 2, firstname: "Bob", lastname: "Martin", email: "bob@chu.be" },
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
  vi.mocked(adminApi.listYearResidents).mockResolvedValue(MOCK_RESIDENTS);
});

describe("HospitalAdminYearResidentsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listYearResidents).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders resident cards with name and email", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Bob Martin")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
  });

  it("shows 'Aucun résident' alert when list is empty", async () => {
    vi.mocked(adminApi.listYearResidents).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun résident inscrit pour cette année.")).toBeInTheDocument()
    );
  });

  it("calls listYearResidents with the correct yearId from route params", async () => {
    renderPage("42");
    await waitFor(() => expect(adminApi.listYearResidents).toHaveBeenCalledWith(42));
  });

  it("navigates back to dashboard on back button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice Dupont")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("ArrowBackIcon").closest("button")!);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  });
});
