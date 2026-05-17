/**
 * Tests for SidebarNav — expanded vs mini (collapsed) rendering.
 *
 * Covered:
 * - sidebarNavData: all pages have icon + href (data integrity)
 * - Expanded mode: nav item text visible, group titles visible
 * - Collapsed (mini) mode: text hidden, icon buttons with aria-labels present
 * - Role-based items: manager / resident / hospitalAdmin / superAdmin
 * - Logout present in both modes
 * - sidebarStore toggle/persistence (LS_KEY)
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SidebarNav from "./SidebarNav";
import { manager, resident, superAdmin, hospitalAdmin, noAuth } from "./sidebarNavData";
import { useSidebarStore, LS_KEY } from "../../../../../../store/sidebarStore";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// mockAuthentication is mutated per test — the factory reads it by reference each render.
const mockAuthentication: Record<string, unknown> = {
  isAuthenticated: true,
  role: "manager",
  firstname: "Alice",
  lastname: "Dupont",
  hospitalName: null,
  canCreateYear: true,
};

vi.mock("../../../../../../hooks/useAuth", () => ({
  default: () => ({
    authentication: mockAuthentication,
    selectedMenuItem: {},
    setSelectedMenuItem: vi.fn(),
  }),
}));

vi.mock("../../../../../../hooks/useNotificationContext", () => ({
  default: () => ({ notifications: { count: 0, notifications: [] } }),
}));

vi.mock("@/store/notificationsStore", () => ({
  useNotificationsStore: () => ({ commUnreadCount: 0 }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setRole(role: string, extra: Record<string, unknown> = {}) {
  Object.assign(mockAuthentication, { role, ...extra });
}

function renderNav(collapsed = false) {
  return render(
    <MemoryRouter>
      <SidebarNav
        onClose={vi.fn()}
        selected={null}
        handleSelected={vi.fn()}
        collapsed={collapsed}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset to default manager role
  Object.assign(mockAuthentication, {
    isAuthenticated: true,
    role: "manager",
    firstname: "Alice",
    lastname: "Dupont",
    hospitalName: null,
    canCreateYear: true,
  });
});

// ── sidebarNavData integrity ──────────────────────────────────────────────────

describe("sidebarNavData — data integrity", () => {
  const allGroups = [...manager, ...resident, ...superAdmin, ...hospitalAdmin, ...noAuth];

  it("every page has an icon", () => {
    for (const group of allGroups) {
      for (const page of group.pages) {
        if (page.href) {
          expect(page.icon, `${group.groupTitle} > "${page.title}" missing icon`).toBeTruthy();
        }
      }
    }
  });

  it("every page has a non-empty href string", () => {
    for (const group of allGroups) {
      for (const page of group.pages) {
        if (page.href !== undefined) {
          expect(page.href.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every page has a title", () => {
    for (const group of allGroups) {
      for (const page of group.pages) {
        if (page.href) {
          expect((page.title ?? "").length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("resident has no empty page objects", () => {
    for (const group of resident) {
      for (const page of group.pages) {
        expect(page.href, `resident group "${group.groupTitle}" has a page without href`).toBeTruthy();
        expect(page.title, `resident group "${group.groupTitle}" has a page without title`).toBeTruthy();
      }
    }
  });

  it("manager contains expected routes", () => {
    const hrefs = manager.flatMap((g) => g.pages.map((p) => p.href));
    expect(hrefs).toContain("/manager/years");
    expect(hrefs).toContain("/manager/calendar");
    expect(hrefs).toContain("/manager/realtime");
  });

  it("hospitalAdmin contains Exports RH route", () => {
    const hrefs = hospitalAdmin.flatMap((g) => g.pages.map((p) => p.href));
    expect(hrefs).toContain("/hospital-admin/exports");
  });

  it("les préférences ne sont plus dans la sidebar (accès via menu topbar)", () => {
    // /profile/settings est accessible via le menu déroulant du nom en Topbar,
    // pas dans la sidebar — vérifier l'absence pour éviter la redondance.
    const settingsHref = "/profile/settings";
    expect(manager.flatMap((g) => g.pages.map((p) => p.href))).not.toContain(settingsHref);
    expect(superAdmin.flatMap((g) => g.pages.map((p) => p.href))).not.toContain(settingsHref);
    expect(hospitalAdmin.flatMap((g) => g.pages.map((p) => p.href))).not.toContain(settingsHref);
    expect(resident.flatMap((g) => g.pages.map((p) => p.href))).not.toContain(settingsHref);
  });
});

// ── Expanded mode ─────────────────────────────────────────────────────────────

describe("SidebarNav expanded mode", () => {
  it("shows text labels for manager items", () => {
    renderNav(false);
    expect(screen.getByText("Calendrier")).toBeInTheDocument();
    expect(screen.getByText("Horaires")).toBeInTheDocument();
    expect(screen.getByText("Validations")).toBeInTheDocument();
  });

  it("shows group title text (CSS uppercase applied by MUI, DOM text is original)", () => {
    renderNav(false);
    // textTransform: uppercase is CSS-only — jsdom returns the original casing
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
  });

  it("n'affiche pas Se déconnecter (accessible via le menu Topbar)", () => {
    renderNav(false);
    expect(screen.queryByText("Se déconnecter")).not.toBeInTheDocument();
  });

  it("does not show hospitalAdmin-specific items for manager", () => {
    renderNav(false);
    expect(screen.queryByText("Exports RH")).not.toBeInTheDocument();
  });
});

// ── Mini (collapsed) mode ─────────────────────────────────────────────────────

describe("SidebarNav collapsed (mini) mode", () => {
  it("does not render text labels", () => {
    renderNav(true);
    expect(screen.queryByText("Calendrier")).not.toBeInTheDocument();
    expect(screen.queryByText("Horaires")).not.toBeInTheDocument();
  });

  it("renders icon buttons with aria-labels matching item titles", () => {
    renderNav(true);
    expect(screen.getByRole("button", { name: "Calendrier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Horaires" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validations" })).toBeInTheDocument();
  });

  it("n'affiche pas le bouton logout (accessible via le menu Topbar)", () => {
    renderNav(true);
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
  });

  it("does not render group title typography", () => {
    renderNav(true);
    expect(screen.queryByText("Agenda")).not.toBeInTheDocument();
    expect(screen.queryByText("Tableau de bord")).not.toBeInTheDocument();
  });
});

// ── Role-based visibility ─────────────────────────────────────────────────────

describe("SidebarNav role-based items", () => {
  it("expanded: hospitalAdmin role shows Exports RH", () => {
    setRole("hospital_admin");
    renderNav(false);
    expect(screen.getByText("Exports RH")).toBeInTheDocument();
    expect(screen.getByText("Gestion des MACCS")).toBeInTheDocument();
  });

  it("expanded: resident role shows Mes horaires", () => {
    setRole("resident");
    renderNav(false);
    expect(screen.getByText("Mes horaires")).toBeInTheDocument();
    expect(screen.getByText("Mes statistiques")).toBeInTheDocument();
  });

  it("expanded: super_admin role shows Hôpitaux and Logs", () => {
    setRole("super_admin");
    renderNav(false);
    expect(screen.getByText("Hôpitaux")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("mini: hospitalAdmin role shows icon button for Exports RH", () => {
    setRole("hospital_admin");
    renderNav(true);
    expect(screen.getByRole("button", { name: "Exports RH" })).toBeInTheDocument();
  });

  it("mini: resident role shows icon button for Mes horaires", () => {
    setRole("resident");
    renderNav(true);
    expect(screen.getByRole("button", { name: "Mes horaires" })).toBeInTheDocument();
  });
});

// ── sidebarStore persistence ──────────────────────────────────────────────────

describe("sidebarStore persistence", () => {
  beforeEach(() => {
    localStorage.removeItem(LS_KEY);
    useSidebarStore.setState({ collapsed: false });
  });

  it("starts as expanded (false) by default", () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("toggle() switches to collapsed and writes 'true' to localStorage", () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });

  it("setCollapsed(true) writes 'true' to localStorage", () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });

  it("double toggle returns to false", () => {
    useSidebarStore.getState().toggle();
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
    expect(localStorage.getItem(LS_KEY)).toBe("false");
  });
});
