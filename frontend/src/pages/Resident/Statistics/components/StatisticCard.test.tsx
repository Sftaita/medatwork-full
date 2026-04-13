/**
 * Tests for StatisticCard.tsx (carte statistiques résident).
 *
 * Covers:
 * - Résilience : ne plante pas avec item null/undefined/vide (régression CountUp/NaN)
 * - Tous les libellés de métriques présents
 * - Nom du résident affiché dans l'en-tête
 * - Pourcentage d'avancement affiché quand scheduledMonth > 0
 * - Pas de pourcentage quand scheduledMonth = 0
 * - Popover absences s'ouvre et affiche le détail
 * - Dialog d'information s'ouvre au clic sur le bouton ?
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CustomizedTheme } from "../../../../doc/CustomizedTheme";
import StatisticCard from "./StatisticCard";

// ── Mocks ────────────────────────────────────────────────────────────────────

// CountUp : rend la valeur `end` comme texte pour pouvoir l'asserter
vi.mock("react-countup", () => ({
  default: ({ end }: { end: number }) => <span data-testid="countup">{end}</span>,
}));

// Recharts : ResponsiveContainer n'a pas de dimensions en JSDOM
vi.mock("recharts", () => ({
  BarChart:          ({ children }: any) => <div>{children}</div>,
  Bar:               () => null,
  XAxis:             () => null,
  YAxis:             () => null,
  CartesianGrid:     () => null,
  Tooltip:           () => null,
  Legend:            () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

// ScrollDialog : stub minimal pour tester l'ouverture
vi.mock("../../../../components/medium/ScrollDialog", () => ({
  default: ({ open, title }: any) =>
    open ? <div role="dialog" aria-label={title}>{title}</div> : null,
}));

// ── Theme wrapper ─────────────────────────────────────────────────────────────
// StatisticCard utilise theme.palette.purple.main (palette personnalisée).
// Sans ThemeProvider avec CustomizedTheme, le rendu lèverait "Cannot read properties
// of undefined (reading 'main')".
const theme = createTheme(CustomizedTheme as any);
function renderCard(item: any) {
  return render(
    <ThemeProvider theme={theme}>
      <StatisticCard item={item} />
    </ThemeProvider>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const FULL_ITEM = {
  firstname: "Alice",
  lastname: "Martin",
  totalHours: 38.5,
  hardHours: 12.25,
  veryHardHours: 4,
  scheduledMonth: 45,
  callableGardeNb: 3,
  hospitalGardeNb: 16,
  monthNbOfAbsences: 2,
  week: { 14: 38.5, 15: 42 },
  scheduledWeek: { 14: 40, 15: 40 },
  absences: {
    yearLegalLeaves: 5,
    yearScientificLeaves: 1,
    yearPaternityLeaves: 0,
    yearMaternityLeaves: 0,
    yearUnpaidLeaves: 0,
    YearTotalAbsenceDay: 6,
    yearScheduledAbsences: {
      totalScheduledLeaves: 25,
      legalLeaves: 20,
      scientificLeaves: 5,
      paternityLeave: 0,
      maternityLeave: 0,
      unpaidLeave: 0,
    },
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StatisticCard — résilience CountUp (régressions NaN)", () => {
  it("ne plante pas quand item est null", () => {
    expect(() => renderCard(null)).not.toThrow();
  });

  it("ne plante pas quand item est undefined", () => {
    expect(() => renderCard(undefined)).not.toThrow();
  });

  it("ne plante pas quand item est un objet vide {}", () => {
    expect(() => renderCard({})).not.toThrow();
  });

  it("ne plante pas quand toutes les valeurs numériques sont null", () => {
    expect(() =>
      renderCard({
        firstname: "X",
        lastname: "Y",
        totalHours: null,
        hardHours: null,
        veryHardHours: null,
        scheduledMonth: null,
        callableGardeNb: null,
        hospitalGardeNb: null,
        monthNbOfAbsences: null,
      })
    ).not.toThrow();
  });

  it("affiche 0 pour callableGardeNb null (pas NaN dans CountUp)", () => {
    renderCard({ ...FULL_ITEM, callableGardeNb: null });
    // CountUp reçoit 0 grâce à ?? 0
    const countups = screen.getAllByTestId("countup");
    // Aucune valeur NaN ne doit apparaître
    countups.forEach((el) => expect(el.textContent).not.toBe("NaN"));
  });

  it("affiche 0 pour monthNbOfAbsences null (pas NaN dans CountUp)", () => {
    renderCard({ ...FULL_ITEM, monthNbOfAbsences: null });
    const countups = screen.getAllByTestId("countup");
    countups.forEach((el) => expect(el.textContent).not.toBe("NaN"));
  });

  it("affiche 0h pour totalHours undefined (convertHours null-guard)", () => {
    renderCard({ ...FULL_ITEM, totalHours: undefined });
    const countups = screen.getAllByTestId("countup");
    countups.forEach((el) => expect(el.textContent).not.toBe("NaN"));
  });
});

describe("StatisticCard — libellés des métriques", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche tous les libellés de métriques", () => {
    renderCard(FULL_ITEM);
    expect(screen.getByText("Heures totales")).toBeInTheDocument();
    expect(screen.getByText("Heures inconfortables")).toBeInTheDocument();
    expect(screen.getByText(/Heures très inconfortables/)).toBeInTheDocument();
    expect(screen.getByText("Nombre de gardes appelables")).toBeInTheDocument();
    expect(screen.getByText(/Gardes sur place/)).toBeInTheDocument();
    expect(screen.getByText("Jours de congé")).toBeInTheDocument();
  });

  it("affiche le prénom et nom dans l'en-tête", () => {
    renderCard(FULL_ITEM);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
  });

  it("affiche le titre du graphique prévisionnel", () => {
    renderCard(FULL_ITEM);
    expect(screen.getByText("Horaire prévisionnel")).toBeInTheDocument();
  });
});

describe("StatisticCard — pourcentage d'avancement", () => {
  it("affiche un pourcentage quand scheduledMonth > 0", () => {
    // totalHours=38.5, scheduledMonth=45 → round(38.5/45*100) = 86%
    renderCard(FULL_ITEM);
    expect(screen.getByText(/86%/)).toBeInTheDocument();
  });

  it("n'affiche pas de pourcentage quand scheduledMonth = 0", () => {
    renderCard({ ...FULL_ITEM, scheduledMonth: 0 });
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("n'affiche pas de pourcentage quand scheduledMonth est null", () => {
    renderCard({ ...FULL_ITEM, scheduledMonth: null });
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("affiche le pourcentage en rouge quand totalHours > scheduledMonth", () => {
    // totalHours=50, scheduledMonth=45 → 111% → couleur error
    renderCard({ ...FULL_ITEM, totalHours: 50, scheduledMonth: 45 });
    expect(screen.getByText(/111%/)).toBeInTheDocument();
  });
});

describe("StatisticCard — dialog d'information", () => {
  it("le dialog est fermé par défaut", () => {
    renderCard(FULL_ITEM);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("le dialog s'ouvre au clic sur le bouton ? (QuestionMarkIcon)", () => {
    renderCard(FULL_ITEM);
    // Deux boutons : le ? (CardHeader action) et la flèche bas (popover absences)
    const buttons = screen.getAllByRole("button");
    // Le bouton ? est le premier (dans CardHeader action)
    fireEvent.click(buttons[0]);
    expect(screen.getByRole("dialog", { name: /informations/i })).toBeInTheDocument();
  });
});

describe("StatisticCard — popover détail absences", () => {
  it("le popover est fermé par défaut (pas de 'Congé annuel' visible)", () => {
    renderCard(FULL_ITEM);
    expect(screen.queryByText(/Congé annuel/)).not.toBeInTheDocument();
  });

  it("le popover s'ouvre et affiche le détail des congés", () => {
    renderCard(FULL_ITEM);
    // Le bouton KeyboardArrowDown est le second bouton
    const buttons = screen.getAllByRole("button");
    const arrowBtn = buttons[buttons.length - 1];
    fireEvent.click(arrowBtn);
    expect(screen.getByText(/Congé annuel/)).toBeInTheDocument();
    expect(screen.getByText(/Congé scientifique/)).toBeInTheDocument();
    expect(screen.getByText(/Congé paternité/)).toBeInTheDocument();
    expect(screen.getByText(/Congé maternité/)).toBeInTheDocument();
    expect(screen.getByText(/Congé non rémunéré/)).toBeInTheDocument();
  });

  it("affiche le ratio 'pris / prévus' pour les congés annuels", () => {
    renderCard(FULL_ITEM);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);
    // yearLegalLeaves=5, legalLeaves=20 → "5 / 20"
    expect(screen.getByText(/5\s*\/\s*20/)).toBeInTheDocument();
  });

  it("n'affiche pas le badge total/prévu quand totalScheduledLeaves = 0", () => {
    renderCard({
      ...FULL_ITEM,
      absences: {
        ...FULL_ITEM.absences,
        yearScheduledAbsences: {
          ...FULL_ITEM.absences.yearScheduledAbsences,
          totalScheduledLeaves: 0,
        },
      },
    });
    // Le sup avec le ratio ne doit pas apparaître
    expect(screen.queryByText(/6\/0/)).not.toBeInTheDocument();
  });

  it("ne plante pas quand yearScheduledAbsences est undefined (régression optional chaining)", () => {
    expect(() =>
      renderCard({
        ...FULL_ITEM,
        absences: { YearTotalAbsenceDay: 3, yearScheduledAbsences: undefined },
      })
    ).not.toThrow();
  });
});
