/**
 * Tests for AdminHospitalDetailPage.
 *
 * Covers:
 * - Shows spinner while loading hospital info
 * - Renders hospital name and status chip
 * - Tab 0 (Admins): shows table with name, email, status, date
 * - Tab 0 (Admins): search filters by name and email
 * - Tab 0 (Admins): shows "Aucun administrateur" when empty
 * - Tab 0 (Admins): "Inviter un admin" button opens dialog
 * - Tab 0 (Admins): invite calls inviteHospitalAdmin
 * - Tab 0 (Admins): delete confirmation dialog and call
 * - Tab 0 (Admins): "Promouvoir un manager" dialog opens and calls promoteManagerToAdmin
 * - Tab 1 (Années): shows year cards
 * - Tab 1 (Années): shows "Aucune année" when empty
 * - Tab 2 (Managers): shows manager table
 * - Tab 2 (Managers): shows "Aucun manager" when empty
 * - Tab 2 (Managers): remove manager calls removeManagerFromHospital
 * - Tab 2 (Managers): "Associer un manager" dialog opens and calls addManagerToHospital
 * - Back button navigates to /admin
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminHospitalDetailPage from "./AdminHospitalDetailPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_HOSPITAL = {
  id: 5,
  name: "CHU Liège",
  city: "Liège",
  country: "BE",
  isActive: true,
};

const MOCK_ADMINS = [
  {
    id: 1,
    email: "admin@chu.be",
    firstname: "Claire",
    lastname: "Renard",
    status: "active",
    createdAt: "2026-01-15T10:00:00+00:00",
    type: "invited",
  },
  {
    id: 2,
    email: "invite@chu.be",
    firstname: null,
    lastname: null,
    status: "invited",
    createdAt: "2026-03-01T09:00:00+00:00",
    type: "invited",
  },
];

const MOCK_YEARS = [
  {
    id: 10,
    title: "Stage cardio S1",
    period: "2025-2026",
    location: "Cardiologie",
    speciality: "Cardiologie",
    dateOfStart: "2025-09-01",
    dateOfEnd: "2026-02-28",
    residentCount: 3,
    hospital: { id: 5, name: "CHU Liège" },
  },
];

const MOCK_HOSPITAL_MANAGERS = [
  {
    id: 10,
    email: "manager@chu.be",
    firstname: "Paul",
    lastname: "Dupont",
    status: "active",
    hospitals: [{ id: 5, name: "CHU Liège" }],
  },
];

const MOCK_ALL_MANAGERS = [
  ...MOCK_HOSPITAL_MANAGERS,
  {
    id: 11,
    email: "other@chu.be",
    firstname: "Léa",
    lastname: "Martin",
    status: "active",
    hospitals: [],
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(hospitalId = "5") {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter initialEntries={[`/admin/hospitals/${hospitalId}`]}>
        <Routes>
          <Route path="/admin/hospitals/:id" element={<AdminHospitalDetailPage />} />
          <Route path="/admin" element={<div>Admin dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getHospital).mockResolvedValue(MOCK_HOSPITAL as any);
  vi.mocked(adminApi.listHospitalAdminsForHospital).mockResolvedValue(MOCK_ADMINS as any);
  vi.mocked(adminApi.listHospitalYears).mockResolvedValue(MOCK_YEARS as any);
  vi.mocked(adminApi.listHospitalManagers).mockResolvedValue(MOCK_HOSPITAL_MANAGERS as any);
  vi.mocked(adminApi.listManagers).mockResolvedValue(MOCK_ALL_MANAGERS as any);
});

describe("AdminHospitalDetailPage", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(adminApi.getHospital).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders hospital name and active chip", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    expect(screen.getAllByText("Actif").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Liège, BE")).toBeInTheDocument();
  });

  it("navigates back to /admin on back button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("ArrowBackIcon").closest("button")!);
    await waitFor(() => expect(screen.getByText("Admin dashboard")).toBeInTheDocument());
  });

  it("shows admins tab with table rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    expect(screen.getByText("invite@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Claire Renard")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("filters admins by email", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom ou email…"), {
      target: { value: "invite" },
    });
    expect(screen.queryByText("Claire Renard")).not.toBeInTheDocument();
    expect(screen.getByText("invite@chu.be")).toBeInTheDocument();
  });

  it("filters admins by name", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Claire Renard")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom ou email…"), {
      target: { value: "claire" },
    });
    expect(screen.getByText("Claire Renard")).toBeInTheDocument();
    expect(screen.queryByText("invite@chu.be")).not.toBeInTheDocument();
  });

  it("shows 'Aucun administrateur' when list is empty", async () => {
    vi.mocked(adminApi.listHospitalAdminsForHospital).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun administrateur pour cet hôpital.")).toBeInTheDocument()
    );
  });

  it("opens invite dialog on button click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Inviter un admin/i }));
    await waitFor(() => expect(screen.getByText("Inviter un administrateur")).toBeInTheDocument());
  });

  it("calls inviteHospitalAdmin on invite confirm", async () => {
    vi.mocked(adminApi.inviteHospitalAdmin).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Inviter un admin/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("admin@hopital.be")).toBeInTheDocument()
    );
    fireEvent.change(screen.getByPlaceholderText("admin@hopital.be"), {
      target: { value: "new@chu.be" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Envoyer l'invitation/i }));
    await waitFor(() => expect(adminApi.inviteHospitalAdmin).toHaveBeenCalledWith(5, "new@chu.be"));
  });

  it("opens delete dialog and calls deleteHospitalAdmin", async () => {
    vi.mocked(adminApi.deleteHospitalAdmin).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    await waitFor(() =>
      expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(adminApi.deleteHospitalAdmin).toHaveBeenCalledWith(1));
  });

  it("opens promote dialog and calls promoteManagerToAdmin", async () => {
    vi.mocked(adminApi.promoteManagerToAdmin).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Promouvoir un manager/i }));
    await waitFor(() =>
      expect(screen.getByText("Promouvoir un manager en administrateur")).toBeInTheDocument()
    );
    // Léa Martin is not yet an admin for this hospital (not in MOCK_HOSPITAL_MANAGERS for this test variant)
    await waitFor(() => expect(screen.getByText("Léa Martin")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Léa Martin"));
    fireEvent.click(screen.getByRole("button", { name: /Promouvoir/i }));
    await waitFor(() => expect(adminApi.promoteManagerToAdmin).toHaveBeenCalledWith(5, 11));
  });

  it("switches to Années tab and shows year cards", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Années/i }));
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
  });

  it("shows 'Aucune année' on Années tab when empty", async () => {
    vi.mocked(adminApi.listHospitalYears).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Années/i }));
    await waitFor(() =>
      expect(screen.getByText("Aucune année de formation pour cet hôpital.")).toBeInTheDocument()
    );
  });

  it("switches to Managers tab and shows manager table", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Managers/i }));
    await waitFor(() => expect(screen.getByText("manager@chu.be")).toBeInTheDocument());
    expect(screen.getByText("Paul Dupont")).toBeInTheDocument();
  });

  it("shows 'Aucun manager' on Managers tab when empty", async () => {
    vi.mocked(adminApi.listHospitalManagers).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Managers/i }));
    await waitFor(() =>
      expect(screen.getByText("Aucun manager associé à cet hôpital.")).toBeInTheDocument()
    );
  });

  it("opens remove manager dialog and calls removeManagerFromHospital", async () => {
    vi.mocked(adminApi.removeManagerFromHospital).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Managers/i }));
    await waitFor(() => expect(screen.getByText("Paul Dupont")).toBeInTheDocument());
    // Click table "Retirer" to open the confirmation dialog
    fireEvent.click(screen.getAllByRole("button", { name: /Retirer/i })[0]);
    await waitFor(() =>
      expect(screen.getByText(/Le compte manager reste actif/)).toBeInTheDocument()
    );
    // Two "Retirer" buttons now: table + dialog — click the last one (dialog confirm)
    const retireButtons = screen.getAllByRole("button", { name: /Retirer/i });
    fireEvent.click(retireButtons[retireButtons.length - 1]);
    await waitFor(() => expect(adminApi.removeManagerFromHospital).toHaveBeenCalledWith(5, 10));
  });

  it("opens add manager dialog, calls addManagerToHospital and keeps dialog open", async () => {
    vi.mocked(adminApi.addManagerToHospital).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Managers/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Associer un manager/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /Associer un manager/i }));
    await waitFor(() =>
      expect(screen.getByText("Associer un manager à cet hôpital")).toBeInTheDocument()
    );
    // Léa Martin is not yet assigned (not in hospitalManagers)
    await waitFor(() => expect(screen.getByText("Léa Martin")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Associer" }));
    await waitFor(() => expect(adminApi.addManagerToHospital).toHaveBeenCalledWith(5, 11));
    // Dialog must remain open after association
    expect(screen.getByText("Associer un manager à cet hôpital")).toBeInTheDocument();
  });
});
