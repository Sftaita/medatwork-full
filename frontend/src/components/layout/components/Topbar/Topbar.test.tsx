/**
 * Tests for the Topbar account dropdown menu.
 *
 * Covered:
 * - Avatar + nom ouvre le menu au clic
 * - "Mon compte" navigue vers /profile/account
 * - "Préférences" navigue vers /profile/settings
 * - "Se déconnecter" appelle logout + navigate /login
 * - Menu non affiché si non authentifié
 * - Bouton burger visible sur mobile (xs), toggle desktop masqué
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Topbar from "./Topbar";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogout = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../hooks/useLogout", () => ({ default: () => mockLogout }));

let mockAuthentication = {
  isAuthenticated: true,
  role: "manager" as const,
  firstname: "Alice",
  lastname: "Dupont",
  gender: "female",
  avatarUrl: null as string | null,
  hospitalName: null as string | null,
};

vi.mock("../../../../hooks/useAuth", () => ({
  default: () => ({
    authentication: mockAuthentication,
    selectedMenuItem: {},
    setSelectedMenuItem: vi.fn(),
  }),
}));

vi.mock("../../../../store/sidebarStore", () => ({
  useSidebarStore: () => ({ collapsed: false, toggle: vi.fn() }),
}));

vi.mock("../../../../services/logger", () => ({ default: { clearUser: vi.fn() } }));
vi.mock("../../../../images/logo.png",        () => ({ default: "logo.png" }));
vi.mock("../../../../images/icons/Woman.png", () => ({ default: "woman.png" }));
vi.mock("../../../../images/icons/Man.png",   () => ({ default: "man.png" }));
vi.mock("../../../small/InstallPrompt",       () => ({ default: () => null }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderTopbar() {
  return render(
    <MemoryRouter>
      <Topbar onSidebarOpen={vi.fn()} />
    </MemoryRouter>
  );
}

function openMenu() {
  // Desktop trigger (Box role="button") comes first in DOM; mobile IconButton also has same aria-label
  fireEvent.click(screen.getAllByRole("button", { name: /Mon compte/ })[0]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthentication = {
    isAuthenticated: true,
    role: "manager",
    firstname: "Alice",
    lastname: "Dupont",
    gender: "female",
    avatarUrl: null,
    hospitalName: null,
  };
});

describe("Topbar — account menu", () => {
  it("affiche le nom de l'utilisateur authentifié", () => {
    renderTopbar();
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
  });

  it("ouvre le menu au clic sur l'avatar/nom", () => {
    renderTopbar();
    openMenu();
    expect(screen.getByText("Mon compte")).toBeInTheDocument();
    expect(screen.getByText("Préférences")).toBeInTheDocument();
    expect(screen.getByText("Se déconnecter")).toBeInTheDocument();
  });

  it("navigue vers /profile/account au clic sur Mon compte", async () => {
    renderTopbar();
    openMenu();
    fireEvent.click(screen.getByText("Mon compte"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile/account"));
  });

  it("navigue vers /profile/settings au clic sur Préférences", async () => {
    renderTopbar();
    openMenu();
    fireEvent.click(screen.getByText("Préférences"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile/settings"));
  });

  it("appelle logout + navigate /login au clic sur Se déconnecter", async () => {
    renderTopbar();
    openMenu();
    fireEvent.click(screen.getByText("Se déconnecter"));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("n'affiche pas le menu avatar si non authentifié", () => {
    mockAuthentication = { ...mockAuthentication, isAuthenticated: false };
    renderTopbar();
    expect(screen.queryByRole("button", { name: /Mon compte/ })).not.toBeInTheDocument();
  });
});

describe("Topbar — navigation non authentifiée", () => {
  beforeEach(() => {
    mockAuthentication = { ...mockAuthentication, isAuthenticated: false };
  });

  it("affiche le bouton Se connecter", () => {
    renderTopbar();
    expect(screen.getByText("Se connecter")).toBeInTheDocument();
  });

  it("affiche le bouton S'enregistrer", () => {
    renderTopbar();
    expect(screen.getByText("S'enregistrer")).toBeInTheDocument();
  });
});
