/**
 * Tests for AdminResidentsPage.
 *
 * Covers:
 * - Shows loading spinner while fetching
 * - Renders residents in a table (nom prénom order)
 * - Residents sorted by lastname
 * - Shows status chip (Actif / En attente) based on validatedAt
 * - Search filters by name, email, and status label
 * - Shows "Aucun résident" alert when list is empty
 * - Shows "Aucun résultat" when search yields nothing
 * - Actions menu: activate manually, reset password
 * - "Activer manuellement" only for non-activated residents
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminResidentsPage from "./AdminResidentsPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_RESIDENTS = [
  {
    id: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@res.be",
    validatedAt: "2026-01-01T00:00:00+00:00",
  },
  { id: 2, firstname: "Bob", lastname: "Martin", email: "bob@res.be", validatedAt: null },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminResidentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.listResidents).mockResolvedValue(MOCK_RESIDENTS as any);
});

describe("AdminResidentsPage", () => {
  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listResidents).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders residents in table rows (nom prénom order)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("alice@res.be")).toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@res.be")).toBeInTheDocument();
  });

  it("renders residents sorted by lastname", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    const names = rows.slice(1).map((r) => r.textContent ?? "");
    const dupont = names.findIndex((n) => n.includes("Dupont"));
    const martin = names.findIndex((n) => n.includes("Martin"));
    expect(dupont).toBeLessThan(martin);
  });

  it("shows correct status chips", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("filters by name via search input", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom ou email…"), {
      target: { value: "bob" },
    });
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
  });

  it("filters by status label", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom ou email…"), {
      target: { value: "en attente" },
    });
    expect(screen.queryByText("Dupont Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
  });

  it("shows 'Aucun résultat' when search yields nothing", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Rechercher par nom ou email…"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("shows 'Aucun résident' alert when list is empty", async () => {
    vi.mocked(adminApi.listResidents).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Aucun résident enregistré.")).toBeInTheDocument());
  });

  it("opens actions menu on MoreVert click", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument()
    );
  });

  it("shows 'Activer manuellement' only for non-activated residents", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");

    // Alice (validatedAt set) — no manual activate option
    fireEvent.click(buttons[0].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument()
    );
    expect(screen.queryByText("Activer manuellement")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Bob (validatedAt=null) — has manual activate option
    fireEvent.click(buttons[1].closest("button")!);
    await waitFor(() => expect(screen.getByText("Activer manuellement")).toBeInTheDocument());
  });

  it("calls activateResident when 'Activer manuellement' is clicked", async () => {
    vi.mocked(adminApi.activateResident).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[1].closest("button")!);
    fireEvent.click(await screen.findByText("Activer manuellement"));
    await waitFor(() => expect(adminApi.activateResident).toHaveBeenCalledWith(2));
  });

  it("calls resetResidentPassword when 'Réinitialiser le mot de passe' is clicked", async () => {
    vi.mocked(adminApi.resetResidentPassword).mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    const buttons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(buttons[0].closest("button")!);
    fireEvent.click(await screen.findByText("Réinitialiser le mot de passe"));
    await waitFor(() => expect(adminApi.resetResidentPassword).toHaveBeenCalledWith(1));
  });
});
