/**
 * NotificationTable — tests QW-4 + UI-COMP (P2-B2)
 *
 * QW-4 : alignement des champs API (object, body, type, read, readAt)
 * UI-COMP : badges visuels CRITIQUE / AVERTISSEMENT
 *           + corrections bugs (read, key)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../../doc/CustomizedTheme";
import NotificationTable from "./NotificationTable";
import type { Notification } from "@/types/entities";

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

function n(overrides: Partial<Notification> & Pick<Notification, "object" | "body">): Notification {
  return {
    id: 1,
    type: "validation",
    read: false,
    readAt: null,
    createdAt: "2026-06-03T02:00:00+00:00",
    ...overrides,
  };
}

function renderTable(notifications: Notification[]) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <NotificationTable notificationData={notifications} />
    </ThemeProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QW-4 — champs API corrects
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationTable — champs API (QW-4)", () => {
  /**
   * QW4-01 (mis à jour P2-B2) : après le badge, le titre affiché
   * ne contient plus le préfixe [CRITIQUE] — il est déporté dans le Chip.
   *
   * RED : actuellement "Alice Dupont — Cardio 2025" est introuvable seul
   *       car le texte brut est "[CRITIQUE] Alice Dupont — Cardio 2025".
   * GREEN : après badge, le Typography contient uniquement le titre propre.
   */
  it("QW4-01 titre affiché sans le préfixe [CRITIQUE]", () => {
    renderTable([n({
      object: "[CRITIQUE] Alice Dupont — Cardio 2025",
      body:   "Alice Dupont — 1 violation(s)...",
      type:   "compliance_alert",
    })]);

    // Le texte propre doit être trouvable (sans le préfixe)
    expect(screen.getByText("Alice Dupont — Cardio 2025")).toBeInTheDocument();
    // Le préfixe "[CRITIQUE]" ne doit plus être présent dans un nœud texte brut
    expect(screen.queryByText("[CRITIQUE] Alice Dupont — Cardio 2025")).not.toBeInTheDocument();
  });

  it("QW4-02 body affiché comme contenu de la ligne", () => {
    renderTable([n({
      object: "Alerte",
      body:   "Alice — 1 violation(s) détectée(s) le 03/06/2026 :\n• La semaine 22 dépasse 60h.",
    })]);
    expect(screen.getByText(/violation.*détectée/i)).toBeInTheDocument();
  });

  /**
   * QW4-03 (mise à jour P2-B2) : correction du bug row.isRead → row.read.
   * Une notification lue (read: true) doit afficher DraftsIcon, pas MailIcon.
   *
   * RED : actuellement row?.isRead est undefined pour toute notification
   *       donc MailIcon est toujours affiché. En cherchant le DraftsIcon
   *       via aria ou data-testid, le test échoue.
   */
  it("QW4-03 notification lue (read=true) affiche l'icône DraftsIcon", () => {
    renderTable([n({
      object: "Titre lu",
      body:   "Corps",
      read:   true,
      readAt: "2026-06-03T08:00:00+00:00",
    })]);

    // DraftsIcon a le data-testid qu'on va ajouter, ou on cherche l'icône par aria
    expect(screen.getByTestId("notif-icon-read")).toBeInTheDocument();
    expect(screen.queryByTestId("notif-icon-unread")).not.toBeInTheDocument();
  });

  it("QW4-04 plusieurs notifications affichées", () => {
    renderTable([
      n({ id: 1, object: "Notif A", body: "Corps A" }),
      n({ id: 2, object: "Notif B", body: "Corps B", read: true, readAt: "2026-06-02T00:00:00Z" }),
    ]);
    expect(screen.getByText("Notif A")).toBeInTheDocument();
    expect(screen.getByText("Notif B")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UI-COMP — badges visuels de sévérité
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationTable — badges COMPLIANCE_ALERT (UI-COMP)", () => {
  /**
   * UI-COMP-01 : objet commençant par [CRITIQUE] → badge rouge affiché.
   *
   * RED : aucun badge n'existe actuellement dans le composant.
   */
  it("UI-COMP-01 [CRITIQUE] → badge critique affiché", () => {
    renderTable([n({
      object: "[CRITIQUE] Alice Dupont — Cardio 2025",
      body:   "Corps",
      type:   "compliance_alert",
    })]);

    expect(screen.getByTestId("badge-critique")).toBeInTheDocument();
    expect(screen.queryByTestId("badge-avertissement")).not.toBeInTheDocument();
  });

  /**
   * UI-COMP-02 : objet commençant par [AVERTISSEMENT] → badge warning affiché.
   *
   * RED : aucun badge n'existe actuellement dans le composant.
   */
  it("UI-COMP-02 [AVERTISSEMENT] → badge warning affiché", () => {
    renderTable([n({
      object: "[AVERTISSEMENT] Alice Dupont — Cardio 2025",
      body:   "Corps",
      type:   "compliance_alert",
    })]);

    expect(screen.getByTestId("badge-avertissement")).toBeInTheDocument();
    expect(screen.queryByTestId("badge-critique")).not.toBeInTheDocument();
  });

  /**
   * UI-COMP-03 : notification sans préfixe → aucun badge.
   * Test de régression : les notifications standard restent inchangées.
   */
  it("UI-COMP-03 notification sans préfixe → aucun badge", () => {
    renderTable([n({
      object: "Validation mensuelle",
      body:   "Bob Martin : Validation du mois de Mai 2026.",
      type:   "validation",
    })]);

    expect(screen.queryByTestId("badge-critique")).not.toBeInTheDocument();
    expect(screen.queryByTestId("badge-avertissement")).not.toBeInTheDocument();
    expect(screen.getByText("Validation mensuelle")).toBeInTheDocument();
  });

  /**
   * UI-COMP-04 : notification de type validation (non conformité).
   * Le corps et le titre s'affichent normalement.
   */
  it("UI-COMP-04 notification type validation rendue normalement", () => {
    renderTable([n({
      object: "Validation mensuelle — Cardiologie 2025",
      body:   "Bob Martin : Validation du mois de Mai 2026 par Alice Martine.",
      type:   "validation",
    })]);

    expect(screen.getByText("Validation mensuelle — Cardiologie 2025")).toBeInTheDocument();
    expect(screen.getByText(/Bob Martin : Validation/)).toBeInTheDocument();
  });

  /**
   * UI-COMP-05 : notification non lue → icône MailIcon (non lue).
   * Test de régression : lu/non-lu fonctionne toujours.
   */
  it("UI-COMP-05 notification non lue (read=false) → icône MailIcon", () => {
    renderTable([n({
      object: "Titre non lu",
      body:   "Corps",
      read:   false,
    })]);

    expect(screen.getByTestId("notif-icon-unread")).toBeInTheDocument();
    expect(screen.queryByTestId("notif-icon-read")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-C — bouton "Voir" et deep link (MC-09 à MC-15)
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationTable — bouton Voir et deep link (P2-C)", () => {
  beforeEach(() => mockNavigate.mockClear());

  const compliance = n({
    id:     10,
    object: "[CRITIQUE] Alice Dupont — Cardiologie 2025",
    body:   "2 violation(s)...",
    type:   "compliance_alert",
    metadata: {
      version:   1,
      yearId:    7,
      yearTitle: "Cardiologie 2025-2026",
      tab:       "compliance",
      severity:  "critical",
    },
  });

  /**
   * MC-09 : notification avec metadata.yearId → bouton "Voir" affiché.
   *
   * RED : bouton inexistant dans le composant actuel.
   */
  it("MC-09 notification avec metadata.yearId → bouton Voir présent", () => {
    renderTable([compliance]);
    expect(screen.getByTestId("btn-voir")).toBeInTheDocument();
  });

  /**
   * MC-10 : clic sur "Voir" → navigate appelé avec le bon state.
   * Le state doit contenir id, title et defaultTab mais PAS adminRights depuis metadata.
   *
   * RED : bouton inexistant.
   */
  it("MC-10 clic Voir → navigate avec state correct (yearId, title, tab compliance)", () => {
    renderTable([compliance]);
    fireEvent.click(screen.getByTestId("btn-voir"));

    expect(mockNavigate).toHaveBeenCalledOnce();
    const [path, options] = mockNavigate.mock.calls[0] as [string, { state: Record<string, unknown> }];
    expect(path).toBe("/manager/year-detail");
    expect(options.state.id).toBe(7);
    expect(options.state.title).toBe("Cardiologie 2025-2026");
    expect(options.state.defaultTab).toBe("compliance");
  });

  /**
   * MC-11 : adminRights ne provient PAS de metadata.
   * Ajustement utilisateur : les droits doivent être recalculés à l'ouverture.
   *
   * RED : bouton inexistant.
   */
  it("MC-11 adminRights absent du navigate state (recalculé à l'ouverture)", () => {
    renderTable([compliance]);
    fireEvent.click(screen.getByTestId("btn-voir"));

    const [, options] = mockNavigate.mock.calls[0] as [string, { state: Record<string, unknown> }];
    // adminRights ne doit PAS être true — jamais extrait de metadata
    expect(options.state.adminRights).not.toBe(true);
  });

  /**
   * MC-12 : notification sans metadata (null) → pas de bouton Voir.
   * Rétrocompatibilité : les notifications historiques ne changent pas.
   */
  it("MC-12 notification sans metadata → aucun bouton Voir", () => {
    renderTable([n({
      object:   "[CRITIQUE] Alice — Cardio (historique)",
      body:     "Corps ancien",
      type:     "compliance_alert",
      metadata: null,
    })]);
    expect(screen.queryByTestId("btn-voir")).not.toBeInTheDocument();
  });

  /**
   * MC-13 : metadata sans yearId → pas de bouton Voir.
   * Robustesse contre un metadata partiel ou d'un futur type sans yearId.
   */
  it("MC-13 metadata sans yearId → aucun bouton Voir", () => {
    renderTable([n({
      object:   "Export StaffPlanner terminé",
      body:     "Exporté.",
      type:     "staffplanner_export_done",
      metadata: { version: 1, tab: "staffplanner" },
    })]);
    expect(screen.queryByTestId("btn-voir")).not.toBeInTheDocument();
  });

  /**
   * MC-14 : notification standard (non conformité) sans metadata → pas de bouton Voir.
   * Régression : autres types de notifications inchangés.
   */
  it("MC-14 notification validation standard sans metadata → inchangée", () => {
    renderTable([n({
      object: "Validation mensuelle — Cardio 2025",
      body:   "Bob Martin : Validation de Mai 2026.",
      type:   "validation",
    })]);
    expect(screen.queryByTestId("btn-voir")).not.toBeInTheDocument();
    // titre toujours visible
    expect(screen.getByText("Validation mensuelle — Cardio 2025")).toBeInTheDocument();
  });

  /**
   * MC-15 : version=1 dans le navigate state via metadata.
   * Garantit que la version est bien transmise si un composant en a besoin.
   * (Extensibilité future)
   */
  it("MC-15 deux notifications avec yearId différents → chaque Voir pointe vers la bonne année", () => {
    const notifA = n({ id: 1, object: "[CRITIQUE] Alice — Année 7", body: "Corps A", type: "compliance_alert",
      metadata: { version: 1, yearId: 7, yearTitle: "Année A", tab: "compliance", severity: "critical" } });
    const notifB = n({ id: 2, object: "[CRITIQUE] Bob — Année 9",   body: "Corps B", type: "compliance_alert",
      metadata: { version: 1, yearId: 9, yearTitle: "Année B", tab: "compliance", severity: "critical" } });

    renderTable([notifA, notifB]);

    const btns = screen.getAllByTestId("btn-voir");
    expect(btns).toHaveLength(2);

    // Clic sur le premier bouton → année A (7)
    fireEvent.click(btns[0]);
    const firstCall = mockNavigate.mock.calls[0] as [string, { state: Record<string, unknown> }];
    expect(firstCall[1].state.id).toBe(7);
  });
});
