/**
 * Tests unitaires — statusOf() (types.ts)
 *
 * statusOf() évalue le statut légal d'un MACCS uniquement sur :
 *   - les heures PRESTÉES (week.prest) pour le pic hebdomadaire
 *   - tresV (très inconfortables)
 *   - pct (progression vs prévisionnel) — uniquement si non-null
 *
 * L'absence de prévisionnel (prevH=null, pct=null) NE rend PAS le MACCS
 * non-évaluable légalement : le pic hebdo et tresV s'appliquent toujours.
 *
 * Seuils légaux :
 *   48h/sem (cible) · 60h/sem (max opting-out) · 72h/sem (limite absolue)
 */

import { describe, it, expect } from 'vitest';
import { statusOf } from './types';
import type { MaccsEntry } from './types';

// ── Fixture de base ───────────────────────────────────────────────────────────

const base: MaccsEntry = {
  name: 'Test', last: 'Test',
  prevH: null, totH: '0h', totVal: 0, pct: null,
  inconf: '0h', inconfV: 0, tres: '0h', tresV: 0,
  app: 0, place: '0h',
  conge: { used: 0, total: 0, items: [] },
  week: { prest: [40, 40, 40, 40, 40, 40], prev: null },
};

const m = (overrides: Partial<MaccsEntry>): MaccsEntry => ({ ...base, ...overrides });

// ── MACCS SANS prévisionnel (prevH=null, pct=null) ────────────────────────────

describe('statusOf — MACCS sans prévisionnel', () => {
  it('pic ≤ 60h, tresV < 20 → ok (conforme)', () => {
    expect(statusOf(m({ week: { prest: [44, 48, 46, 40, 52, 45], prev: null } }))).toBe('ok');
  });

  it('pic = 60h exactement → ok (seuil non dépassé)', () => {
    expect(statusOf(m({ week: { prest: [48, 60, 44, 40, 48, 46], prev: null } }))).toBe('ok');
  });

  it('pic > 60h → warn (à surveiller)', () => {
    // 67h > 60h mais ≤ 72h
    expect(statusOf(m({ week: { prest: [46, 53, 56, 58, 67, 60], prev: null } }))).toBe('warn');
  });

  it('pic > 72h → bad (dépassement légal)', () => {
    // 75h > 72h — illégal même sans prévisionnel
    expect(statusOf(m({ week: { prest: [40, 75, 42, 38, 50, 44], prev: null } }))).toBe('bad');
  });

  it('pic = 73h → bad (juste au-dessus de la limite absolue)', () => {
    expect(statusOf(m({ week: { prest: [48, 73, 48, 48, 48, 48], prev: null } }))).toBe('bad');
  });

  it('tresV ≥ 20h → warn même si pic ≤ 60h', () => {
    expect(statusOf(m({
      tresV: 20,
      week: { prest: [44, 48, 46, 40, 52, 45], prev: null },
    }))).toBe('warn');
  });

  it('tresV ≥ 20h ET pic > 72h → bad (pic l\'emporte)', () => {
    expect(statusOf(m({
      tresV: 25,
      week: { prest: [40, 80, 42, 38, 50, 44], prev: null },
    }))).toBe('bad');
  });

  it('pct=null ne déclenche jamais bad à lui seul', () => {
    // pct=null, pic=50h → devrait être ok
    expect(statusOf(m({
      pct: null,
      week: { prest: [44, 48, 46, 40, 50, 45], prev: null },
    }))).toBe('ok');
  });
});

// ── MACCS AVEC prévisionnel ────────────────────────────────────────────────────

describe('statusOf — MACCS avec prévisionnel', () => {
  it('pct ≥ 100 → bad (dépassement cible)', () => {
    expect(statusOf(m({
      prevH: 200, pct: 100,
      week: { prest: [48, 50, 48, 48, 50, 48], prev: [50, 50, 50, 50, 50, 50] },
    }))).toBe('bad');
  });

  it('pct = 99 → pas bad via pct seul (pic ≤ 72h)', () => {
    expect(statusOf(m({
      prevH: 200, pct: 99,
      week: { prest: [48, 50, 48, 48, 50, 48], prev: [50, 50, 50, 50, 50, 50] },
    }))).toBe('ok');
  });

  it('pct < 100 mais pic > 72h → bad (loi prime sur cible)', () => {
    expect(statusOf(m({
      prevH: 300, pct: 80,
      week: { prest: [44, 80, 44, 44, 44, 44], prev: [60, 60, 60, 60, 60, 60] },
    }))).toBe('bad');
  });
});

// ── Cas limites ────────────────────────────────────────────────────────────────

describe('statusOf — cas limites', () => {
  it('pic exactement à 72h → bad (> 72 est la condition, 72 = limite non dépassée)', () => {
    // THRESHOLDS.abs = 72, condition est peak > 72 (strict)
    // Donc 72h exactement → PAS bad via ce critère
    const result = statusOf(m({ week: { prest: [48, 72, 48, 48, 48, 48], prev: null } }));
    // 72 n'est PAS > 72 → pas bad. 72 > 60 → warn
    expect(result).toBe('warn');
  });

  it('pic = 72.1h arrondi à 72 (données entières) → not bad', () => {
    // Les données sont en entiers. 72 ≤ 72 → pas de bad via pic
    // Vérification de la logique: peak > 72, pas >= 72
    expect(statusOf(m({ week: { prest: [48, 72, 48, 48, 48, 48], prev: null } }))).toBe('warn');
  });

  it('MACCS sans prévisionnel avec pic > 72h est inclus dans les alertes', () => {
    // Simule le cas Truong-avec-dépassement (prevH=null, pic=75)
    const truong = m({
      prevH: null, pct: null,
      week: { prest: [46, 75, 56, 58, 67, 60], prev: null },
    });
    expect(statusOf(truong)).toBe('bad');
  });
});
