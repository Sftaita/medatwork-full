import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import {
  timeStrToDecimal,
  decimalToTimeStr,
  fmtHM,
  fmtDuration,
  serverToLocal,
  isValidColor,
  type ServerTemplate,
} from './types';
import WeekTotals from './WeekTotals';
import DescriptionEditor from './DescriptionEditor';
import type { Slot } from './types';

// ── types.ts utilities ────────────────────────────────────────────────────────

describe('timeStrToDecimal', () => {
  it('converts "08:30" to 8.5', () => expect(timeStrToDecimal('08:30')).toBe(8.5));
  it('converts "6:00" to 6', ()  => expect(timeStrToDecimal('6:00')).toBe(6));
  it('converts "23:45" to 23.75', () => expect(timeStrToDecimal('23:45')).toBeCloseTo(23.75));
});

describe('decimalToTimeStr', () => {
  it('converts 8.5 to "08:30"', () => expect(decimalToTimeStr(8.5)).toBe('08:30'));
  it('converts 6 to "06:00"',   () => expect(decimalToTimeStr(6)).toBe('06:00'));
  it('converts 23.75 to "23:45"', () => expect(decimalToTimeStr(23.75)).toBe('23:45'));
});

describe('fmtHM', () => {
  it('formats 9 as "09:00"',  () => expect(fmtHM(9)).toBe('09:00'));
  it('formats 8.5 as "08:30"', () => expect(fmtHM(8.5)).toBe('08:30'));
});

describe('fmtDuration', () => {
  it('formats 2 as "2h"',    () => expect(fmtDuration(2)).toBe('2h'));
  it('formats 1.5 as "1h30"', () => expect(fmtDuration(1.5)).toBe('1h30'));
  it('formats 0.25 as "0h15"', () => expect(fmtDuration(0.25)).toBe('0h15'));
});

describe('isValidColor', () => {
  it('accepts valid colors',   () => expect(isValidColor('violet')).toBe(true));
  it('rejects unknown values', () => expect(isValidColor('red')).toBe(false));
  it('rejects null/undefined', () => expect(isValidColor(null)).toBe(false));
});

describe('serverToLocal — color|description parsing', () => {
  const base: ServerTemplate = {
    id: 1, title: 'Test', description: null, color: null,
    canEdit: true, canShare: false, weekTaskList: [],
  };

  it('empty weekTaskList → empty slots', () => {
    const tpl = serverToLocal(base);
    expect(Object.values(tpl.slots).flat()).toHaveLength(0);
  });

  it('parses old format (color only)', () => {
    const tpl = serverToLocal({
      ...base,
      weekTaskList: [{
        id: 10, title: 'Accueil', description: 'teal',
        dayOfWeek: 1, startTime: '08:00', endTime: '12:00', weekTemplateId: 1,
      }],
    });
    const slot = tpl.slots['mon'][0];
    expect(slot.color).toBe('teal');
    expect(slot.description).toBe('');
  });

  it('parses new format (color|description)', () => {
    const tpl = serverToLocal({
      ...base,
      weekTaskList: [{
        id: 11, title: 'Garde', description: 'rose|Poste de nuit',
        dayOfWeek: 3, startTime: '20:00', endTime: '08:00', weekTemplateId: 1,
      }],
    });
    const slot = tpl.slots['wed'][0];
    expect(slot.color).toBe('rose');
    expect(slot.description).toBe('Poste de nuit');
  });

  it('falls back to violet for unknown color', () => {
    const tpl = serverToLocal({
      ...base,
      weekTaskList: [{
        id: 12, title: 'Test', description: 'unknown|some text',
        dayOfWeek: 2, startTime: '09:00', endTime: '17:00', weekTemplateId: 1,
      }],
    });
    expect(tpl.slots['tue'][0].color).toBe('violet');
  });

  it('sorts slots by start time within a day', () => {
    const tpl = serverToLocal({
      ...base,
      weekTaskList: [
        { id: 20, title: 'Après-midi', description: 'blue', dayOfWeek: 1, startTime: '14:00', endTime: '18:00', weekTemplateId: 1 },
        { id: 21, title: 'Matin',      description: 'blue', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', weekTemplateId: 1 },
      ],
    });
    const mon = tpl.slots['mon'];
    expect(mon[0].name).toBe('Matin');
    expect(mon[1].name).toBe('Après-midi');
  });
});

// ── WeekTotals ────────────────────────────────────────────────────────────────

const ALL_DAYS_SUBSET = [
  { key: 'mon', name: 'Lundi', dayOfWeek: 1 },
  { key: 'tue', name: 'Mardi', dayOfWeek: 2 },
];

const makeSlot = (start: number, end: number): Slot => ({
  localId: `s-${Math.random()}`, name: '', start, end, color: 'violet', description: '',
});

describe('WeekTotals', () => {
  it('shows "—" when no slots', () => {
    render(<WeekTotals days={ALL_DAYS_SUBSET} slotsByDay={{ mon: [], tue: [] }} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays correct total duration', () => {
    render(
      <WeekTotals
        days={ALL_DAYS_SUBSET}
        slotsByDay={{ mon: [makeSlot(8, 12)], tue: [makeSlot(9, 17)] }}
      />
    );
    // 4h lundi + 8h mardi = 12h total
    expect(screen.getByText('12h')).toBeInTheDocument();
  });
});

// ── DescriptionEditor ─────────────────────────────────────────────────────────

describe('DescriptionEditor', () => {
  it('shows empty-state message when no slot selected', () => {
    render(<DescriptionEditor slot={null} onChange={vi.fn()} />);
    expect(screen.getByText(/Sélectionnez un poste/i)).toBeInTheDocument();
  });

  it('shows slot name and textarea when slot is selected', () => {
    const slot: Slot = { localId: 'x', name: 'Garde nuit', start: 20, end: 8, color: 'rose', description: 'desc' };
    render(<DescriptionEditor slot={slot} onChange={vi.fn()} />);
    expect(screen.getByText('Garde nuit')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('desc');
  });

  it('calls onChange when text changes', () => {
    const onChange = vi.fn();
    const slot: Slot = { localId: 'y', name: 'Accueil', start: 8, end: 12, color: 'teal', description: '' };
    render(<DescriptionEditor slot={slot} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nouveau texte' } });
    expect(onChange).toHaveBeenCalledWith('Nouveau texte');
  });
});
