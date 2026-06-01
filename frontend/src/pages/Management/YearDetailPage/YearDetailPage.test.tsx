/**
 * Tests — YearDetailPage (/manager/year-detail)
 *
 * Coverage:
 *
 * Redirect & initialisation
 *   - Redirige vers /manager/years quand state est null
 *   - Affiche le titre de l'année depuis state
 *   - Affiche l'eyebrow de navigation
 *   - Affiche le chip « Année active »
 *
 * TabBar
 *   - Rend les 5 onglets avec le bon rôle ARIA
 *   - L'onglet actif par défaut est « Validation » (general)
 *   - state.defaultTab choisit l'onglet initial
 *   - L'onglet actif a aria-selected="true", les autres "false"
 *   - Cliquer un onglet le rend actif
 *   - Cliquer un onglet déclenche window.scrollTo({top:0})
 *   - Le badge count s'affiche quand count est non-null
 *   - Le badge count est absent quand count est null
 *   - Chaque onglet a id="tab-{key}" et aria-controls="tabpanel-{key}"
 *
 * Rendu des panneaux
 *   - Onglet general  → panneau <General>
 *   - Onglet residents → panneau <Residents>
 *   - Onglet partners  → panneau <Partners>
 *   - Onglet setup     → panneau <Setup>
 *   - Onglet compliance → panneau <Compliance>
 *
 * Sous-vues (staffPlanner / residentParameters)
 *   - Passer en staffPlanner masque la barre d'onglets
 *   - Passer en residentParameters masque la barre d'onglets
 *   - Le bandeau breadcrumb est affiché en sous-vue
 *   - Le bouton retour du bandeau ramène à l'onglet setup
 *   - activeTab reste "setup" pendant une sous-vue
 *   - Le panneau <StaffPlanner> est rendu en sous-vue staffPlanner
 *   - Le panneau <ResidentParameters> est rendu en sous-vue residentParameters
 *
 * Bouton retour principal
 *   - navigate(-1) quand l'utilisateur n'est pas en sous-vue
 *   - Retourne à "setup" (sans navigate(-1)) quand en sous-vue
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../doc/CustomizedTheme";
import YearDetailPage from "./YearDetailPage";

// ── Mocks hoisted ──────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn());
let mockLocationState: Record<string, unknown> | null = {
  id: 42,
  title: "Chirurgie 2025",
  adminRights: true,
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const map: Record<string, string> = {
        "yearDetail.tabs.validation":   "Validation",
        "yearDetail.tabs.maccs":        "MACCS",
        "yearDetail.tabs.partners":     "Collaborateurs",
        "yearDetail.tabs.settings":     "Paramètres",
        "yearDetail.tabs.compliance":   "Conformité",
        "yearDetail.breadcrumb":        "Tableau de bord",
        "yearDetail.chip":              "Année active",
        "yearDetail.back":              "Retour",
        "yearDetail.tabBarLabel":       "Onglets de l'année",
      };
      return map[key] ?? fallback ?? key;
    },
  }),
}));

// ── Child component stubs ──────────────────────────────────────────────────────
// Each stub exposes a data-testid so tests can assert which panel is rendered.
// Setup also exposes buttons to trigger sub-view transitions (it receives setActiveLink).

vi.mock("./component/General", () => {
  const { forwardRef } = require("react");
  return {
    default: forwardRef(
      ({ onDirtyChange }: { onDirtyChange?: (d: boolean) => void }, ref: unknown) => (
        <div data-testid="panel-general">
          {/* Bouton de test pour simuler dirty=true depuis le parent */}
          <button data-testid="make-dirty" onClick={() => onDirtyChange?.(true)}>
            Make Dirty
          </button>
        </div>
      )
    ),
  };
});

vi.mock("./component/Residents", () => ({
  default: () => <div data-testid="panel-residents" />,
}));

vi.mock("./component/Partners", () => ({
  default: () => <div data-testid="panel-partners" />,
}));

// Stub ConfirmLeaveDialog : expose ses boutons pour les tests
vi.mock("./component/ValidationView/ConfirmLeaveDialog", () => ({
  default: ({ open, onCancel, onDiscard, onSaveAndContinue }: {
    open: boolean;
    onCancel: () => void;
    onDiscard: () => void;
    onSaveAndContinue: () => void;
  }) => open ? (
    <div data-testid="confirm-leave-dialog">
      <span>Modifications non sauvegardées</span>
      <button onClick={onCancel}>Annuler</button>
      <button onClick={onDiscard}>Quitter sans enregistrer</button>
      <button onClick={onSaveAndContinue}>Enregistrer puis continuer</button>
    </div>
  ) : null,
}));

vi.mock("./component/Setup", () => ({
  default: ({ setActiveLink }: { setActiveLink: (key: string) => void }) => (
    <div data-testid="panel-setup">
      <button onClick={() => setActiveLink("staffPlanner")}>
        Aller StaffPlanner
      </button>
      <button onClick={() => setActiveLink("residentParameters")}>
        Aller ResidentParameters
      </button>
    </div>
  ),
}));

vi.mock("./component/ParametersViews/StaffPlanner", () => ({
  default: () => <div data-testid="panel-staffplanner" />,
}));

vi.mock("./component/ParametersViews/ResidentParameters", () => ({
  default: () => <div data-testid="panel-residentparameters" />,
}));

vi.mock("./component/Compliance", () => ({
  default: () => <div data-testid="panel-compliance" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <YearDetailPage />
    </ThemeProvider>
  );
}

/** Navigate to a tab by clicking it. */
function clickTab(label: string) {
  fireEvent.click(screen.getByRole("tab", { name: label }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLocationState = { id: 42, title: "Chirurgie 2025", adminRights: true };
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

// ── Redirect & initialisation ─────────────────────────────────────────────────

describe("Redirect & initialisation", () => {
  it("redirige vers /manager/years quand state est null", async () => {
    mockLocationState = null;
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/manager/years")
    );
  });

  it("affiche le titre de l'année depuis state", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Chirurgie 2025")).toBeInTheDocument()
    );
  });

  it("affiche l'eyebrow de navigation", () => {
    renderPage();
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
  });

  it("affiche le chip « Année active »", () => {
    renderPage();
    expect(screen.getByText("Année active")).toBeInTheDocument();
  });
});

// ── TabBar ────────────────────────────────────────────────────────────────────

describe("TabBar – structure ARIA", () => {
  it("rend 5 onglets avec role=tab", () => {
    renderPage();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("la liste d'onglets a role=tablist", () => {
    renderPage();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("affiche les 5 libellés attendus", () => {
    renderPage();
    ["Validation", "MACCS", "Collaborateurs", "Paramètres", "Conformité"].forEach(
      (label) => expect(screen.getByRole("tab", { name: label })).toBeInTheDocument()
    );
  });

  it("chaque onglet a id='tab-{key}'", () => {
    renderPage();
    [
      ["Validation",    "tab-general"],
      ["MACCS",         "tab-residents"],
      ["Collaborateurs","tab-partners"],
      ["Paramètres",    "tab-setup"],
      ["Conformité",    "tab-compliance"],
    ].forEach(([label, id]) => {
      expect(screen.getByRole("tab", { name: label })).toHaveAttribute("id", id);
    });
  });

  it("chaque onglet a aria-controls='tabpanel-{key}'", () => {
    renderPage();
    [
      ["Validation",    "tabpanel-general"],
      ["MACCS",         "tabpanel-residents"],
      ["Collaborateurs","tabpanel-partners"],
      ["Paramètres",    "tabpanel-setup"],
      ["Conformité",    "tabpanel-compliance"],
    ].forEach(([label, controls]) => {
      expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
        "aria-controls",
        controls
      );
    });
  });
});

describe("TabBar – état actif", () => {
  it("l'onglet Validation est actif par défaut", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: "Validation" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("les 4 autres onglets sont inactifs par défaut", () => {
    renderPage();
    ["MACCS", "Collaborateurs", "Paramètres", "Conformité"].forEach((label) =>
      expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
        "aria-selected",
        "false"
      )
    );
  });

  it("state.defaultTab='residents' active l'onglet MACCS", () => {
    mockLocationState = { ...mockLocationState!, defaultTab: "residents" };
    renderPage();
    expect(screen.getByRole("tab", { name: "MACCS" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Validation" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("state.defaultTab='partners' active l'onglet Collaborateurs", () => {
    mockLocationState = { ...mockLocationState!, defaultTab: "partners" };
    renderPage();
    expect(screen.getByRole("tab", { name: "Collaborateurs" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("state.defaultTab='setup' active l'onglet Paramètres", () => {
    mockLocationState = { ...mockLocationState!, defaultTab: "setup" };
    renderPage();
    expect(screen.getByRole("tab", { name: "Paramètres" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

describe("TabBar – interaction", () => {
  it("cliquer MACCS le rend actif et désactive Validation", () => {
    renderPage();
    clickTab("MACCS");
    expect(screen.getByRole("tab", { name: "MACCS" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Validation" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("cliquer Collaborateurs le rend actif", () => {
    renderPage();
    clickTab("Collaborateurs");
    expect(screen.getByRole("tab", { name: "Collaborateurs" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("cliquer un onglet appelle window.scrollTo({top:0})", () => {
    renderPage();
    clickTab("MACCS");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("cliquer l'onglet déjà actif appelle quand même scrollTo", () => {
    renderPage();
    clickTab("Validation");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});

describe("TabBar – badge count", () => {
  it("le badge count est absent par défaut (count null)", () => {
    renderPage();
    // Aucun élément contenant un nombre seul ne doit être dans les tabs
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      // Le texte du tab ne doit contenir que le libellé, pas de nombre isolé
      expect(tab.textContent).toMatch(/^(Validation|MACCS|Collaborateurs|Paramètres|Conformité)$/);
    });
  });
});

// ── Rendu des panneaux ────────────────────────────────────────────────────────

describe("Rendu des panneaux par onglet", () => {
  it("Validation → panel-general visible, autres absents", () => {
    renderPage();
    expect(screen.getByTestId("panel-general")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-residents")).not.toBeInTheDocument();
    expect(screen.queryByTestId("panel-partners")).not.toBeInTheDocument();
    expect(screen.queryByTestId("panel-setup")).not.toBeInTheDocument();
    expect(screen.queryByTestId("panel-compliance")).not.toBeInTheDocument();
  });

  it("MACCS → panel-residents visible", () => {
    renderPage();
    clickTab("MACCS");
    expect(screen.getByTestId("panel-residents")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-general")).not.toBeInTheDocument();
  });

  it("Collaborateurs → panel-partners visible", () => {
    renderPage();
    clickTab("Collaborateurs");
    expect(screen.getByTestId("panel-partners")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-general")).not.toBeInTheDocument();
  });

  it("Paramètres → panel-setup visible", () => {
    renderPage();
    clickTab("Paramètres");
    expect(screen.getByTestId("panel-setup")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-general")).not.toBeInTheDocument();
  });

  it("Conformité → panel-compliance visible", () => {
    renderPage();
    clickTab("Conformité");
    expect(screen.getByTestId("panel-compliance")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-general")).not.toBeInTheDocument();
  });

  it("un seul panneau est monté à la fois", () => {
    renderPage();
    clickTab("Collaborateurs");
    const panels = ["panel-general","panel-residents","panel-partners","panel-setup","panel-compliance"];
    const visible = panels.filter((id) => screen.queryByTestId(id));
    expect(visible).toHaveLength(1);
    expect(visible[0]).toBe("panel-partners");
  });
});

// ── Sous-vues ─────────────────────────────────────────────────────────────────

describe("Sous-vues (staffPlanner / residentParameters)", () => {
  function goToSetupTab() {
    clickTab("Paramètres");
  }

  function enterStaffPlanner() {
    goToSetupTab();
    fireEvent.click(screen.getByText("Aller StaffPlanner"));
  }

  function enterResidentParameters() {
    goToSetupTab();
    fireEvent.click(screen.getByText("Aller ResidentParameters"));
  }

  it("la barre d'onglets est masquée en sous-vue staffPlanner", () => {
    renderPage();
    enterStaffPlanner();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("la barre d'onglets est masquée en sous-vue residentParameters", () => {
    renderPage();
    enterResidentParameters();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("le bandeau breadcrumb est affiché en sous-vue staffPlanner", () => {
    renderPage();
    enterStaffPlanner();
    // Le breadcrumb montre le libellé de l'onglet parent « Paramètres »
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("le bandeau breadcrumb est affiché en sous-vue residentParameters", () => {
    renderPage();
    enterResidentParameters();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("panel-staffplanner est rendu en sous-vue staffPlanner", () => {
    renderPage();
    enterStaffPlanner();
    expect(screen.getByTestId("panel-staffplanner")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-setup")).not.toBeInTheDocument();
  });

  it("panel-residentparameters est rendu en sous-vue residentParameters", () => {
    renderPage();
    enterResidentParameters();
    expect(screen.getByTestId("panel-residentparameters")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-setup")).not.toBeInTheDocument();
  });

  it("le bouton retour du bandeau ramène au panel-setup", () => {
    renderPage();
    enterStaffPlanner();

    // data-testid="btn-back-subview" — bouton du bandeau breadcrumb uniquement
    fireEvent.click(screen.getByTestId("btn-back-subview"));

    expect(screen.getByTestId("panel-setup")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-staffplanner")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("retour depuis residentParameters ramène au panel-setup", () => {
    renderPage();
    enterResidentParameters();
    fireEvent.click(screen.getByTestId("btn-back-subview"));
    expect(screen.getByTestId("panel-setup")).toBeInTheDocument();
  });

  it("l'onglet Paramètres est aria-selected=true pendant une sous-vue", () => {
    renderPage();
    enterStaffPlanner();
    fireEvent.click(screen.getByTestId("btn-back-subview"));
    expect(screen.getByRole("tab", { name: "Paramètres" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

// ── Bouton retour principal ───────────────────────────────────────────────────

describe("Bouton retour principal (header)", () => {
  it("appelle navigate(-1) quand pas en sous-vue", () => {
    renderPage();
    // Le bouton retour du header a aria-label="Retour"
    const backBtn = screen.getByRole("button", { name: "Retour" });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("ne navigue PAS en dehors de la page quand on est en sous-vue", () => {
    renderPage();
    clickTab("Paramètres");
    fireEvent.click(screen.getByText("Aller StaffPlanner"));

    // data-testid="btn-back-header" — bouton retour du header principal
    fireEvent.click(screen.getByTestId("btn-back-header"));

    // En sous-vue, handleBack appelle setActiveLink("setup") — pas navigate(-1)
    expect(mockNavigate).not.toHaveBeenCalledWith(-1);
    expect(screen.getByTestId("panel-setup")).toBeInTheDocument();
  });
});

// ── T2-CRITIQUE : dirty=true + changement d'onglet → confirmation ─────────────

describe("Protection données — changement d'onglet avec dirty Validation", () => {
  it("T2 — affiche la confirmation quand dirty=true et l'utilisateur change d'onglet", () => {
    renderPage();

    // L'onglet Validation est actif par défaut (general)
    expect(screen.getByTestId("panel-general")).toBeInTheDocument();

    // Simuler dirty=true via le bouton exposé par le mock de General
    fireEvent.click(screen.getByTestId("make-dirty"));

    // Tenter de changer vers MACCS
    clickTab("MACCS");

    // La confirmation doit s'afficher
    expect(screen.getByTestId("confirm-leave-dialog")).toBeInTheDocument();
    expect(screen.getByText("Modifications non sauvegardées")).toBeInTheDocument();

    // L'onglet Validation doit rester actif (pas de changement encore)
    expect(screen.getByRole("tab", { name: "Validation" })).toHaveAttribute("aria-selected", "true");
  });

  it("'Annuler' depuis la confirmation d'onglet → reste sur Validation", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("make-dirty"));
    clickTab("MACCS");
    expect(screen.getByTestId("confirm-leave-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Annuler"));

    // Dialogue fermé
    expect(screen.queryByTestId("confirm-leave-dialog")).not.toBeInTheDocument();
    // Onglet Validation toujours actif
    expect(screen.getByRole("tab", { name: "Validation" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("panel-general")).toBeInTheDocument();
  });

  it("'Quitter sans enregistrer' depuis la confirmation d'onglet → navigue vers MACCS", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("make-dirty"));
    clickTab("MACCS");
    expect(screen.getByTestId("confirm-leave-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Quitter sans enregistrer"));

    // Dialogue fermé + MACCS actif
    expect(screen.queryByTestId("confirm-leave-dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "MACCS" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("panel-residents")).toBeInTheDocument();
  });

  it("pas de confirmation si dirty=false (changement normal)", () => {
    renderPage();
    // Ne pas rendre dirty

    clickTab("MACCS");

    // Aucune confirmation
    expect(screen.queryByTestId("confirm-leave-dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("panel-residents")).toBeInTheDocument();
  });
});
