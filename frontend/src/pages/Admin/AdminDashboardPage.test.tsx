/**
 * Tests for AdminDashboardPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders pending requests
 * - Shows "Aucune demande" alert when no requests
 * - Renders hospitals list
 * - Approve button calls approveRequest mutation
 * - Reject button calls rejectRequest mutation
 * - "Années" button navigates to /admin/hospitals/:id
 * - "+ Nouveau hôpital" opens dialog
 * - Dialog "Créer" button is disabled when name is empty
 * - Dialog "Créer" calls createHospital
 * - Dialog closes and resets on success
 * - Shows error when createHospital fails
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminDashboardPage from "./AdminDashboardPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/hospitals/:id" element={<div>Hospital detail page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const MOCK_REQUEST = {
  id: 10,
  hospitalName: "Nouvelle Clinique",
  requestedBy: { id: 3, firstname: "Paul", lastname: "Martin", email: "paul@example.com" },
  createdAt: "2026-01-15T10:00:00+00:00",
};

const MOCK_HOSPITAL = {
  id: 1,
  name: "CHU Liège",
  city: "Liège",
  country: "BE",
  isActive: true,
};

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listHospitals).mockResolvedValue([]);
    vi.mocked(adminApi.listRequests).mockResolvedValue([]);
  });

  // ── Loading & empty states ────────────────────────────────────────────────

  it("shows 'Aucune demande en attente' when request list is empty", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/aucune demande en attente/i)).toBeInTheDocument();
    });
  });

  it("renders a pending hospital request card", async () => {
    vi.mocked(adminApi.listRequests).mockResolvedValue([MOCK_REQUEST]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Nouvelle Clinique")).toBeInTheDocument();
      expect(screen.getByText(/Paul Martin/i)).toBeInTheDocument();
      expect(screen.getByText("paul@example.com")).toBeInTheDocument();
    });
  });

  it("renders a hospital card", async () => {
    vi.mocked(adminApi.listHospitals).mockResolvedValue([MOCK_HOSPITAL]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("CHU Liège")).toBeInTheDocument();
      expect(screen.getByText("Liège, BE")).toBeInTheDocument();
    });
  });

  // ── Approve / Reject ──────────────────────────────────────────────────────

  it("calls approveRequest when Approuver is clicked", async () => {
    vi.mocked(adminApi.listRequests).mockResolvedValue([MOCK_REQUEST]);
    vi.mocked(adminApi.approveRequest).mockResolvedValue({ message: "approved", hospitalId: 5 });
    vi.mocked(adminApi.listHospitals).mockResolvedValue([]);
    renderPage();

    const btn = await screen.findByRole("button", { name: /approuver/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(adminApi.approveRequest).toHaveBeenCalledWith(10);
    });
  });

  it("calls rejectRequest when Refuser is clicked", async () => {
    vi.mocked(adminApi.listRequests).mockResolvedValue([MOCK_REQUEST]);
    vi.mocked(adminApi.rejectRequest).mockResolvedValue({ message: "rejected" });
    renderPage();

    const btn = await screen.findByRole("button", { name: /refuser/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(adminApi.rejectRequest).toHaveBeenCalledWith(10);
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it("navigates to hospital detail page when hospital card is clicked", async () => {
    vi.mocked(adminApi.listHospitals).mockResolvedValue([MOCK_HOSPITAL]);
    renderPage();

    await screen.findByText("CHU Liège");
    fireEvent.click(screen.getByText("Cliquer pour configurer →"));

    await waitFor(() => {
      expect(screen.getByText("Hospital detail page")).toBeInTheDocument();
    });
  });

  // ── Create hospital dialog ────────────────────────────────────────────────

  it("opens create hospital dialog when '+ Nouveau hôpital' is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i)); // wait for load

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));

    expect(screen.getByText("Nouvel hôpital")).toBeInTheDocument();
  });

  it("Créer button is disabled when hospital name is empty", async () => {
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i));

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));

    const createBtn = screen.getByRole("button", { name: /créer/i });
    expect(createBtn).toBeDisabled();
  });

  it("Créer button is enabled after entering a hospital name", async () => {
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i));

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));

    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: "CHU Namur" } });

    const createBtn = screen.getByRole("button", { name: /créer/i });
    expect(createBtn).not.toBeDisabled();
  });

  it("calls createHospital and closes dialog on success", async () => {
    vi.mocked(adminApi.createHospital).mockResolvedValue({
      id: 99,
      name: "CHU Namur",
      city: "",
      country: "BE",
      isActive: true,
    });
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i));

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));
    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: "CHU Namur" } });
    fireEvent.click(screen.getByRole("button", { name: /créer/i }));

    await waitFor(() => {
      expect(adminApi.createHospital).toHaveBeenCalled();
      expect(screen.queryByText("Nouvel hôpital")).not.toBeInTheDocument();
    });
  });

  it("shows error message when createHospital fails", async () => {
    vi.mocked(adminApi.createHospital).mockRejectedValue(new Error("Server error"));
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i));

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));
    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: "CHU Namur" } });
    fireEvent.click(screen.getByRole("button", { name: /créer/i }));

    await waitFor(() => {
      expect(screen.getByText(/erreur lors de la création/i)).toBeInTheDocument();
    });
  });

  it("Annuler button closes the dialog without calling API", async () => {
    renderPage();
    await waitFor(() => screen.getByText(/aucune demande/i));

    fireEvent.click(screen.getByRole("button", { name: /nouveau hôpital/i }));
    expect(screen.getByText("Nouvel hôpital")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));

    await waitFor(() => {
      expect(screen.queryByText("Nouvel hôpital")).not.toBeInTheDocument();
    });
    expect(adminApi.createHospital).not.toHaveBeenCalled();
  });
});
