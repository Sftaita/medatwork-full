export type SlotColor = 'violet' | 'blue' | 'teal' | 'amber' | 'rose' | 'slate';

export interface Slot {
  localId: string;
  serverId?: number;
  name: string;
  start: number; // decimal hours, e.g. 8.5 = 08:30
  end: number;
  color: SlotColor;
  description: string;
}

export interface DayDef {
  key: string;
  name: string;
  dayOfWeek: number; // 1=Mon … 7=Sun
}

export const ALL_DAYS: DayDef[] = [
  { key: 'mon', name: 'Lundi',    dayOfWeek: 1 },
  { key: 'tue', name: 'Mardi',    dayOfWeek: 2 },
  { key: 'wed', name: 'Mercredi', dayOfWeek: 3 },
  { key: 'thu', name: 'Jeudi',    dayOfWeek: 4 },
  { key: 'fri', name: 'Vendredi', dayOfWeek: 5 },
  { key: 'sat', name: 'Samedi',   dayOfWeek: 6 },
  { key: 'sun', name: 'Dimanche', dayOfWeek: 7 },
];

export const WEEKEND_KEYS = new Set(['sat', 'sun']);

/** LocalTemplate stores mutable name + description + all slots keyed by dayKey */
export interface LocalTemplate {
  id: number;
  name: string;
  description: string;
  /** dayKey → Slot[] */
  slots: Record<string, Slot[]>;
}

/** Raw shape returned by GET managers/allweekTemplates */
export interface ServerTemplate {
  id: number;
  title: string;
  description: string | null;
  color: string | null;
  canEdit: boolean;
  canShare: boolean;
  weekTaskList: ServerTask[];
}

export interface ServerTask {
  id: number;
  title: string;
  description: string | null; // stores color
  dayOfWeek: number;
  startTime: string; // "H:i" e.g. "8:30" or "08:30"
  endTime: string;
  weekTemplateId: number;
}

// ── Color palette matching app purple #a439b6 ─────────────────────────────────

export const SLOT_COLORS: Record<SlotColor, { bg: string; ring: string }> = {
  violet: { bg: 'linear-gradient(135deg, #c454c6, #a439b6)', ring: '#7e1d8c' },
  blue:   { bg: 'linear-gradient(135deg, #60a5fa, #3b82f6)', ring: '#2563eb' },
  teal:   { bg: 'linear-gradient(135deg, #2dd4bf, #14b8a6)', ring: '#0d9488' },
  amber:  { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', ring: '#d97706' },
  rose:   { bg: 'linear-gradient(135deg, #fb7185, #f43f5e)', ring: '#e11d48' },
  slate:  { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', ring: '#475569' },
};

export const COLOR_NAMES: SlotColor[] = ['violet', 'blue', 'teal', 'amber', 'rose', 'slate'];

// ── Utilities ─────────────────────────────────────────────────────────────────

export function fmtHM(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtDuration(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function timeStrToDecimal(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function decimalToTimeStr(d: number): string {
  const h = Math.floor(d);
  const m = Math.round((d - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isValidColor(c: string | null | undefined): c is SlotColor {
  return !!c && COLOR_NAMES.includes(c as SlotColor);
}

export type SyncStatus = 'idle' | 'saving' | 'error';

let _idCounter = 0;
export function newLocalId(): string {
  return `local-${Date.now()}-${++_idCounter}`;
}

/** Convert a ServerTemplate to a LocalTemplate */
export function serverToLocal(st: ServerTemplate): LocalTemplate {
  const slots: Record<string, Slot[]> = {};
  for (const day of ALL_DAYS) slots[day.key] = [];

  for (const task of st.weekTaskList) {
    const day = ALL_DAYS.find(d => d.dayOfWeek === task.dayOfWeek);
    if (!day) continue;
    // Format stocké : "color|description text" ou juste "color" (ancien format)
    const raw = task.description ?? '';
    const pipeIdx = raw.indexOf('|');
    let color: SlotColor = 'violet';
    let description = '';
    if (pipeIdx === -1) {
      color = isValidColor(raw) ? raw : 'violet';
    } else {
      const colorPart = raw.slice(0, pipeIdx);
      color = isValidColor(colorPart) ? colorPart : 'violet';
      description = raw.slice(pipeIdx + 1);
    }
    slots[day.key].push({
      localId: newLocalId(),
      serverId: task.id,
      name: task.title,
      start: timeStrToDecimal(task.startTime),
      end: timeStrToDecimal(task.endTime),
      color,
      description,
    });
  }
  // Sort each day's slots by start
  for (const key of Object.keys(slots)) {
    slots[key].sort((a, b) => a.start - b.start);
  }

  return { id: st.id, name: st.title, description: st.description ?? '', slots };
}
