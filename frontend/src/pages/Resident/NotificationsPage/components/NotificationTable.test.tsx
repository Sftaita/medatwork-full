/**
 * P2-F — Modernisation NotificationTable résident
 *
 * RES-NOTIF-01 : row.id utilisé comme clé React (pas row.key)
 * RES-NOTIF-02 : row.read (pas row.isRead) — icônes lu/non-lu correctes
 * RES-NOTIF-03 : timestamp "Il y a X minutes" pour notification récente
 * RES-NOTIF-04 : timestamp "Hier à HH:mm" pour notification d'hier
 * RES-NOTIF-05 : notifications récentes avant anciennes
 * RES-NOTIF-06 : notifications non lues avant lues
 * RES-NOTIF-07 : notifications existantes rendues sans crash
 * RES-NOTIF-08 : aucune régression sur les notifications (read flag)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../../doc/CustomizedTheme";
import NotificationTable from "./NotificationTable";
import type { Notification } from "@/types/entities";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

const NOW_MS = new Date("2026-06-04T14:00:00.000Z").getTime();

vi.useFakeTimers();
vi.setSystemTime(NOW_MS);

function n(overrides: Partial<Notification> & Pick<Notification, "object" | "body">): Notification {
  return {
    id: 1,
    type: "validated",
    read: false,
    readAt: null,
    createdAt: "2026-06-04T12:00:00Z",
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

// ── RES-NOTIF-01 : row.id comme clé ──────────────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-01 : clé React", () => {
  /**
   * RED : row.key est undefined → React génère des warnings de clé dupliquée.
   * Après fix : row.id est utilisé → clés uniques, pas de warning.
   * On vérifie que les 2 notifications sont rendues (rendu complet sans crash).
   */
  it("RES-NOTIF-01 deux notifications avec ids différents → toutes deux rendues", () => {
    renderTable([
      n({ id: 10, object: "Validation Mai", body: "Mai 2026 validé." }),
      n({ id: 11, object: "Validation Avril", body: "Avril 2026 validé." }),
    ]);
    expect(screen.getByText("Validation Mai")).toBeInTheDocument();
    expect(screen.getByText("Validation Avril")).toBeInTheDocument();
  });
});

// ── RES-NOTIF-02 : row.read (pas row.isRead) ─────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-02 : icônes lu/non-lu", () => {
  /**
   * RED : row?.isRead est undefined → DraftsIcon jamais affiché.
   * Après fix : row.read est lu → icône correcte selon l'état.
   */
  it("RES-NOTIF-02a notification lue (read=true) → icône DraftsIcon", () => {
    renderTable([n({
      object: "Notification lue",
      body:   "Corps",
      read:   true,
      readAt: "2026-06-04T10:00:00Z",
    })]);
    expect(screen.getByTestId("notif-icon-read")).toBeInTheDocument();
    expect(screen.queryByTestId("notif-icon-unread")).not.toBeInTheDocument();
  });

  it("RES-NOTIF-02b notification non lue (read=false) → icône MailIcon", () => {
    renderTable([n({
      object: "Notification non lue",
      body:   "Corps",
      read:   false,
    })]);
    expect(screen.getByTestId("notif-icon-unread")).toBeInTheDocument();
    expect(screen.queryByTestId("notif-icon-read")).not.toBeInTheDocument();
  });
});

// ── RES-NOTIF-03 : timestamp relatif récent ───────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-03 : timestamp récent", () => {
  /**
   * RED : aucun timestamp affiché actuellement.
   * NOW = 2026-06-04T14:00:00Z, notification = 5 min avant.
   */
  it("RES-NOTIF-03 créée il y a 5 min → affiche 'Il y a 5 minutes'", () => {
    const date = new Date(NOW_MS - 5 * 60 * 1000).toISOString();
    renderTable([n({ object: "Validation Mai", body: "Corps", createdAt: date })]);
    expect(screen.getByText("Il y a 5 minutes")).toBeInTheDocument();
  });
});

// ── RES-NOTIF-04 : timestamp relatif hier ─────────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-04 : timestamp hier", () => {
  /**
   * RED : aucun timestamp affiché actuellement.
   */
  it("RES-NOTIF-04 créée hier → affiche 'Hier à HH:mm'", () => {
    renderTable([n({ object: "Validation Mai", body: "Corps", createdAt: "2026-06-03T10:00:00Z" })]);
    expect(screen.getByText(/^Hier à \d{2}:\d{2}$/)).toBeInTheDocument();
  });
});

// ── RES-NOTIF-05 : tri par date (récentes en premier) ────────────────────────

describe("NotificationTable résident — RES-NOTIF-05 : tri par date", () => {
  /**
   * RED : aucun tri actuellement — ordre d'insertion.
   * Après fix : plus récente en premier.
   */
  it("RES-NOTIF-05 plus récente affichée en premier", () => {
    renderTable([
      n({ id: 1, object: "Ancienne",  body: "Corps A", createdAt: "2026-06-01T10:00:00Z" }),
      n({ id: 2, object: "Récente",   body: "Corps B", createdAt: "2026-06-04T13:00:00Z" }),
    ]);

    const rows = screen.getAllByRole("row");
    // La ligne 0 est potentiellement un header, on cherche la première notification
    const texts = rows.map(r => r.textContent ?? "");
    const recentIdx = texts.findIndex(t => t.includes("Récente"));
    const oldIdx    = texts.findIndex(t => t.includes("Ancienne"));

    expect(recentIdx).toBeLessThan(oldIdx);
  });
});

// ── RES-NOTIF-06 : non lues avant lues ───────────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-06 : non lues avant lues", () => {
  /**
   * RED : aucun tri actuellement.
   */
  it("RES-NOTIF-06 non lue avant lue à date identique", () => {
    const date = "2026-06-04T12:00:00Z";
    renderTable([
      n({ id: 1, object: "Lue",     body: "Corps", read: true,  readAt: date, createdAt: date }),
      n({ id: 2, object: "Non lue", body: "Corps", read: false, createdAt: date }),
    ]);

    const rows  = screen.getAllByRole("row");
    const texts = rows.map(r => r.textContent ?? "");
    const unreadIdx = texts.findIndex(t => t.includes("Non lue"));
    const readIdx   = texts.findIndex(t => t.includes("Lue"));

    expect(unreadIdx).toBeLessThan(readIdx);
  });
});

// ── RES-NOTIF-07 : notifications existantes rendues sans crash ────────────────

describe("NotificationTable résident — RES-NOTIF-07 : compatibilité", () => {
  it("RES-NOTIF-07 tableau vide → rendu sans crash", () => {
    expect(() => renderTable([])).not.toThrow();
  });

  it("RES-NOTIF-07 notifications de type validated/invalidated/validation rendues", () => {
    renderTable([
      n({ id: 1, object: "Cardiologie 2025-2026", body: "Validation Mai 2026.",     type: "validated"  }),
      n({ id: 2, object: "Cardiologie 2025-2026", body: "Invalidation Avril 2026.", type: "invalidated" }),
      n({ id: 3, object: "Cardiologie 2025-2026", body: "Validation mois entier.",  type: "validation" }),
    ]);

    const objects = screen.getAllByText("Cardiologie 2025-2026");
    expect(objects).toHaveLength(3);
  });
});

// ── RES-NOTIF-08 : aucune régression ─────────────────────────────────────────

describe("NotificationTable résident — RES-NOTIF-08 : régressions", () => {
  it("RES-NOTIF-08 body affiché dans la colonne corps", () => {
    renderTable([n({ object: "Titre", body: "Corps de la notification." })]);
    expect(screen.getByText("Corps de la notification.")).toBeInTheDocument();
  });

  it("RES-NOTIF-08 body multiligne respecté (white-space: pre-line)", () => {
    renderTable([n({
      object: "Titre",
      body:   "Ligne 1\n• Ligne 2\n• Ligne 3",
    })]);
    // Le texte multiligne doit être rendu en un seul nœud avec white-space:pre-line
    expect(screen.getByText(/Ligne 1/)).toBeInTheDocument();
  });
});
