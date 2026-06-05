/**
 * Tests — RealtimeTab
 *
 * Couverture :
 *   - Rendu de base : 6 MACCS listés
 *   - MACCS sans prévisionnel (Truong) → "prévisionnel non établi", pas "0%" ni "0h prévues"
 *   - Statut "Dépassement" pour Manicone (pct=100)
 *   - Statut "À surveiller" pour Michel (tresV=30)
 *   - Filtre "En alerte" n'affiche que les MACCS en dépassement
 *   - Progression moyenne exclut Truong (prevH null)
 *   - Ouvrir une ligne MACCS affiche le détail
 *   - Re-cliquer referme le détail
 *   - Seuils légaux 48h / 60h / 72h présents dans le graphe (ligne ouverte)
 *   - Bannière "Établir l'horaire" visible uniquement pour MACCS sans prévisionnel
 *   - Section Vue d'ensemble rendue
 *   - Légende cliquable présente
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RealtimeTab from "./index";
import { DEMO_MACCS } from "./realtimeDemoData";

// CSS Modules → identités de classes neutralisées en test
// (vite / vitest gère le .module.css comme un proxy d'identités)

function renderTab() {
  return render(<RealtimeTab yearId={42} />);
}

// ── Rendu de base ─────────────────────────────────────────────────────────────

describe("RealtimeTab — rendu de base", () => {
  it("affiche les 6 MACCS du jeu de données de démo", () => {
    renderTab();
    DEMO_MACCS.forEach(m => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    });
  });

  it("affiche le titre 'En temps réel'", () => {
    renderTab();
    expect(screen.getByText("En temps réel")).toBeInTheDocument();
  });

  it("affiche la section Vue d'ensemble", () => {
    renderTab();
    expect(screen.getByTestId("rt-overview")).toBeInTheDocument();
  });

  it("affiche les boutons de légende de la vue d'ensemble", () => {
    renderTab();
    DEMO_MACCS.forEach(m => {
      expect(screen.getByTestId(`legend-${m.last}`)).toBeInTheDocument();
    });
  });

  it("affiche le résumé avec le bon total de MACCS suivis", () => {
    renderTab();
    expect(screen.getByTestId("summary-total")).toHaveTextContent("6");
  });
});

// ── Prévisionnel non renseigné (Truong) ───────────────────────────────────────

describe("MACCS sans prévisionnel (Vinh hao Truong)", () => {
  it("affiche 'prévisionnel non établi' dans la ligne (pas '0h' ni '0%')", () => {
    renderTab();
    // La mention doit être présente pour Truong
    expect(screen.getByTestId("no-prev-Truong")).toBeInTheDocument();
    expect(screen.getByTestId("no-prev-Truong")).toHaveTextContent(
      "prévisionnel non établi"
    );
  });

  it("n'affiche pas '0h prévues' pour Truong", () => {
    renderTab();
    // Aucun élément ne doit afficher exactement "0h prévues" (string exacte, pas regex)
    expect(screen.queryByText("0h prévues")).not.toBeInTheDocument();
  });

  it("n'affiche pas '0%' comme valeur de progression pour Truong", () => {
    renderTab();
    // Cherche '0%' dans les lignes de progression : ne doit pas être présent
    const zeroPercent = screen.queryAllByText("0%");
    expect(zeroPercent).toHaveLength(0);
  });

  it("affiche la bannière 'Établir l'horaire' quand le détail de Truong est ouvert", () => {
    renderTab();
    // Ouvrir la ligne de Truong
    fireEvent.click(screen.getByText("Vinh hao Truong"));
    expect(screen.getByTestId("prev-empty-Truong")).toBeInTheDocument();
    expect(screen.getByTestId("go-to-schedule-Truong")).toBeInTheDocument();
  });

  it("n'affiche PAS la bannière pour un MACCS avec prévisionnel (Dorenlot)", () => {
    renderTab();
    fireEvent.click(screen.getByText("Marie Dorenlot"));
    expect(screen.queryByTestId("prev-empty-Dorenlot")).not.toBeInTheDocument();
  });
});

// ── Statuts ───────────────────────────────────────────────────────────────────

describe("Statuts MACCS", () => {
  it("Manicone (pct=100) → statut 'Dépassement'", () => {
    renderTab();
    expect(screen.getByTestId("status-Manicone")).toHaveTextContent("Dépassement");
  });

  it("Michel (pic=92h > 72h) → statut 'Dépassement'", () => {
    renderTab();
    expect(screen.getByTestId("status-Michel")).toHaveTextContent("Dépassement");
  });

  it("Zerouali (pic=54h) → statut 'Conforme'", () => {
    renderTab();
    expect(screen.getByTestId("status-Zerouali")).toHaveTextContent("Conforme");
  });

  it("Truong (sans prévisionnel, pic=67h > 60h) → statut 'À surveiller' — pas neutre", () => {
    // L'absence de prévisionnel NE rend PAS le MACCS non-évaluable.
    // Truong : pct=null, pic=67h > THRESHOLDS.max(60) → warn.
    renderTab();
    expect(screen.getByTestId("status-Truong")).toHaveTextContent("À surveiller");
  });

  it("le compteur 'En alerte' dans le résumé reflète le nombre de 'bad'", () => {
    renderTab();
    // bad : Dorenlot (pic=76h > 72), Manicone (pct=100 + pic=90), Manon (pic=80), Michel (pic=92)
    // Truong → warn (pct=null, pic=67h > 60h)  /  Zerouali → ok (pic=54)
    expect(screen.getByTestId("summary-alert")).toHaveTextContent("4");
  });

  it("le compteur 'À surveiller' inclut Truong malgré l'absence de prévisionnel", () => {
    renderTab();
    // Truong est warn → compté dans summary-watch
    expect(screen.getByTestId("summary-watch")).toHaveTextContent("1");
  });
});

// ── Filtre "En alerte" ────────────────────────────────────────────────────────

describe("Filtre 'En alerte'", () => {
  it("n'affiche que les MACCS 'bad' après activation du filtre", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /En alerte/ }));

    // bad : Dorenlot (pic 76), Manicone (pct=100), Manon (pic 80), Michel (pic 92)
    expect(screen.getByText("Marie Dorenlot")).toBeInTheDocument();
    expect(screen.getByText("Francesca Manicone")).toBeInTheDocument();
    expect(screen.getByText("Sofia Manon")).toBeInTheDocument();
    expect(screen.getByText("Adrien Michel")).toBeInTheDocument();

    // ok : Truong et Zerouali ne doivent pas apparaître
    expect(screen.queryByText("Vinh hao Truong")).not.toBeInTheDocument();
    expect(screen.queryByText("Yasmine Zerouali")).not.toBeInTheDocument();
  });

  it("re-cliquer 'Tous' restaure la liste complète", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /En alerte/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Tous/ }));
    expect(screen.getAllByTestId(/^maccs-row-/)).toHaveLength(DEMO_MACCS.length);
  });
});

// ── Progression moyenne ───────────────────────────────────────────────────────

describe("Progression moyenne", () => {
  it("exclut Truong du calcul (prevH null) et affiche la moyenne des 5 autres", () => {
    renderTab();
    // Calcul attendu : (76 + 100 + 94 + 95 + 84) / 5 = 449 / 5 = 89.8 → 90
    expect(screen.getByTestId("summary-avg")).toHaveTextContent("90");
  });
});

// ── Ouverture / fermeture d'une ligne ─────────────────────────────────────────

describe("Repliage des lignes MACCS", () => {
  it("cliquer sur une ligne l'ouvre et affiche le détail", () => {
    renderTab();
    expect(screen.queryByTestId("detail-Dorenlot")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Marie Dorenlot"));

    expect(screen.getByTestId("detail-Dorenlot")).toBeInTheDocument();
  });

  it("re-cliquer referme la ligne", () => {
    renderTab();
    fireEvent.click(screen.getByText("Marie Dorenlot"));
    expect(screen.getByTestId("detail-Dorenlot")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Marie Dorenlot"));

    expect(screen.queryByTestId("detail-Dorenlot")).not.toBeInTheDocument();
  });

  it("ouvrir une ligne n'affecte pas les autres", () => {
    renderTab();
    fireEvent.click(screen.getByText("Marie Dorenlot"));
    expect(screen.queryByTestId("detail-Manicone")).not.toBeInTheDocument();
  });
});

// ── Seuils légaux dans le graphe ──────────────────────────────────────────────

describe("Seuils légaux 48h / 60h / 72h", () => {
  it("les trois repères sont présents dans le SVG quand une ligne est ouverte", () => {
    renderTab();
    fireEvent.click(screen.getByText("Marie Dorenlot"));

    // Les seuils sont rendus comme texte dans les SVG <text> elements
    expect(screen.getAllByText("48h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("60h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("72h").length).toBeGreaterThanOrEqual(1);
  });

  it("les repères sont aussi présents dans la vue d'ensemble (même sans ligne ouverte)", () => {
    renderTab();
    // La vue d'ensemble trace toujours les lignes de référence
    expect(screen.getAllByText("48h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("60h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("72h").length).toBeGreaterThanOrEqual(1);
  });
});
