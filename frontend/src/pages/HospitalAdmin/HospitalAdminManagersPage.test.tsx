/**
 * Tests for HospitalAdminManagersPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders managers in table (name, email, function, year, status chip)
 * - Shows "Aucun manager" alert when list is empty
 * - Shows "Aucun résultat" alert when search yields nothing
 * - Filters by name via search input
 * - Filters by email via search input
 * - Toggle between "Années en cours" and "Historique"
 * - Opens actions menu, shows "Renvoyer l'invitation" only for pending managers
 * - Opens ViewDrawer on "Voir détail"
 * - Opens delete confirmation dialog on "Supprimer définitivement"
 * - Calls deleteManager on confirm
 * - Calls removeManagerYear on "Retirer de l'année"
 * - Calls resendManagerInvite on "Renvoyer l'invitation"
 * - Opens AddDialog on "Ajouter un manager" button
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HospitalAdminManagersPage from "./HospitalAdminManagersPage";
import hospitalAdminApi from "../../services/hospitalAdminApi";

vi.mock("../../services/hospitalAdminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_YEARS = [
  { id: 1, title: "Stage cardiologie 2025", period: "2025-2026", dateOfEnd: "2026-08-31" },
];

const MOCK_MANAGERS = [
  {
    myId: 10,
    managerId: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@chu.be",
    job: "medical supervisor",
    yearId: 1,
    yearTitle: "Stage cardiologie 2025",
    status: "active",
  },
  {
    myId: 20,
    managerId: 2,
    firstname: "Bob",
    lastname: "Martin",
    email: "bob@chu.be",
    job: "doctor",
    yearId: 1,
    yearTitle: "Stage cardiologie 2025",
    status: "pending",
  },
  {
    myId: 30,
    managerId: 3,
    firstname: "Carla",
    lastname: "Rossi",
    email: "carla@chu.be",
    job: "human resources",
    yearId: 1,
    yearTitle: "Stage cardiologie 2025",
    status: "not_registered",
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <HospitalAdminManagersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hospitalAdminApi.listManagers).mockResolvedValue(MOCK_MANAGERS as any);
  vi.mocked(hospitalAdminApi.listMyYears).mockResolvedValue(MOCK_YEARS as any);
});

describe("HospitalAdminManagersPage", () => {
  // ── Loading ────────────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    vi.mocked(hospitalAdminApi.listManagers).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Table rendering ────────────────────────────────────────────────────────

  it("renders managers with name, email and year", async () => {
    renderPage();
    // Table renders as "{lastname} {firstname}"
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
    expect(screen.getAllByText("Stage cardiologie 2025").length).toBeGreaterThanOrEqual(1);
  });

  it("renders status chips for all three statuses", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Sans compte")).toBeInTheDocument();
  });

  // ── Empty & no results ─────────────────────────────────────────────────────

  it("shows 'Aucun manager' alert when list is empty", async () => {
    vi.mocked(hospitalAdminApi.listManagers).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun manager pour cette période.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun résultat' when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email ou année…"), {
      target: { value: "zzz-unknown" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  // ── Search filtering ───────────────────────────────────────────────────────

  it("filters by name", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email ou année…"), {
      target: { value: "alice" },
    });
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("filters by email", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("bob@chu.be")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email ou année…"), {
      target: { value: "bob@" },
    });
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
  });

  // ── Mode toggle ────────────────────────────────────────────────────────────

  it("switches to 'Historique' mode on toggle click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Historique")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Historique"));
    await waitFor(() => expect(hospitalAdminApi.listManagers).toHaveBeenCalledWith("history"));
  });

  // ── Actions menu ───────────────────────────────────────────────────────────

  it("shows 'Renvoyer l'invitation' only for pending manager", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());

    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Active manager (index 0) → no resend
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Voir le détail")).toBeInTheDocument());
    expect(screen.queryByText("Renvoyer l'invitation")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Pending manager (index 1) → has resend
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() => expect(screen.getByText("Renvoyer l'invitation")).toBeInTheDocument());
  });

  it("opens ViewDrawer on 'Voir le détail'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Voir le détail"));
    // Drawer opens — email now appears twice (table + drawer)
    await waitFor(() => expect(screen.getAllByText("alice@chu.be").length).toBe(2));
  });

  it("opens delete confirmation on 'Supprimer définitivement'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer définitivement"));
    await waitFor(() =>
      expect(screen.getByText("Supprimer définitivement ce manager ?")).toBeInTheDocument()
    );
  });

  it("calls deleteManager on delete confirm", async () => {
    vi.mocked(hospitalAdminApi.deleteManager).mockResolvedValue(undefined as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer définitivement"));
    // Confirm button inside dialog (menu has closed, only dialog button remains)
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer définitivement" }));
    await waitFor(() => expect(hospitalAdminApi.deleteManager).toHaveBeenCalledWith(1));
  });

  it("calls removeManagerYear on 'Retirer de l'année'", async () => {
    vi.mocked(hospitalAdminApi.removeManagerYear).mockResolvedValue(undefined as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Retirer de l'année"));
    fireEvent.click(await screen.findByRole("button", { name: "Retirer" }));
    await waitFor(() => expect(hospitalAdminApi.removeManagerYear).toHaveBeenCalledWith(10));
  });

  it("calls resendManagerInvite for pending manager", async () => {
    vi.mocked(hospitalAdminApi.resendManagerInvite).mockResolvedValue(undefined as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Renvoyer l'invitation"));
    await waitFor(() => expect(hospitalAdminApi.resendManagerInvite).toHaveBeenCalledWith(20));
  });

  // ── Add dialog ─────────────────────────────────────────────────────────────

  it("opens AddDialog on 'Ajouter un manager' button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));
    // Dialog is open when "Ajouter un manager" appears twice (button + dialog title)
    await waitFor(() => expect(screen.getAllByText("Ajouter un manager").length).toBe(2));
  });
});
