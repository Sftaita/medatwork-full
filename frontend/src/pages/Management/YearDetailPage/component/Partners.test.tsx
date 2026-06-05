/**
 * Tests — onglet Collaborateurs (Partners.tsx) · CollabCard UX
 *
 * Règles testées :
 *   isSelf=true  → aucun bouton "Droits" rendu
 *   isSelf=true  → aucun bouton "Supprimer" rendu
 *   isSelf=false → boutons "Droits" et "Supprimer" visibles
 *   isSelf=false + locked=true → "Supprimer" visible mais désactivé
 *   badge "Vous" toujours affiché quand isSelf=true
 *
 * Identification :
 *   item.managerId === currentManagerId — jamais par nom ou email
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../../doc/CustomizedTheme";
import Partners from "./Partners";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGet = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet, post: vi.fn(), put: vi.fn() }));

vi.mock("../../../../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../../services/apiError", () => ({ handleApiError: vi.fn() }));

// Identifiant du manager connecté — 42 dans tous les tests
vi.mock("../../../../hooks/useAuth", () => ({
  default: () => ({
    authentication: { managerId: 42, firstname: "Alice", lastname: "Dupont" },
  }),
}));

vi.mock("./SearchDialog", () => ({
  default: ({
    list,
    handleListItemClick,
  }: {
    list?: Array<{ id: number }>;
    handleListItemClick?: (id: number) => void;
  }) => (
    <>
      {list?.map((m) => (
        <div key={m.id} data-testid={`search-item-${m.id}`} />
      ))}
      <button data-testid="add-trigger" onClick={() => handleListItemClick?.(99)}>
        trigger-add
      </button>
    </>
  ),
}));

vi.mock("../../../../components/small/UserAvatar", () => ({
  default: ({ firstname, lastname }: { firstname: string; lastname: string }) => (
    <div data-testid="user-avatar">{firstname[0]}{lastname[0]}</div>
  ),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const BASE_MANAGER = {
  id: 1,
  firstname: "Brigitte",
  lastname: "Delvaux",
  job: "medical supervisor",
  managerId: 11,   // ← pas le manager connecté (42)
  admin: true,
  dataAccess: true,
  dataValidation: true,
  dataDownload: false,
  hasAgendaAccess: false,
  canManageAgenda: false,
  avatarPath: null,
};

const SELF_MANAGER = {
  ...BASE_MANAGER,
  id: 2,
  firstname: "Alice",
  lastname: "Dupont",
  managerId: 42,   // ← c'est le manager connecté
};

function setupManagers(managers: typeof BASE_MANAGER[]) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("getYearManagers"))      return Promise.resolve({ data: managers });
    if (url.includes("hospital-managers"))    return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected: ${url}`));
  });
}

function renderPartners(adminRights = true) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <Partners id={10} adminRights={adminRights} />
    </ThemeProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CollabCard — isSelf=true (manager connecté)", () => {

  it("1 — aucun bouton 'Droits' rendu pour sa propre ligne", async () => {
    setupManagers([SELF_MANAGER]);
    renderPartners();

    // Le composant affiche "lastname firstname"
    await waitFor(() =>
      expect(screen.getByText("Dupont Alice")).toBeInTheDocument()
    );
    // Le bouton "Droits" ne doit pas être dans le DOM
    expect(screen.queryByText("Droits")).not.toBeInTheDocument();
  });

  it("2 — aucun bouton 'Supprimer' rendu pour sa propre ligne", async () => {
    setupManagers([SELF_MANAGER]);
    renderPartners();

    await waitFor(() =>
      expect(screen.getByText("Dupont Alice")).toBeInTheDocument()
    );
    expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
  });

  it("5 — badge 'Vous' affiché pour le manager connecté", async () => {
    setupManagers([SELF_MANAGER]);
    renderPartners();

    await waitFor(() =>
      expect(screen.getByText("Vous")).toBeInTheDocument()
    );
  });

  it("badge 'Vous' absent pour les autres collaborateurs", async () => {
    setupManagers([BASE_MANAGER]); // managerId=11, pas 42
    renderPartners();

    // Affichage : "lastname firstname"
    await waitFor(() =>
      expect(screen.getByText("Delvaux Brigitte")).toBeInTheDocument()
    );
    expect(screen.queryByText("Vous")).not.toBeInTheDocument();
  });
});

describe("CollabCard — isSelf=false (autre collaborateur)", () => {

  it("3 — boutons 'Droits' et 'Supprimer' visibles pour un autre collaborateur", async () => {
    setupManagers([BASE_MANAGER]);
    renderPartners();

    await waitFor(() =>
      expect(screen.getByText("Delvaux Brigitte")).toBeInTheDocument()
    );
    expect(screen.getByText("Droits")).toBeInTheDocument();
    expect(screen.getByText("Supprimer")).toBeInTheDocument();
  });

  it("4 — isSelf=false + locked=true → 'Supprimer' visible mais désactivé", async () => {
    // locked = index === 0, donc on met BASE_MANAGER en premier
    setupManagers([BASE_MANAGER]);
    renderPartners();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Supprimer/i })).toBeInTheDocument()
    );
    // Index 0 → locked → disabled
    expect(screen.getByRole("button", { name: /Supprimer/i })).toBeDisabled();
    // "Droits" reste actif
    expect(screen.getByRole("button", { name: /Droits/i })).not.toBeDisabled();
  });
});

describe("CollabCard — identification par managerId uniquement", () => {

  it("un collaborateur avec le même nom mais managerId différent n'a PAS isSelf", async () => {
    // Même prénom/nom que le connecté, mais managerId différent
    const HOMONYM = {
      ...BASE_MANAGER,
      firstname: "Alice",
      lastname: "Dupont",
      managerId: 99,  // ← différent de 42
    };
    setupManagers([HOMONYM]);
    renderPartners();

    // Affichage : "lastname firstname"
    await waitFor(() =>
      expect(screen.getByText("Dupont Alice")).toBeInTheDocument()
    );
    // Pas de badge "Vous" — identification par managerId, pas par nom
    expect(screen.queryByText("Vous")).not.toBeInTheDocument();
    // Les boutons d'action sont bien présents (ce n'est pas soi-même)
    expect(screen.getByText("Droits")).toBeInTheDocument();
  });
});

describe("CollabCard — liste mixte (soi + autres)", () => {

  it("soi : aucun bouton ; autre collaborateur : boutons présents", async () => {
    setupManagers([BASE_MANAGER, SELF_MANAGER]);
    renderPartners();

    // Les deux noms doivent apparaître (format lastname firstname)
    await waitFor(() =>
      expect(screen.getByText("Delvaux Brigitte")).toBeInTheDocument()
    );
    expect(screen.getByText("Dupont Alice")).toBeInTheDocument();

    // "Droits" et "Supprimer" viennent uniquement de BASE_MANAGER (isSelf=false)
    expect(screen.getAllByText("Droits")).toHaveLength(1);
    expect(screen.getAllByText("Supprimer")).toHaveLength(1);

    // Badge "Vous" pour SELF_MANAGER seulement
    expect(screen.getAllByText("Vous")).toHaveLength(1);
  });
});

// ── SearchDialog — exclusion de soi-même ─────────────────────────────────────

describe("SearchDialog — liste de candidats", () => {

  it("n'inclut pas le manager connecté (managerId=42) dans la liste de recherche", async () => {
    // hospital-managers retourne 2 entries : id=42 (soi-même) et id=55 (autre)
    mockGet.mockImplementation((url: string) => {
      if (url.includes("getYearManagers"))   return Promise.resolve({ data: [] });
      if (url.includes("hospital-managers")) return Promise.resolve({
        data: [
          { id: 42, firstname: "Alice", lastname: "Dupont", job: null, sexe: "female" },
          { id: 55, firstname: "Bob",   lastname: "Martin", job: null, sexe: "male" },
        ],
      });
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    renderPartners();

    await waitFor(() => screen.getByTestId("add-trigger"));

    // Le manager connecté (id=42) est exclu de la liste
    expect(screen.queryByTestId("search-item-42")).not.toBeInTheDocument();
    // Les autres managers apparaissent bien
    expect(screen.getByTestId("search-item-55")).toBeInTheDocument();
  });
});

// ── Payload API ───────────────────────────────────────────────────────────────

describe("handleAddManager — payload envoyé à l'API", () => {

  it("envoie les 8 champs requis avec des valeurs conservatrices", async () => {
    setupManagers([]);

    renderPartners();

    // Le SearchDialog mock rend un bouton qui appelle handleListItemClick(99).
    // On attend qu'il soit dans le DOM (le composant affiche un spinner pendant le fetch initial).
    const trigger = await screen.findByTestId("add-trigger");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(stableAxios.post).toHaveBeenCalledWith(
        "managers/years/addManager",
        {
          year:           10,   // id passé à <Partners id={10} />
          guest:          99,   // id simulé par le mock SearchDialog
          dataAccess:     false,
          dataValidation: false,
          dataDownload:   false,
          admin:          false,
          agenda:         false,
          schedule:       false,
        }
      );
    });
  });
});
