export interface CongeItem {
  nm: string;
  a: number;
  b: number;
}

export interface MaccsEntry {
  name: string;
  last: string;
  prevH: number | null;
  totH: string;
  totVal: number;
  pct: number | null;
  inconf: string;
  inconfV: number;
  tres: string;
  tresV: number;
  app: number;
  place: string;
  conge: {
    used: number;
    total: number;
    items: CongeItem[];
  };
  week: {
    prest: number[];
    prev: number[] | null;
  };
}

export type MaccsStatus = 'ok' | 'warn' | 'bad';

export const THRESHOLDS = { cible: 48, max: 60, abs: 72 } as const;

export const SERIES_COLORS: Record<string, string> = {
  Dorenlot: '#7B3FA0',
  Manicone: '#2A6FDB',
  Manon:    '#2f9e5b',
  Michel:   '#d6483f',
  Truong:   '#e0823c',
  Zerouali: '#1f9b8e',
};

export const FALLBACK_AV_COLORS = [
  '#7B3FA0', '#2A6FDB', '#2f9e5b', '#d6483f', '#e0823c', '#1f9b8e',
];

export function statusOf(m: MaccsEntry): MaccsStatus {
  const peak = Math.max(...m.week.prest);
  if ((m.pct !== null && m.pct >= 100) || peak > THRESHOLDS.abs) return 'bad';
  if (m.tresV >= 20 || peak > THRESHOLDS.max) return 'warn';
  return 'ok';
}

export function maccsInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
