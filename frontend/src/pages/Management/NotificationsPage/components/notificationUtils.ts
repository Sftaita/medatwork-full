import dayjs from "@/lib/dayjs";
import type { Notification } from "@/types/entities";

// ── QW-6 : Formatage de date relative ─────────────────────────────────────────

/**
 * Transforme un horodatage ISO en texte relatif lisible en français.
 *
 * Logique :
 *   < 1 min   → "À l'instant"
 *   < 60 min  → "Il y a N minute(s)"
 *   Hier      → "Hier à HH:mm"  (prioritaire sur le test <24h)
 *   < 24h     → "Il y a N heure(s)"
 *   Sinon     → "DD/MM/YYYY à HH:mm"
 */
export function formatRelativeTime(createdAt: string | null | undefined): string {
  if (!createdAt) return "";

  const date = dayjs(createdAt);
  if (!date.isValid()) return "";

  const now         = dayjs();
  const diffMinutes = now.diff(date, "minute");

  if (diffMinutes < 1)  return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;

  // "Hier" vérifié AVANT le test <24h pour couvrir le cas "23h ago = hier"
  const yesterday = now.subtract(1, "day");
  if (date.isSame(yesterday, "day")) {
    return `Hier à ${date.format("HH:mm")}`;
  }

  const diffHours = now.diff(date, "hour");
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;

  return date.format("DD/MM/YYYY à HH:mm");
}

// ── QW-7 : Tri intelligent ────────────────────────────────────────────────────

const PREFIX_CRITICAL    = "[CRITIQUE]";
const PREFIX_WARNING     = "[AVERTISSEMENT]";

/**
 * Retourne la priorité d'affichage d'une notification.
 *   0 = CRITIQUE non lue   (en tête)
 *   1 = AVERTISSEMENT non lue
 *   2 = standard non lue
 * 100 = lue (en bas)
 */
function notifPriority(n: Notification): number {
  if (n.read) return 100;
  if (n.object.startsWith(PREFIX_CRITICAL)) return 0;
  if (n.object.startsWith(PREFIX_WARNING))  return 1;
  return 2;
}

/**
 * Tri des notifications :
 *   1. CRITIQUE non lues
 *   2. AVERTISSEMENT non lues
 *   3. Standards non lues
 *   4. Lues
 * À priorité égale : plus récent en premier.
 *
 * Pure function — ne mute pas le tableau source.
 */
export function sortNotifications(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => {
    const pa = notifPriority(a);
    const pb = notifPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
