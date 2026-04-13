/**
 * Tests for AdminManagersPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders managers in a table (name, email, status, hospitals)
 * - Search filters by name, email, hospital
 * - Shows "Aucun manager" alert when list is empty
 * - Shows "Aucun résultat" when search yields nothing
 * - Stats cards render with correct values
 * - Actions menu: toggle, reset password, delete
 * - Delete confirmation dialog
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminManagersPage from "./AdminManagersPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_STATS = { total: 3, active: 1, inactive: 0, pending: 1, notActivated: 1 };

const MOCK_MANAGERS = [
  {
    id: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@chu.be",
    status: "active",
    validatedAt: "2025-09-01T00:00:00+00:00",
    hospitals: [{ id: 10, name: "CHU Liège" }],
  },
  {
    id: 2,
    firstname: "Bob",
    lastname: "Martin",
    email: "bob@chu.be",
    status: "pending_hospital",
    validatedAt: null,
    hospitals: [],
  },
  {
    id: 3,
    firstname: "Carla",
    lastname: "Rossi",
    email: "carla@chu.be",
    status: "active",
    validatedAt: null,
    hospitals: [{ id: 10, name: "CHU Liège" }],
  },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminManagersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getManagerStats).mockResolvedValue(MOCK_STATS);
  vi.mocked(adminApi.listManagers).mockResolvedValue(MOCK_MANAGERS as any);
});

describe("AdminManagersPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listManagers).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders stats cards", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Total")).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Non activés")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders managers in table rows", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@chu.be")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
    expect(screen.getAllByText("CHU Liège").length).toBeGreaterThanOrEqual(1);
  });

  it("shows status chips including 'Non activé'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getAllByText("En attente").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Non activé").length).toBe(2);
  });

  it("renders managers sorted by lastname", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    const names = rows
      .slice(1) // skip header
      .map((r) => r.textContent ?? "");
    const dupont = names.findIndex((n) => n.includes("Dupont"));
    const martin = names.findIndex((n) => n.includes("Martin"));
    const rossi = names.findIndex((n) => n.includes("Rossi"));
    expect(dupont).toBeLessThan(martin);
    expect(martin).toBeLessThan(rossi);
  });

  it("filters by name via search input", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "alice" },
    });
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("filters by hospital name", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "Liège" },
    });
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
    expect(screen.queryByText("Martin Bob")).not.toBeInTheDocument();
  });

  it("shows 'Aucun résultat' alert when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun manager' alert when list is empty", async () => {
    vi.mocked(adminApi.listManagers).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Aucun manager enregistré.")).toBeInTheDocument());
  });

  it("opens actions menu on MoreVert click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer / Désactiver")).toBeInTheDocument());
  });

  it("opens delete confirmation dialog", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    await waitFor(() =>
      expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument()
    );
  });

  it("calls deleteManager on confirm", async () => {
    vi.mocked(adminApi.deleteManager).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Supprimer le compte"));
    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(adminApi.deleteManager).toHaveBeenCalledWith(1));
  });

  it("shows 'Activer manuellement' only for non-activated managers", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Alice (validatedAt set) — no manual activate option
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer / Désactiver")).toBeInTheDocument());
    expect(screen.queryByText("Activer manuellement")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Bob (validatedAt=null) — has manual activate option
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer manuellement")).toBeInTheDocument());
  });

  it("calls activateManager when 'Activer manuellement' is clicked", async () => {
    vi.mocked(adminApi.activateManager).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Activer manuellement"));
    await waitFor(() => expect(adminApi.activateManager).toHaveBeenCalledWith(2));
  });

  it("filters by 'Non activé' status label", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom, email, hôpital…"), {
      target: { value: "non activé" },
    });
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("Rossi Carla")).toBeInTheDocument();
  });
});
