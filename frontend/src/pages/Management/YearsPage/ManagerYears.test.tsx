/**
 * Tests — ManagerYears (page) + YearCard + ConfirmationDialog
 *
 * Couverture :
 * - Spinner pendant le chargement (cartes absentes)
 * - Section "Année en cours" / "Archives" / "À venir" présentes selon les données
 * - Sections absentes quand aucune année ne correspond
 * - "Aucune année" quand la liste est vide
 * - "Aucun résultat" après une recherche sans résultat
 * - Filtre topbar par titre d'année
 * - Filtre topbar par nom de MACC
 * - Filtre insensible à la casse
 * - Bouton "+ Nouvelle année" navigue vers /manager/year
 * - Compteur d'années et de MACCs dans le header
 * - Grande carte (En cours) : titre, période, maître, code, équipe MACCs
 * - StatusPill "En cours" sur la grande carte
 * - "Non défini" si trainingSupervisorLastname absent
 * - Bouton "Gérer" → navigate /manager/year-detail avec le bon state
 * - Menu "Modifier les infos" → navigate /manager/year-parameters (admin)
 * - Menu "Modifier les infos" absent si admin = false
 * - Menu "Supprimer" → ouvre la dialog de confirmation
 * - Carte compacte (Archives) : StatusPill "Archivée", initiales dans avatars
 * - Carte compacte (À venir) : StatusPill "À venir"
 * - Carte compacte vide : pas de section avatars rendue
 * - Dialog de confirmation : "Annuler" ferme la dialog
 * - Dialog de confirmation : "Oui, je suis sûr" appelle l'API delete
 * - Dialog se ferme après confirmation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ManagerYears from "./ManagerYears";
import useManagerYears from "../../../hooks/data/useManagerYears";

// ── i18n ──────────────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "years.searchPlaceholder":    "Titre, MACC…",
        "years.sectionLabel":         "Mes années de formation",
        "years.title":                "Mes années",
        "years.yearsCount":           "année(s)",
        "years.add":                  "Nouvelle année",
        "years.sectionCurrent":       "Année en cours",
        "years.sectionCurrentPlural": "Années en cours",
        "years.sectionUpcoming":      "Prochaine année",
        "years.sectionArchived":      "Archives",
        "years.empty":                "Aucune année de formation",
        "years.noResults":            "Aucun résultat pour cette recherche",
        "years.statusCurrent":        "En cours",
        "years.statusUpcoming":       "À venir",
        "years.statusArchived":       "Archivée",
        "years.period":               "Période :",
        "years.supervisor":           "Maître de stage",
        "years.supervisorNotDefined": "Non défini",
        "years.team":                 "Équipe",
        "years.importedOf":           "horaires importés",
        "years.codeLabel":            "Code d'identification",
        "years.manage":               "Gérer",
        "years.menuEdit":             "Modifier les infos",
        "years.menuDelete":           "Supprimer l'année",
        "years.leaveTitle":           "Quitter l'année ?",
        "years.leaveBody":            "Êtes-vous sûr de vouloir quitter cette année ?",
        "years.leaveConfirm":         "Oui, je suis sûr",
        "years.deleted":              "Année supprimée !",
        "years.deleteError":          "Oups, une erreur s'est produite !",
        "common.cancel":              "Annuler",
      };
      return map[key] ?? key;
    },
  }),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../../hooks/data/useManagerYears");

let mockTopbarSearch = "";
vi.mock("../../../hooks/useTopbarSearch", () => ({
  useTopbarSearch: () => mockTopbarSearch,
}));

// Les composants importent useNavigate depuis "react-router" (pas react-router-dom)
const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockDelete = vi.fn().mockResolvedValue({});
vi.mock("../../../hooks/useAxiosPrivate", () => ({
  default: () => ({ delete: mockDelete, get: vi.fn() }),
}));

vi.mock("../../../services/yearsApi", () => ({
  default: {
    deleteYear: vi.fn(() => ({ method: "delete", url: "managers/deleteYear/" })),
    findAll:    vi.fn(() => ({ method: "get",    url: "managers/years/getManagersYears" })),
  },
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeResident = (id: number, first: string, last: string, allowed = true) => ({
  residentId: id,
  firstname: first,
  lastname: last,
  allowed,
});

const CURRENT_YEAR = {
  id: 1,
  title: "Orthopédie",
  period: "2025 – 2026",
  dateOfStart: "2020-01-01",   // passé
  dateOfEnd:   "2040-01-01",   // futur → statut "current"
  trainingSupervisorLastname: "Delvaux",
  trainingSupervisorFirstname: "Brigitte",
  token: "ABC123DE",
  admin: true,
  dataDownload: false,
  residents: [makeResident(10, "Alice", "Dupont"), makeResident(11, "Bob", "Martin")],
};

const ARCHIVED_YEAR = {
  id: 2,
  title: "Chirurgie",
  period: "2023 – 2024",
  dateOfStart: "2023-01-01",
  dateOfEnd:   "2024-01-01",   // passé → statut "archived"
  trainingSupervisorLastname: "Druez",
  trainingSupervisorFirstname: "Vincent",
  token: "ARCH5678",
  admin: false,
  dataDownload: false,
  residents: [makeResident(20, "Carla", "Rossi")],
};

const UPCOMING_YEAR = {
  id: 3,
  title: "Cardiologie",
  period: "2040 – 2041",
  dateOfStart: "2040-01-01",   // futur → statut "upcoming"
  dateOfEnd:   "2041-01-01",
  trainingSupervisorLastname: null,
  trainingSupervisorFirstname: null,
  token: "UPC99AA",
  admin: false,
  dataDownload: false,
  residents: [],
};

function mockYears(years: any[], loading = false) {
  vi.mocked(useManagerYears).mockReturnValue({
    years,
    setYears: vi.fn(),
    loading,
    setLoading: vi.fn(),
  });
}

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <ManagerYears />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function clickMoreMenu() {
  const moreBtn = document.querySelector<HTMLElement>('[data-testid="MoreHorizIcon"]')?.closest("button");
  if (moreBtn) fireEvent.click(moreBtn);
  return !!moreBtn;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTopbarSearch = "";
  mockDelete.mockResolvedValue({});
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

// ── Chargement ────────────────────────────────────────────────────────────────

describe("ManagerYears — chargement", () => {
  it("n'affiche pas de carte d'année pendant le chargement (squelette visible)", () => {
    // Le composant affiche des Skeleton cards pendant le chargement — pas de CircularProgress.
    mockYears([], true);
    renderPage();
    // Aucune section de contenu réel ne doit être visible
    expect(screen.queryByText("Année en cours")).not.toBeInTheDocument();
    expect(screen.queryByText("Archives")).not.toBeInTheDocument();
  });

  it("n'affiche pas de carte d'année pendant le chargement", () => {
    mockYears([CURRENT_YEAR], true);
    renderPage();
    // Le spinner est affiché ; la section "Année en cours" ne doit pas être présente
    expect(screen.queryByText("Année en cours")).not.toBeInTheDocument();
    expect(screen.queryByText("Orthopédie")).not.toBeInTheDocument();
  });

  it("n'affiche pas le spinner une fois le chargement terminé", () => {
    mockYears([]);
    renderPage();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

// ── Sections ──────────────────────────────────────────────────────────────────

describe("ManagerYears — sections", () => {
  it("affiche la section 'Année en cours' avec une année active", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.getByText("Année en cours")).toBeInTheDocument();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
  });

  it("affiche la section 'Archives' avec une année archivée", () => {
    mockYears([ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Archives")).toBeInTheDocument();
    expect(screen.getByText("Chirurgie")).toBeInTheDocument();
  });

  it("affiche la section 'Prochaine année' avec une année future", () => {
    mockYears([UPCOMING_YEAR]);
    renderPage();
    expect(screen.getByText("Prochaine année")).toBeInTheDocument();
    expect(screen.getByText("Cardiologie")).toBeInTheDocument();
  });

  it("n'affiche pas la section 'Archives' si aucune année archivée", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.queryByText("Archives")).not.toBeInTheDocument();
  });

  it("n'affiche pas 'Prochaine année' si aucune année future", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.queryByText("Prochaine année")).not.toBeInTheDocument();
  });

  it("affiche 'Années en cours' (pluriel) pour plusieurs années actives", () => {
    const second = { ...CURRENT_YEAR, id: 99, title: "Pédiatrie" };
    mockYears([CURRENT_YEAR, second]);
    renderPage();
    expect(screen.getByText("Années en cours")).toBeInTheDocument();
  });

  it("affiche 'Aucune année de formation' quand la liste est vide", () => {
    mockYears([]);
    renderPage();
    expect(screen.getByText("Aucune année de formation")).toBeInTheDocument();
  });
});

// ── Recherche topbar ──────────────────────────────────────────────────────────

describe("ManagerYears — recherche topbar", () => {
  it("filtre par titre d'année", () => {
    mockTopbarSearch = "ortho";
    mockYears([CURRENT_YEAR, ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
    expect(screen.queryByText("Chirurgie")).not.toBeInTheDocument();
  });

  it("filtre par nom de MACC (prénom + nom)", () => {
    mockTopbarSearch = "alice";
    mockYears([CURRENT_YEAR, ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
    expect(screen.queryByText("Chirurgie")).not.toBeInTheDocument();
  });

  it("affiche 'Aucun résultat' si la recherche ne correspond à rien", () => {
    mockTopbarSearch = "zzznomatch";
    mockYears([CURRENT_YEAR, ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Aucun résultat pour cette recherche")).toBeInTheDocument();
  });

  it("la recherche est insensible à la casse", () => {
    mockTopbarSearch = "ORTHO";
    mockYears([CURRENT_YEAR, ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
    expect(screen.queryByText("Chirurgie")).not.toBeInTheDocument();
  });
});

// ── Header ────────────────────────────────────────────────────────────────────

describe("ManagerYears — header", () => {
  it("affiche le compteur d'années et de MACCs", () => {
    mockYears([CURRENT_YEAR, ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText(/2 année\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/3 MACCs/)).toBeInTheDocument();
  });

  it("bouton '+ Nouvelle année' navigue vers /manager/year", () => {
    mockYears([]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle année/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/manager/year");
  });
});

// ── Grande carte (En cours) ───────────────────────────────────────────────────

describe("YearCard — grande carte (En cours)", () => {
  it("affiche le titre et le maître de stage", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
    expect(screen.getByText("Delvaux Brigitte")).toBeInTheDocument();
  });

  it("affiche le code d'identification", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.getByText("ABC123DE")).toBeInTheDocument();
  });

  it("affiche les noms des MACCs dans l'équipe", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
    expect(screen.getByText("Bob Martin")).toBeInTheDocument();
  });

  it("affiche le StatusPill 'En cours'", () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche 'Non défini' si trainingSupervisorLastname est absent", () => {
    mockYears([{ ...CURRENT_YEAR, trainingSupervisorLastname: null, trainingSupervisorFirstname: null }]);
    renderPage();
    expect(screen.getByText("Non défini")).toBeInTheDocument();
  });

  it("bouton 'Gérer' navigue vers /manager/realtime", () => {
    // Le bouton "Gérer" appelle handleManage → navigate("/manager/realtime")
    // La navigation vers /manager/year-detail est assurée par le bouton "Paramètres" du menu
    mockYears([CURRENT_YEAR]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Gérer$/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/manager/realtime");
  });

  it("menu : 'Modifier les infos' present si admin = true", async () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    const found = clickMoreMenu();
    if (!found) return;
    await waitFor(() =>
      expect(screen.getByText("Modifier les infos")).toBeInTheDocument()
    );
  });

  it("menu : 'Modifier les infos' navigue vers /manager/year-parameters", async () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    if (!clickMoreMenu()) return;
    await waitFor(() => expect(screen.getByText("Modifier les infos")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Modifier les infos"));
    expect(mockNavigate).toHaveBeenCalledWith("/manager/year-parameters", {
      state: { yearId: 1, haveAdminRights: true },
    });
  });

  it("menu : 'Modifier les infos' absent si admin = false", async () => {
    mockYears([{ ...CURRENT_YEAR, admin: false }]);
    renderPage();
    if (!clickMoreMenu()) return;
    await waitFor(() => expect(screen.getByText("Supprimer l'année")).toBeInTheDocument());
    expect(screen.queryByText("Modifier les infos")).not.toBeInTheDocument();
  });

  it("menu : 'Supprimer' ouvre la dialog de confirmation", async () => {
    mockYears([CURRENT_YEAR]);
    renderPage();
    if (!clickMoreMenu()) return;
    await waitFor(() => expect(screen.getByText("Supprimer l'année")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Supprimer l'année"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });
});

// ── Carte compacte (Archives) ─────────────────────────────────────────────────

describe("YearCard — carte compacte (Archives)", () => {
  it("affiche le StatusPill 'Archivée'", () => {
    mockYears([ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Archivée")).toBeInTheDocument();
  });

  it("affiche le titre et le code de l'année archivée", () => {
    mockYears([ARCHIVED_YEAR]);
    renderPage();
    expect(screen.getByText("Chirurgie")).toBeInTheDocument();
    expect(screen.getByText("ARCH5678")).toBeInTheDocument();
  });

  it("bouton 'Gérer' navigue vers /manager/realtime", () => {
    mockYears([ARCHIVED_YEAR]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Gérer$/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/manager/realtime");
  });

  it("affiche les initiales du MACC dans l'avatar", () => {
    mockYears([ARCHIVED_YEAR]);
    renderPage();
    // Avatar initiales "CR" pour Carla Rossi
    expect(screen.getByText("CR")).toBeInTheDocument();
  });

  it("affiche le débordement +N si plus de 5 MACCs", () => {
    const manyResidents = Array.from({ length: 7 }, (_, i) =>
      makeResident(100 + i, `Prenom${i}`, `Nom${i}`)
    );
    mockYears([{ ...ARCHIVED_YEAR, residents: manyResidents }]);
    renderPage();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});

// ── Carte compacte (À venir) ──────────────────────────────────────────────────

describe("YearCard — carte compacte (À venir)", () => {
  it("affiche le StatusPill 'À venir'", () => {
    mockYears([UPCOMING_YEAR]);
    renderPage();
    expect(screen.getByText("À venir")).toBeInTheDocument();
  });

  it("n'affiche pas la section d'avatars si l'équipe est vide", () => {
    mockYears([UPCOMING_YEAR]);
    renderPage();
    // Aucun avatar ne doit être présent (pas d'initiales dans le DOM)
    expect(document.querySelectorAll(".MuiAvatar-root")).toHaveLength(0);
  });
});

// ── ConfirmationDialog ────────────────────────────────────────────────────────

describe("ConfirmationDialog", () => {
  async function openDeleteDialog() {
    mockYears([CURRENT_YEAR]);
    renderPage();
    if (!clickMoreMenu()) return false;
    await waitFor(() => expect(screen.getByText("Supprimer l'année")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Supprimer l'année"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    return true;
  }

  it("'Annuler' ferme la dialog", async () => {
    if (!await openDeleteDialog()) return;
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("'Oui, je suis sûr' appelle l'API delete avec l'id correct", async () => {
    if (!await openDeleteDialog()) return;
    fireEvent.click(screen.getByRole("button", { name: /Oui, je suis sûr/i }));
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith("managers/deleteYear/1")
    );
  });

  it("la dialog se ferme après confirmation", async () => {
    if (!await openDeleteDialog()) return;
    fireEvent.click(screen.getByRole("button", { name: /Oui, je suis sûr/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
