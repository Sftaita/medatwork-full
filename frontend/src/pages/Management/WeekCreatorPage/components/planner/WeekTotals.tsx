import React, { CSSProperties } from 'react';
import { Slot, DayDef, fmtDuration } from './types';

const WEEKLY_GOAL = 48;
const WEEKLY_MAX = 72;

const S: Record<string, CSSProperties> = {
  wrap: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: 16,
    boxShadow: '0 4px 12px rgba(15,17,21,0.04)',
  },
  title: {
    fontSize: 10.5, fontWeight: 600, color: '#94a3b8',
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
  },
  big: { display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 },
  bigVal: {
    fontSize: 30, fontWeight: 700, color: '#7e22ce',
    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
  },
  bigUnit: { fontSize: 13, fontWeight: 500, color: '#64748b' },
  bar: {
    height: 5, background: '#f1f5f9', borderRadius: 999,
    overflow: 'hidden', marginTop: 7, marginBottom: 7,
  },
  fill: { height: '100%', borderRadius: 999, transition: 'width .25s' },
  goalLine: {
    fontSize: 10.5, color: '#64748b',
    display: 'flex', justifyContent: 'space-between',
  },
  list: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  rowItem: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', fontSize: 12,
  },
  dayLabel: { color: '#334155', fontWeight: 500, minWidth: 72 },
  hourVal: { color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: 36, textAlign: 'right' },
  miniBar: {
    flex: 1, margin: '0 10px', height: 4,
    background: '#f1f5f9', borderRadius: 999, overflow: 'hidden',
  },
  miniFill: { height: '100%', background: '#a439b6', borderRadius: 999 },
};

interface Props {
  days: DayDef[];
  slotsByDay: Record<string, Slot[]>;
}

export default function WeekTotals({ days, slotsByDay }: Props) {
  const dayTotals: Record<string, number> = {};
  for (const d of days) {
    dayTotals[d.key] = (slotsByDay[d.key] ?? []).reduce((s, sl) => s + (sl.end - sl.start), 0);
  }
  const total = days.reduce((s, d) => s + dayTotals[d.key], 0);
  const pctGoal = Math.min(100, (total / WEEKLY_GOAL) * 100);
  const pctMax = Math.min(100, (total / WEEKLY_MAX) * 100);
  const maxDay = Math.max(...days.map(d => dayTotals[d.key]), 1);
  const overMax = total > WEEKLY_MAX;
  const overGoal = total > WEEKLY_GOAL;

  const fillBg = overMax
    ? 'linear-gradient(90deg, #f87171, #dc2626)'
    : overGoal
      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
      : 'linear-gradient(90deg, #c454c6, #a439b6)';

  return (
    <div style={S.wrap}>
      <div style={S.title}>Total semaine</div>

      <div style={S.big}>
        <div style={{ ...S.bigVal, color: overMax ? '#dc2626' : '#7e22ce' }}>
          {fmtDuration(total)}
        </div>
        <div style={S.bigUnit}>/ {WEEKLY_GOAL}h objectif</div>
      </div>

      <div style={S.bar}>
        <div style={{ ...S.fill, width: `${pctMax}%`, background: fillBg }} />
      </div>

      <div style={S.goalLine}>
        <span>{Math.round(pctGoal)}% de l'objectif</span>
        <span style={{ color: overMax ? '#dc2626' : '#64748b', fontWeight: overMax ? 600 : 500 }}>
          Max légal {WEEKLY_MAX}h
        </span>
      </div>

      <div style={S.list}>
        {days.map(d => {
          const v = dayTotals[d.key];
          return (
            <div key={d.key} style={S.rowItem}>
              <span style={S.dayLabel}>{d.name}</span>
              <div style={S.miniBar}>
                <div style={{ ...S.miniFill, width: `${(v / maxDay) * 100}%` }} />
              </div>
              <span style={S.hourVal as CSSProperties}>{v === 0 ? '—' : fmtDuration(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
