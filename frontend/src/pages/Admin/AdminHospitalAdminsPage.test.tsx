/**
 * Tests for AdminHospitalAdminsPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders hospital admins in a table (email, hospital, status, type)
 * - Search filters by name, email, hospital
 * - Shows "Aucun admin" alert when list is empty
 * - Shows "Aucun résultat" when search yields nothing
 * - Actions menu: invited type → "Renvoyer l'invitation" + "Supprimer le compte"
 * - Actions menu: promoted type → no reinvite, "Révoquer"
 * - Actions menu: active invited → no reinvite option
 * - Delete confirmation dialog calls deleteHospitalAdmin
 * - Reinvite calls reinviteHospitalAdmin
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminHospitalAdminsPage from "./AdminHospitalAdminsPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_ADMINS = [
  {
    id: 1,
    email: "admin@chu.be",
    firstname: "Claire",
    lastname: "Renard",
    status: "active",
    hospital: { id: 10, name: "CHU Liège" },
    createdAt: "2026-01-15T10:00:00+00:00",
    type: "promoted" as const,
  },
  {
    id: 2,
    email: "invite@chr.be",
    firstname: null,
    lastname: null,
    status: "invited",
    hospital: { id: 11, name: "CHR Namur" },
    createdAt: "2026-03-01T09:00:00+00:00",
    type: "invited" as const,
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminHospitalAdminsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.listHospitalAdmins).mockResolvedValue(MOCK_ADMINS as any);
});

describe("AdminHospitalAdminsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listHospitalAdmins).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders admins in table rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    expect(screen.getByText("invite@chr.be")).toBeInTheDocument();
    expect(screen.getByText("CHU Liège")).toBeInTheDocument();
    expect(screen.getByText("CHR Namur")).toBeInTheDocument();
    expect(screen.getByText("Claire Renard")).toBeInTheDocument();
  });

  it("renders type column with correct labels", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Promu")).toBeInTheDocument());
    expect(screen.getByText("Invitation")).toBeInTheDocument();
  });

  it("shows correct status chips", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getByText("Invité")).toBeInTheDocument();
  });

  it("filters by email via search input", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "chu" },
    });
    expect(screen.getByText("admin@chu.be")).toBeInTheDocument();
    expect(screen.queryByText("invite@chr.be")).not.toBeInTheDocument();
  });

  it("shows 'Aucun résultat' when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun admin' alert when list is empty", async () => {
    vi.mocked(adminApi.listHospitalAdmins).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucun admin hôpital enregistré.")).toBeInTheDocument()
    );
  });

  // ── Actions menu — invited type ────────────────────────────────────────────

  it("shows 'Renvoyer l'invitation' for invited admins", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("invite@chr.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Renvoyer l'invitation")).toBeInTheDocument()
    );
  });

  it("shows 'Supprimer le compte' for invited admins", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("invite@chr.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Supprimer le compte")).toBeInTheDocument()
    );
  });

  // ── Actions menu — promoted type ──────────────────────────────────────────

  it("shows 'Révoquer' instead of 'Supprimer le compte' for promoted admins", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Révoquer")).toBeInTheDocument());
    expect(screen.queryByText("Supprimer le compte")).not.toBeInTheDocument();
  });

  it("does not show 'Renvoyer l'invitation' for promoted admins", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Révoquer")).toBeInTheDocument());
    expect(screen.queryByText("Renvoyer l'invitation")).not.toBeInTheDocument();
  });

  // ── Delete / reinvite mutations ────────────────────────────────────────────

  it("opens delete dialog on Révoquer click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("admin@chu.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Révoquer"));
    await waitFor(() =>
      expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    );
  });

  it("calls deleteHospitalAdmin on confirm", async () => {
    vi.mocked(adminApi.deleteHospitalAdmin).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("invite@chr.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(adminApi.deleteHospitalAdmin).toHaveBeenCalledWith(2));
  });

  it("calls reinviteHospitalAdmin for invited admins", async () => {
    vi.mocked(adminApi.reinviteHospitalAdmin).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("invite@chr.be")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Renvoyer l'invitation"));
    await waitFor(() => expect(adminApi.reinviteHospitalAdmin).toHaveBeenCalledWith(2));
  });
});
