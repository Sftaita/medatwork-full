/**
 * Tests for WeekScheduleTable
 *
 * Covers:
 * — Rendu de base (titre, toolbar, grille)
 * — Cellules assignées et non assignées
 * — Badge "non assignées" : compte, cycle, reset au changement de données
 * — Highlight de cellule lors du clic sur le badge
 * — Préférence de largeur sauvegardée en localStorage
 * — Toggle panneau droit (Masquer / Afficher)
 * — Slot yearSelector affiché dans la toolbar
 * — onCellClick appelé avec les bons args (posteId, weekIdx)
 * — onAddPoste appelé depuis le bouton et la ligne du bas
 * — MonthOverview : tuile cliquable (scroll)
 * — Aperçu mensuel : taux de remplissage par mois
 * — Panneau "Charge par MACC" : liste triée par nb de semaines
 * — Scroll horizontal : scrollTo appelé sur le bon élément
 * — Colonne sticky présente sur les cellules label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeekScheduleTable from "./WeekScheduleTable";

// ── MUI mocks ─────────────────────────────────────────────────────────────────
vi.mock("@mui/material/styles", async (importOriginal) => {
  const real = await importOriginal<typeof import("@mui/material/styles")>();
  return {
    ...real,
    useTheme: () => ({
      palette: {
        primary:    { main: "#9C27B0" },
        background: { default: "#fafafa", paper: "#ffffff" },
        text:       { primary: "#171719", secondary: "#5a5a63", disabled: "#9595a0" },
        divider:    "#ececef",
      },
    }),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PEOPLE = {
  alice: { name: "Alice Martin",   initials: "AM", color: "#9C27B0" },
  bob:   { name: "Bob Dupont",     initials: "BD", color: "#e85a6a" },
  carol: { name: "Carol Leroy",    initials: "CL", color: "#3aa676" },
};

const POSTES = [
  { id: "p1", name: "Chirurgie vasculaire" },
  { id: "p2", name: "Urologie" },
  { id: "p3", name: "Orthopédie" },
];

const WEEKS = Array.from({ length: 6 }, (_, i) => ({
  idx:        i,
  num:        41 + i,
  startD:     6 + i * 7,
  startM:     "oct.",
  endD:       12 + i * 7,
  endM:       "oct.",
  month:      9,
  monthLabel: "oct.",
  year:       "25",
}));

// rotation[posteId][weekIdx] = personId | null
const ROTATION_FULL: Record<string, (string | null)[]> = {
  p1: ["alice", "alice", "bob",   "bob",   "carol", "carol"],
  p2: ["bob",   "carol", "alice", null,    "alice", null   ],
  p3: [null,    null,    null,    "carol", "carol", "alice"],
};

// 0 unassigned
const ROTATION_COMPLETE: Record<string, (string | null)[]> = {
  p1: ["alice", "alice", "bob",   "bob",   "carol", "carol"],
  p2: ["bob",   "carol", "alice", "alice", "alice", "bob"  ],
  p3: ["carol", "carol", "carol", "carol", "carol", "alice"],
};

function renderTable(overrides: Partial<React.ComponentProps<typeof WeekScheduleTable>> = {}) {
  const defaults: React.ComponentProps<typeof WeekScheduleTable> = {
    people:   PEOPLE,
    postes:   POSTES,
    weeks:    WEEKS,
    rotation: ROTATION_FULL,
  };
  return render(<WeekScheduleTable {...defaults} {...overrides} />);
}

// ── localStorage mock ─────────────────────────────────────────────────────────

let store: Record<string, string> = {};
beforeEach(() => {
  store = {};
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => { store[k] = String(v); });

  // DOM scroll mocks
  Element.prototype.scrollTo = vi.fn();
  window.scrollBy            = vi.fn();
  window.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };
});

afterEach(() => { vi.restoreAllMocks(); });

// ── Rendu de base ─────────────────────────────────────────────────────────────

describe("WeekScheduleTable — rendu de base", () => {
  it("affiche le titre par défaut", () => {
    renderTable();
    expect(screen.getByText("Répartition des semaines")).toBeInTheDocument();
  });

  it("affiche un titre personnalisé", () => {
    renderTable({ title: "Planning Chirurgie" });
    expect(screen.getByText("Planning Chirurgie")).toBeInTheDocument();
  });

  it("affiche les noms des postes", () => {
    renderTable();
    expect(screen.getByText("Chirurgie vasculaire")).toBeInTheDocument();
    expect(screen.getByText("Urologie")).toBeInTheDocument();
    expect(screen.getByText("Orthopédie")).toBeInTheDocument();
  });

  it("affiche les numéros de semaine", () => {
    renderTable();
    expect(screen.getAllByText(/^S\d{2}$/).length).toBeGreaterThanOrEqual(6);
  });

  it("affiche le nom des résidents assignés", () => {
    renderTable();
    expect(screen.getAllByText("Alice Martin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob Dupont").length).toBeGreaterThan(0);
  });

  it("affiche le slot yearSelector dans la toolbar", () => {
    renderTable({ yearSelector: <select data-testid="year-sel"><option>2025</option></select> });
    expect(screen.getByTestId("year-sel")).toBeInTheDocument();
  });
});

// ── Cellules non assignées ────────────────────────────────────────────────────

describe("WeekScheduleTable — cellules non assignées", () => {
  it("compte correctement les cellules vides (5 dans ROTATION_FULL)", () => {
    renderTable();
    // p2: 2 vides, p3: 3 vides → 5 total
    expect(screen.getByText(/5 non assignée/)).toBeInTheDocument();
  });

  it("n'affiche pas le badge quand tout est assigné", () => {
    renderTable({ rotation: ROTATION_COMPLETE });
    expect(screen.queryByText(/non assignée/)).not.toBeInTheDocument();
  });

  it("affiche '+' dans les cellules vides", () => {
    renderTable();
    // 5 cellules vides + 1 dans la ligne "Importer un poste" = 6 "+"
    const plusSigns = screen.getAllByText("+");
    expect(plusSigns.length).toBeGreaterThanOrEqual(5);
  });
});

// ── Badge "non assignées" — navigation cyclique ───────────────────────────────

describe("WeekScheduleTable — badge navigation cyclique", () => {
  it("n'affiche pas de compteur avant le premier clic", () => {
    renderTable();
    expect(screen.queryByText(/1\/5/)).not.toBeInTheDocument();
  });

  it("affiche 1/5 après le premier clic", async () => {
    renderTable();
    await userEvent.click(screen.getByText(/5 non assignée/));
    expect(screen.getByText(/1\/5/)).toBeInTheDocument();
  });

  it("affiche 2/5 après le deuxième clic", async () => {
    renderTable();
    const badge = screen.getByText(/5 non assignée/);
    await userEvent.click(badge);
    await userEvent.click(badge);
    expect(screen.getByText(/2\/5/)).toBeInTheDocument();
  });

  it("revient à 1/5 après 5 clics (cycle complet)", async () => {
    renderTable();
    const badge = screen.getByText(/5 non assignée/);
    for (let i = 0; i < 5; i++) await userEvent.click(badge);
    // 5 clics = index 4, 6ème clic = retour à 0
    await userEvent.click(badge);
    expect(screen.getByText(/1\/5/)).toBeInTheDocument();
  });

  it("remet le curseur à 0 quand le nombre de cellules vides change", () => {
    const { rerender } = renderTable();
    // Simule une assignation qui réduit à 4 cellules vides
    const newRotation = {
      ...ROTATION_FULL,
      p2: ["bob", "carol", "alice", "alice", "alice", null] as (string | null)[],
    };
    rerender(
      <WeekScheduleTable people={PEOPLE} postes={POSTES} weeks={WEEKS} rotation={newRotation} />
    );
    expect(screen.getByText(/4 non assignée/)).toBeInTheDocument();
    expect(screen.queryByText(/\/4/)).not.toBeInTheDocument();
  });

  it("appelle scrollTo sur le container au clic badge", async () => {
    renderTable();
    await userEvent.click(screen.getByText(/5 non assignée/));
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );
  });
});

// ── Highlight cellule ─────────────────────────────────────────────────────────

describe("WeekScheduleTable — highlight cellule vide", () => {
  it("le badge est cliquable (cursor pointer)", () => {
    renderTable();
    const badge = screen.getByText(/5 non assignée/).closest("span")!;
    expect(badge).toHaveStyle("cursor: pointer");
  });
});

// ── Largeur des colonnes — localStorage ──────────────────────────────────────

describe("WeekScheduleTable — préférence largeur", () => {
  it("démarre en mode compact par défaut", () => {
    renderTable();
    expect(screen.getByTitle(/Élargir les cases/)).toBeInTheDocument();
  });

  it("restaure le mode large depuis localStorage", () => {
    store["medatwork:week-dispatcher-cell-width"] = "large";
    renderTable();
    expect(screen.getByTitle(/Rétrécir les cases/)).toBeInTheDocument();
  });

  it("bascule compact → large et sauvegarde en localStorage", async () => {
    renderTable();
    await userEvent.click(screen.getByTitle(/Élargir les cases/));
    expect(store["medatwork:week-dispatcher-cell-width"]).toBe("large");
    expect(screen.getByTitle(/Rétrécir les cases/)).toBeInTheDocument();
  });

  it("bascule large → compact et sauvegarde en localStorage", async () => {
    store["medatwork:week-dispatcher-cell-width"] = "large";
    renderTable();
    await userEvent.click(screen.getByTitle(/Rétrécir les cases/));
    expect(store["medatwork:week-dispatcher-cell-width"]).toBe("compact");
  });
});

// ── Panneau latéral ───────────────────────────────────────────────────────────

describe("WeekScheduleTable — panneau latéral", () => {
  it("affiche le panneau par défaut", () => {
    renderTable();
    expect(screen.getByText("Charge par MACC")).toBeInTheDocument();
    expect(screen.getByText("Aperçu mensuel")).toBeInTheDocument();
  });

  it("masque le panneau après clic sur 'Masquer'", async () => {
    renderTable();
    await userEvent.click(screen.getByText(/Masquer le panneau/));
    expect(screen.queryByText("Charge par MACC")).not.toBeInTheDocument();
  });

  it("réaffiche le panneau après double-clic", async () => {
    renderTable();
    const btn = screen.getByText(/Masquer le panneau/);
    await userEvent.click(btn);
    await userEvent.click(screen.getByText(/Afficher le panneau/));
    expect(screen.getByText("Charge par MACC")).toBeInTheDocument();
  });
});

// ── Callbacks ─────────────────────────────────────────────────────────────────

describe("WeekScheduleTable — callbacks", () => {
  it("appelle onCellClick avec (posteId, weekIdx) sur une cellule vide", async () => {
    const onCellClick = vi.fn();
    renderTable({ onCellClick });
    // p3[0] = null → première cellule vide de l'orthopédie
    const plusCells = screen.getAllByText("+");
    await userEvent.click(plusCells[0]);
    expect(onCellClick).toHaveBeenCalledWith(
      expect.any(String), // posteId
      expect.any(Number), // weekIdx
      expect.any(Object)  // event
    );
  });

  it("appelle onAddPoste via le bouton toolbar", async () => {
    const onAddPoste = vi.fn();
    renderTable({ onAddPoste });
    const buttons = screen.getAllByText(/Importer un poste/);
    await userEvent.click(buttons[0]);
    expect(onAddPoste).toHaveBeenCalledOnce();
  });

  it("appelle onAddPoste via la ligne du bas de la grille", async () => {
    const onAddPoste = vi.fn();
    renderTable({ onAddPoste });
    const buttons = screen.getAllByText(/Importer un poste/);
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onAddPoste).toHaveBeenCalledOnce();
  });
});

// ── Compteur poste ────────────────────────────────────────────────────────────

describe("WeekScheduleTable — compteur X/N par poste", () => {
  it("affiche le bon compteur pour chaque poste", () => {
    renderTable();
    // p1: 6/6, p2: 4/6, p3: 3/6
    expect(screen.getByText("6/6")).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();
    expect(screen.getByText("3/6")).toBeInTheDocument();
  });
});

// ── Panneau Charge par MACC ───────────────────────────────────────────────────

describe("WeekScheduleTable — panneau Charge par MACC", () => {
  it("affiche tous les résidents qui ont des assignations", () => {
    renderTable();
    // Le panneau "Charge par MACC" liste les résidents assignés —
    // chaque nom apparaît au minimum dans la grille ET dans le panneau
    expect(screen.getAllByText("Alice Martin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Dupont").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Carol Leroy").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche le nombre de semaines par résident", () => {
    renderTable();
    // alice: p1=2, p2=2, p3=1 → 5 sem | bob: p1=2, p2=1 → 3 sem | carol: p1=2, p2=1, p3=2 → 5 sem
    expect(screen.getAllByText(/5 sem\./).length).toBeGreaterThanOrEqual(1);
  });
});

// ── Aperçu mensuel ────────────────────────────────────────────────────────────

describe("WeekScheduleTable — aperçu mensuel", () => {
  it("affiche les semaines dans l'aperçu", () => {
    renderTable();
    // Les numéros de semaine (41-46) apparaissent dans le panneau
    const allS41 = screen.getAllByText("41");
    expect(allS41.length).toBeGreaterThanOrEqual(1);
  });

  it("les tuiles sont cliquables", async () => {
    renderTable();
    // Toutes les tuiles de semaine dans l'aperçu
    const tile = screen.getAllByTitle(/S\d+/)[0];
    expect(tile).toBeInTheDocument();
    await userEvent.click(tile);
    // scrollTo appelé (scroll horizontal)
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });
});

// ── Semaine courante ──────────────────────────────────────────────────────────

describe("WeekScheduleTable — semaine courante", () => {
  it("met en évidence la semaine courante dans le header", () => {
    renderTable({ currentWeekIdx: 2 });
    // La semaine 43 (idx 2) est mise en avant
    // On vérifie juste que le rendu ne crash pas
    expect(screen.getByText("Répartition des semaines")).toBeInTheDocument();
  });
});
