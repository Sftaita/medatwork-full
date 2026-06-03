/**
 * QW-6 + QW-7 — notificationUtils
 *
 * TIME-01 à TIME-05 : formatRelativeTime
 * SORT-01 à SORT-06 : sortNotifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime, sortNotifications } from "./notificationUtils";
import type { Notification } from "@/types/entities";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotif(overrides: Partial<Notification> & { object: string }): Notification {
  return {
    id:        overrides.id ?? 1,
    object:    overrides.object,
    body:      overrides.body ?? "Corps",
    type:      overrides.type ?? "validation",
    read:      overrides.read ?? false,
    readAt:    overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? "2026-06-03T12:00:00Z",
  };
}

// "Now" fixé pour tous les tests TIME
const NOW_ISO = "2026-06-03T14:00:00.000Z";
const NOW_MS  = new Date(NOW_ISO).getTime();

// ─────────────────────────────────────────────────────────────────────────────
// TIME — formatRelativeTime
// ─────────────────────────────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
  });
  afterEach(() => vi.useRealTimers());

  /**
   * TIME-01 — Il y a 5 minutes
   * RED : fonction pas encore implémentée (renvoie "").
   */
  it("TIME-01 créée il y a 5 min → Il y a 5 minutes", () => {
    const date = new Date(NOW_MS - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("Il y a 5 minutes");
  });

  /**
   * TIME-02 — Il y a 2 heures
   */
  it("TIME-02 créée il y a 2h → Il y a 2 heures", () => {
    const date = new Date(NOW_MS - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("Il y a 2 heures");
  });

  /**
   * TIME-03 — Hier à HH:mm
   * La date est sur le jour calendaire d'hier par rapport à NOW.
   * On teste le format, pas l'heure exacte (timezone du runner).
   */
  it("TIME-03 créée hier → commence par 'Hier à'", () => {
    // 2026-06-02T10:00:00Z = hier
    const date = "2026-06-02T10:00:00Z";
    const result = formatRelativeTime(date);
    expect(result).toMatch(/^Hier à \d{2}:\d{2}$/);
  });

  /**
   * TIME-04 — Ancienne notification → DD/MM/YYYY à HH:mm
   */
  it("TIME-04 créée il y a 3 jours → format date complet", () => {
    const date = "2026-05-31T10:00:00Z";
    const result = formatRelativeTime(date);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/);
  });

  /**
   * TIME-05 — null → chaîne vide (fallback robuste)
   */
  it("TIME-05 createdAt null → chaîne vide", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  /**
   * TIME-06 — undefined → chaîne vide
   */
  it("TIME-06 createdAt undefined → chaîne vide", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  /**
   * TIME-07 — Il y a 1 minute (singulier)
   */
  it("TIME-07 1 minute → singulier sans 's'", () => {
    const date = new Date(NOW_MS - 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("Il y a 1 minute");
  });

  /**
   * TIME-08 — Il y a 1 heure (singulier)
   */
  it("TIME-08 1 heure → singulier sans 's'", () => {
    const date = new Date(NOW_MS - 60 * 60 * 1000).toISOString();
    // diffMinutes = 60 → not yesterday → diffHours = 1
    expect(formatRelativeTime(date)).toBe("Il y a 1 heure");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SORT — sortNotifications
// ─────────────────────────────────────────────────────────────────────────────

describe("sortNotifications", () => {
  const recent = "2026-06-03T14:00:00Z";
  const older  = "2026-06-03T12:00:00Z";
  const oldest = "2026-06-03T10:00:00Z";

  /**
   * SORT-01 — critique avant standard
   */
  it("SORT-01 critique non lu avant standard non lu", () => {
    const input = [
      makeNotif({ id: 1, object: "Validation mensuelle", createdAt: recent }),
      makeNotif({ id: 2, object: "[CRITIQUE] Alice — Cardio", createdAt: older }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].object).toContain("[CRITIQUE]");
    expect(sorted[1].object).toBe("Validation mensuelle");
  });

  /**
   * SORT-02 — warning avant standard
   */
  it("SORT-02 avertissement non lu avant standard non lu", () => {
    const input = [
      makeNotif({ id: 1, object: "Export terminé", createdAt: recent }),
      makeNotif({ id: 2, object: "[AVERTISSEMENT] Bob — Cardio", createdAt: older }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].object).toContain("[AVERTISSEMENT]");
    expect(sorted[1].object).toBe("Export terminé");
  });

  /**
   * SORT-03 — critique avant warning
   */
  it("SORT-03 critique avant avertissement", () => {
    const input = [
      makeNotif({ id: 1, object: "[AVERTISSEMENT] Bob — Cardio", createdAt: recent }),
      makeNotif({ id: 2, object: "[CRITIQUE] Alice — Cardio", createdAt: older }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].object).toContain("[CRITIQUE]");
    expect(sorted[1].object).toContain("[AVERTISSEMENT]");
  });

  /**
   * SORT-04 — deux critiques → le plus récent en premier
   */
  it("SORT-04 deux critiques → plus récent en premier", () => {
    const input = [
      makeNotif({ id: 1, object: "[CRITIQUE] Alice", createdAt: older }),
      makeNotif({ id: 2, object: "[CRITIQUE] Bob",   createdAt: recent }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].id).toBe(2); // Bob est plus récent
    expect(sorted[1].id).toBe(1);
  });

  /**
   * SORT-05 — notifications lues → en dessous de toutes les non-lues
   */
  it("SORT-05 notification lue reste sous les non-lues", () => {
    const input = [
      makeNotif({ id: 1, object: "[CRITIQUE] Alice (lue)", read: true,  createdAt: recent }),
      makeNotif({ id: 2, object: "Standard non lue",       read: false, createdAt: oldest }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].read).toBe(false);
    expect(sorted[1].read).toBe(true);
  });

  /**
   * SORT-06 — standards non lues → plus récente en premier
   */
  it("SORT-06 standards → plus récente en premier", () => {
    const input = [
      makeNotif({ id: 1, object: "Standard ancienne", createdAt: oldest }),
      makeNotif({ id: 2, object: "Standard récente",  createdAt: recent }),
    ];
    const sorted = sortNotifications(input);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  /**
   * SORT-07 — tableau vide → tableau vide
   */
  it("SORT-07 tableau vide → tableau vide", () => {
    expect(sortNotifications([])).toEqual([]);
  });

  /**
   * SORT-08 — ne mute pas le tableau source
   */
  it("SORT-08 ne mute pas le tableau d'entrée", () => {
    const input = [
      makeNotif({ id: 1, object: "B", createdAt: older  }),
      makeNotif({ id: 2, object: "A", createdAt: recent }),
    ];
    const originalFirst = input[0].id;
    sortNotifications(input);
    expect(input[0].id).toBe(originalFirst);
  });
});
