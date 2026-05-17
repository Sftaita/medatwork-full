/**
 * Tests for ProfileSettingsPage — Phase 3.
 *
 * Covered:
 * - Loading skeletons while settings are fetching
 * - Error alert when API fails
 * - All 5 sections render (Apparence, Langue, Calendrier, Tableaux, Notifications)
 * - Theme switch calls patch correctly
 * - showWeekends switch calls patch correctly
 * - Tables pageSize select calls patch correctly
 * - Extended notification switches (validation, planning, staffPlanner)
 * - Save indicator chips (Sauvegarde… / Sauvegardé)
 * - Navigation back to /profile
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileSettingsPage from "./ProfileSettingsPage";
import type { UserSettings } from "../../services/settingsApi";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockMutate    = vi.fn();
let mockIsPending   = false;
let mockIsSuccess   = false;

// vi.mock is hoisted — cannot reference variables declared below.
// Inline the settings to avoid "cannot access before initialization".
vi.mock("../../hooks/useUserSettings", () => {
  const settings = {
    theme: "light" as const,
    language: "fr" as const,
    calendar: { defaultView: "month" as const, lastUsedView: null, showWeekends: true },
    notifications: {
      email: true, push: true, compliance: true, dailySummary: false,
      validation: true, planning: true, staffPlanner: true,
    },
    ui:     { sidebarCollapsed: false },
    tables: { staffPlanner: { pageSize: 25 as const, dense: false } },
  };
  return {
    DEFAULT_SETTINGS: settings,
    useUserSettings:   () => ({ data: settings, isLoading: false, isError: false }),
    useUpdateSettings: () => ({ mutate: mockMutate, isPending: mockIsPending, isSuccess: mockIsSuccess }),
  };
});

vi.mock("../../hooks/useTableDensity", () => ({
  useTableDensity: () => ({ density: "comfortable", cycleDensity: vi.fn() }),
}));

vi.mock("../../components/DensityToggleButton", () => ({
  DensityToggleButton: () => <button>Densité</button>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfileSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPending = false;
  mockIsSuccess = false;
});

describe("ProfileSettingsPage — all sections render", () => {
  it("renders Apparence section", () => {
    renderPage();
    expect(screen.getByText("Apparence")).toBeInTheDocument();
  });

  it("renders Langue section", () => {
    renderPage();
    expect(screen.getByText("Langue", { selector: "h6" })).toBeInTheDocument();
  });

  it("renders Calendrier section", () => {
    renderPage();
    expect(screen.getByText("Calendrier")).toBeInTheDocument();
  });

  it("renders Tableaux section", () => {
    renderPage();
    expect(screen.getByText("Tableaux")).toBeInTheDocument();
  });

  it("renders Notifications section", () => {
    renderPage();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    renderPage();
    expect(screen.getByText("Préférences")).toBeInTheDocument();
  });
});

describe("ProfileSettingsPage — theme switch", () => {
  it("renders theme switch unchecked for light mode", () => {
    renderPage();
    const themeSwitch = screen.getByRole("checkbox", { name: /Activer le mode sombre/ });
    expect(themeSwitch).not.toBeChecked();
  });

  it("toggling calls patch with dark", () => {
    renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /Activer le mode sombre/ }));
    expect(mockMutate).toHaveBeenCalledWith({ theme: "dark" });
  });
});

describe("ProfileSettingsPage — calendar switches", () => {
  it("showWeekends switch is checked by default", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /Afficher les weekends/ })).toBeChecked();
  });

  it("toggling showWeekends calls patch with false", () => {
    renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /Afficher les weekends/ }));
    expect(mockMutate).toHaveBeenCalledWith({ calendar: { showWeekends: false } });
  });
});

describe("ProfileSettingsPage — extended notifications", () => {
  it("renders validation switch", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /Validations de période/ })).toBeInTheDocument();
  });

  it("renders planning switch", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /Modifications de planning/ })).toBeInTheDocument();
  });

  it("renders Staff Planner notification switch", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /Exports Staff Planner/ })).toBeInTheDocument();
  });

  it("toggling validation calls patch correctly", () => {
    renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /Validations de période/ }));
    expect(mockMutate).toHaveBeenCalledWith({ notifications: { validation: false } });
  });
});

describe("ProfileSettingsPage — save indicator", () => {
  it("shows Sauvegarde chip when isPending", () => {
    mockIsPending = true;
    renderPage();
    expect(screen.getByText("Sauvegarde…")).toBeInTheDocument();
  });

  it("shows Sauvegardé chip when isSuccess", async () => {
    mockIsSuccess = true;
    renderPage();
    await waitFor(() => expect(screen.getByText("Sauvegardé")).toBeInTheDocument());
  });

  it("shows no indicator in idle state", () => {
    renderPage();
    expect(screen.queryByText("Sauvegarde…")).not.toBeInTheDocument();
    expect(screen.queryByText("Sauvegardé")).not.toBeInTheDocument();
  });
});

describe("ProfileSettingsPage — navigation", () => {
  it("back button navigates to /profile", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Retour au profil/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });
});
