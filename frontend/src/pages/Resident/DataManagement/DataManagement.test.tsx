/**
 * Tests for DataManagement.tsx (conteneur de la page "Mes données enregistrées").
 *
 * Covers:
 * - Rend le titre de la page
 * - Onglet Horaires actif par défaut (Timesheet rendu)
 * - Navigation entre les onglets Gardes et Absences
 * - Un seul sous-composant rendu à la fois
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DataManagement from "./DataManagement";

// ── Mocks ────────────────────────────────────────────────────────────────────
// Stub les sous-composants pour ne tester que l'orchestration de DataManagement
vi.mock("./components/timesheet", () => ({
  default: () => <div data-testid="timesheet-tab">Timesheet</div>,
}));
vi.mock("./components/garde", () => ({
  default: () => <div data-testid="garde-tab">Garde</div>,
}));
vi.mock("./components/absence", () => ({
  default: () => <div data-testid="absence-tab">Absence</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DataManagement />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DataManagement — rendu initial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le titre de la page", () => {
    renderPage();
    expect(screen.getByText("Mes données enregistrées")).toBeInTheDocument();
  });

  it("affiche l'onglet Horaires sélectionné par défaut", () => {
    renderPage();
    expect(screen.getByTestId("timesheet-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("garde-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absence-tab")).not.toBeInTheDocument();
  });

  it("affiche les trois onglets de navigation", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: "Horaires" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gardes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Absences" })).toBeInTheDocument();
  });
});

describe("DataManagement — navigation entre onglets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bascule sur le composant Gardes au clic sur l'onglet Gardes", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Gardes" }));
    expect(screen.getByTestId("garde-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("timesheet-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absence-tab")).not.toBeInTheDocument();
  });

  it("bascule sur le composant Absences au clic sur l'onglet Absences", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Absences" }));
    expect(screen.getByTestId("absence-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("timesheet-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("garde-tab")).not.toBeInTheDocument();
  });

  it("revient sur Horaires après avoir été sur Gardes", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Gardes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Horaires" }));
    expect(screen.getByTestId("timesheet-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("garde-tab")).not.toBeInTheDocument();
  });

  it("n'affiche jamais plus d'un sous-composant à la fois", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Absences" }));

    const timesheet = screen.queryByTestId("timesheet-tab");
    const garde = screen.queryByTestId("garde-tab");
    const absence = screen.queryByTestId("absence-tab");

    const visible = [timesheet, garde, absence].filter(Boolean);
    expect(visible).toHaveLength(1);
  });
});
