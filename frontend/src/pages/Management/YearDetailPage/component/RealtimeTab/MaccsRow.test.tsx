/**
 * Tests — MaccsRow.tsx (onglet Temps réel)
 *
 * Couverture :
 *   — Dimension Activité  : hasActivity true / false / absent (fallback)
 *   — Dimension Workflow  : validated true / false / absent (fallback)
 *   — Coexistence des 3 dimensions : Activité + Workflow + Conformité indépendants
 *   — Régression : statusOf() inchangé (Conforme / Dépassement / À surveiller)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaccsRow from './MaccsRow';
import type { MaccsEntry } from './types';

// ── Mocks composants enfants ──────────────────────────────────────────────────

vi.mock('./BarChart',      () => ({ default: () => <div data-testid="bar-chart" /> }));
vi.mock('./ViolationModal', () => ({ default: () => null }));

// ── Fixture de base ───────────────────────────────────────────────────────────

// pct=75 < 100, pic=44h ≤ 60h → statusOf() = 'ok' (Conforme)
const BASE_ENTRY: MaccsEntry = {
  name: 'Test MACCS', last: 'Test',
  prevH: 200, totH: '150h', totVal: 150, pct: 75,
  inconf: '20h', inconfV: 20, tres: '5h', tresV: 5,
  app: 0, place: '0h',
  conge: { used: 2, total: 30, items: [] },
  week: { prest: [40, 42, 38, 44, 40, 36], prev: [45, 45, 45, 45, 45, 45] },
  // hasActivity, validated, accountActivated NOT présents → couvre le cas "absent"
};

function makeEntry(overrides: Partial<MaccsEntry>): MaccsEntry {
  return { ...BASE_ENTRY, ...overrides };
}

function renderRow(entry: MaccsEntry) {
  return render(
    <MaccsRow
      entry={entry}
      colorIndex={0}
      weeks={['S1', 'S2', 'S3', 'S4', 'S5', 'S6']}
      onGoToSchedule={() => {}}
    />
  );
}

// ── Dimension Activité ────────────────────────────────────────────────────────

describe('MaccsRow — dimension Activité', () => {
  it('hasActivity=true → chip "Données encodées"', () => {
    renderRow(makeEntry({ hasActivity: true }));
    expect(screen.getByTestId('activity-Test')).toHaveTextContent('Données encodées');
  });

  it('hasActivity=false → chip "Aucun encodage"', () => {
    renderRow(makeEntry({ hasActivity: false }));
    expect(screen.getByTestId('activity-Test')).toHaveTextContent('Aucun encodage');
  });

  it('hasActivity absent → fallback "Données encodées" (pas de faux "Aucun encodage" en prod)', () => {
    // BASE_ENTRY n'a pas de champ hasActivity → undefined → fallback true
    renderRow(makeEntry({}));
    expect(screen.getByTestId('activity-Test')).toHaveTextContent('Données encodées');
    expect(screen.getByTestId('activity-Test')).not.toHaveTextContent('Aucun encodage');
  });
});

// ── Dimension Workflow ────────────────────────────────────────────────────────

describe('MaccsRow — dimension Workflow', () => {
  it('validated=true → chip "Validé"', () => {
    renderRow(makeEntry({ validated: true }));
    expect(screen.getByTestId('workflow-Test')).toHaveTextContent('Validé');
  });

  it('validated=false → chip "À valider"', () => {
    renderRow(makeEntry({ validated: false }));
    expect(screen.getByTestId('workflow-Test')).toHaveTextContent('À valider');
  });

  it('validated absent → fallback "À valider" (pas de faux "Validé" en prod)', () => {
    // BASE_ENTRY n'a pas de champ validated → undefined → fallback false
    renderRow(makeEntry({}));
    expect(screen.getByTestId('workflow-Test')).toHaveTextContent('À valider');
    expect(screen.getByTestId('workflow-Test')).not.toHaveTextContent('Validé');
  });
});

// ── Coexistence Activité + Workflow + Conformité ───────────────────────────────

describe('MaccsRow — coexistence des 3 dimensions', () => {
  it('"Données encodées" et "Dépassement" (bad) coexistent', () => {
    // pct=100 → statusOf() = 'bad'
    renderRow(makeEntry({ hasActivity: true, pct: 100 }));
    expect(screen.getByTestId('activity-Test')).toHaveTextContent('Données encodées');
    expect(screen.getByTestId('status-Test'  )).toHaveTextContent('Dépassement');
  });

  it('"Aucun encodage" et "Conforme" (ok) coexistent', () => {
    // BASE_ENTRY : pic=44h ≤ 60h, pct=75 < 100 → ok
    renderRow(makeEntry({ hasActivity: false }));
    expect(screen.getByTestId('activity-Test')).toHaveTextContent('Aucun encodage');
    expect(screen.getByTestId('status-Test'  )).toHaveTextContent('Conforme');
  });

  it('"Validé" et "Conforme" (ok) coexistent', () => {
    renderRow(makeEntry({ validated: true }));
    expect(screen.getByTestId('workflow-Test')).toHaveTextContent('Validé');
    expect(screen.getByTestId('status-Test'  )).toHaveTextContent('Conforme');
  });

  it('"À valider" et "Dépassement" (bad) coexistent', () => {
    renderRow(makeEntry({ validated: false, pct: 100 }));
    expect(screen.getByTestId('workflow-Test')).toHaveTextContent('À valider');
    expect(screen.getByTestId('status-Test'  )).toHaveTextContent('Dépassement');
  });

  it('les 3 chips (activité, workflow, conformité) sont tous rendus simultanément', () => {
    renderRow(makeEntry({ hasActivity: true, validated: true }));
    expect(screen.getByTestId('activity-Test')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-Test')).toBeInTheDocument();
    expect(screen.getByTestId('status-Test'  )).toBeInTheDocument();
  });
});

// ── Régression statusOf() ─────────────────────────────────────────────────────

describe('MaccsRow — régression statusOf() (inchangé)', () => {
  it('pic ≤ 60h, pct < 100 → Conforme (ok)', () => {
    // BASE_ENTRY : pic=44, pct=75
    renderRow(makeEntry({}));
    expect(screen.getByTestId('status-Test')).toHaveTextContent('Conforme');
  });

  it('pct = 100 → Dépassement (bad)', () => {
    renderRow(makeEntry({ pct: 100 }));
    expect(screen.getByTestId('status-Test')).toHaveTextContent('Dépassement');
  });

  it('pic > 60h et ≤ 72h → À surveiller (warn)', () => {
    renderRow(makeEntry({
      pct: null, prevH: null,
      week: { prest: [46, 65, 42, 38, 50, 44], prev: null },
    }));
    expect(screen.getByTestId('status-Test')).toHaveTextContent('À surveiller');
  });

  it('pic > 72h → Dépassement (bad)', () => {
    renderRow(makeEntry({
      pct: null, prevH: null,
      week: { prest: [44, 80, 42, 38, 50, 44], prev: null },
    }));
    expect(screen.getByTestId('status-Test')).toHaveTextContent('Dépassement');
  });

  it('hasActivity et validated ne modifient PAS statusOf()', () => {
    // Même entrée avec ou sans ces champs → même statut
    renderRow(makeEntry({ hasActivity: false, validated: true, pct: 75 }));
    expect(screen.getByTestId('status-Test')).toHaveTextContent('Conforme');
  });
});
