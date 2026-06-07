/**
 * Tests unitaires — fonctions helpers exportées de General.tsx
 *
 * Couverture :
 *   — isEligibleForValidation
 *   — matchesFilter (avec la logique d'éligibilité)
 *   — hasLegalAlert, legalAlertCount
 */

import { describe, it, expect } from 'vitest';
import {
  isEligibleForValidation,
  matchesFilter,
  hasLegalAlert,
  legalAlertCount,
  type ResidentReport,
} from './General';

// ── Factories ─────────────────────────────────────────────────────────────────

function makeReport(overrides: Partial<ResidentReport> = {}): ResidentReport {
  return {
    residentId:        1,
    residentFirstname: 'Alice',
    residentLastname:  'Martin',
    accountActivated:  true,
    hasActivity:       true,
    validationInformation: { validated: false },
    optingOut:      false,
    limits:         { limit: 48, highLimit: 60 },
    periodsinfo:    [],
    smoothedHours:  true,
    warningHours:   {},
    IllegalHours:   {},
    callable:       0,
    hospital:       0,
    shiftOverlap:   0,
    daysOfLeaves:   {},
    warnings:       [],
    ...overrides,
  };
}

const VALIDATED_ENTRY = { residentId: 1, status: 'validate' as const, managerComment: '', residentNotification: '' };
const INVALIDATED_ENTRY = { residentId: 1, status: 'invalidate' as const, managerComment: '', residentNotification: '' };

// ── isEligibleForValidation ───────────────────────────────────────────────────

describe('isEligibleForValidation', () => {
  it('retourne true si accountActivated=true ET hasActivity=true', () => {
    expect(isEligibleForValidation(makeReport({ accountActivated: true, hasActivity: true }))).toBe(true);
  });

  it('retourne false si accountActivated=false (invitation envoyée)', () => {
    expect(isEligibleForValidation(makeReport({ accountActivated: false, hasActivity: true }))).toBe(false);
  });

  it('retourne false si hasActivity=false (aucun encodage)', () => {
    expect(isEligibleForValidation(makeReport({ accountActivated: true, hasActivity: false }))).toBe(false);
  });

  it('retourne false si les deux sont false', () => {
    expect(isEligibleForValidation(makeReport({ accountActivated: false, hasActivity: false }))).toBe(false);
  });

  it('retourne false si accountActivated est undefined (champ absent du backend)', () => {
    const r = makeReport();
    delete (r as Partial<ResidentReport>).accountActivated;
    expect(isEligibleForValidation(r)).toBe(false);
  });
});

// ── matchesFilter — filtre "all" ──────────────────────────────────────────────

describe('matchesFilter — filtre "all"', () => {
  it('inclut un résident éligible', () => {
    expect(matchesFilter(makeReport(), 'all', [])).toBe(true);
  });

  it('inclut un résident invité dans le filtre "all"', () => {
    expect(matchesFilter(makeReport({ accountActivated: false }), 'all', [])).toBe(true);
  });

  it('inclut un résident sans encodage dans le filtre "all"', () => {
    expect(matchesFilter(makeReport({ hasActivity: false }), 'all', [])).toBe(true);
  });
});

// ── matchesFilter — filtre "todo" ─────────────────────────────────────────────

describe('matchesFilter — filtre "todo"', () => {
  it('inclut un résident éligible non validé', () => {
    expect(matchesFilter(makeReport(), 'todo', [INVALIDATED_ENTRY])).toBe(true);
  });

  it('exclut un résident éligible déjà validé', () => {
    expect(matchesFilter(makeReport(), 'todo', [VALIDATED_ENTRY])).toBe(false);
  });

  it('exclut un résident invité (non-éligible) même si non validé', () => {
    expect(matchesFilter(makeReport({ accountActivated: false }), 'todo', [INVALIDATED_ENTRY])).toBe(false);
  });

  it('exclut un résident sans encodage du filtre "todo"', () => {
    expect(matchesFilter(makeReport({ hasActivity: false }), 'todo', [INVALIDATED_ENTRY])).toBe(false);
  });
});

// ── matchesFilter — filtre "done" ─────────────────────────────────────────────

describe('matchesFilter — filtre "done"', () => {
  it('inclut un résident éligible validé', () => {
    expect(matchesFilter(makeReport(), 'done', [VALIDATED_ENTRY])).toBe(true);
  });

  it('exclut un résident éligible non validé', () => {
    expect(matchesFilter(makeReport(), 'done', [INVALIDATED_ENTRY])).toBe(false);
  });

  it('exclut un résident invité même si son entrée indique validate', () => {
    expect(matchesFilter(makeReport({ accountActivated: false }), 'done', [VALIDATED_ENTRY])).toBe(false);
  });

  it('exclut un résident sans encodage du filtre "done"', () => {
    expect(matchesFilter(makeReport({ hasActivity: false }), 'done', [VALIDATED_ENTRY])).toBe(false);
  });
});

// ── matchesFilter — filtre "alert" ────────────────────────────────────────────

const LEGAL_WARNING = { warningType: 'maxLimit' as const, NumberOfHours: 65, week: 1 };

describe('matchesFilter — filtre "alert"', () => {
  it('inclut un résident éligible avec alerte légale', () => {
    const r = makeReport({ warnings: [LEGAL_WARNING] });
    expect(matchesFilter(r, 'alert', [])).toBe(true);
  });

  it('exclut un résident éligible sans alerte légale', () => {
    expect(matchesFilter(makeReport({ warnings: [] }), 'alert', [])).toBe(false);
  });

  it('exclut un résident invité même avec alerte', () => {
    const r = makeReport({ accountActivated: false, warnings: [LEGAL_WARNING] });
    expect(matchesFilter(r, 'alert', [])).toBe(false);
  });

  it('exclut un résident sans encodage du filtre "alert"', () => {
    const r = makeReport({ hasActivity: false, warnings: [LEGAL_WARNING] });
    expect(matchesFilter(r, 'alert', [])).toBe(false);
  });
});

// ── hasLegalAlert / legalAlertCount ──────────────────────────────────────────

describe('hasLegalAlert', () => {
  it('retourne false pour un tableau vide', () => {
    expect(hasLegalAlert([])).toBe(false);
  });

  it('retourne false pour uniquement des alertes minLimit', () => {
    expect(hasLegalAlert([{ warningType: 'minLimit' }])).toBe(false);
  });

  it('retourne true pour maxLimit', () => {
    expect(hasLegalAlert([{ warningType: 'maxLimit' }])).toBe(true);
  });

  it('retourne true pour overruns', () => {
    expect(hasLegalAlert([{ warningType: 'overruns' }])).toBe(true);
  });
});

describe('legalAlertCount', () => {
  it('retourne 0 pour un tableau vide', () => {
    expect(legalAlertCount([])).toBe(0);
  });

  it('ignore les minLimit', () => {
    expect(legalAlertCount([{ warningType: 'minLimit' }, { warningType: 'maxLimit' }])).toBe(1);
  });
});
