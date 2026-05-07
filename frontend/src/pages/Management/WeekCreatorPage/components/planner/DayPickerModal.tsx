import React, { CSSProperties } from 'react';
import { DayDef, Slot } from './types';

const S: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,17,21,0.42)',
    display: 'grid', placeItems: 'center',
    zIndex: 200, backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff', borderRadius: 16,
    width: 'min(420px, 92vw)',
    boxShadow: '0 20px 50px rgba(15,17,21,0.18)', overflow: 'hidden',
  },
  header: { padding: '18px 22px 10px 22px', borderBottom: '1px solid #f1f5f9' },
  title: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, marginBottom: 3 },
  subtitle: { fontSize: 12, color: '#64748b', margin: 0 },
  selectAllRow: {
    display: 'flex', alignItems: 'center',
    padding: '5px 10px 10px 10px', margin: '0 22px',
    borderBottom: '1px solid #f1f5f9',
  },
  selectAll: {
    fontSize: 11, fontWeight: 600, color: '#7e22ce',
    background: 'transparent', border: 'none',
    cursor: 'pointer', padding: '3px 7px',
    letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'inherit',
  },
  body: { padding: '12px 22px 6px 22px', display: 'flex', flexDirection: 'column', gap: 3 },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px', borderRadius: 7,
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0f172a',
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    border: '1.5px solid #cbd5e1', display: 'grid', placeItems: 'center',
    background: '#fff', flexShrink: 0, transition: 'all .12s',
  },
  checkboxChecked: { background: '#a439b6', borderColor: '#a439b6', color: '#fff' },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 7,
    padding: '14px 22px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
  },
  cancel: {
    padding: '8px 14px', background: 'transparent', border: 'none',
    fontSize: 12, fontWeight: 500, color: '#334155', cursor: 'pointer',
    borderRadius: 7, fontFamily: 'inherit',
  },
  confirm: {
    padding: '8px 16px', background: '#a439b6', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  confirmDisabled: { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' },
};

function CheckIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 13 10 18 19 7" />
    </svg>
  );
}

export interface DayPickerModalState {
  open: boolean;
  sourceDay: string;
  sourceSlots: Slot[];
  mode: 'replace' | 'add';
  title?: string;
  subtitle?: string;
}

interface Props {
  state: DayPickerModalState;
  days: DayDef[];
  onCancel: () => void;
  onConfirm: (targetKeys: string[]) => void;
}

export default function DayPickerModal({ state, days, onCancel, onConfirm }: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (state.open) setSelected(new Set());
  }, [state.open, state.sourceDay]);

  if (!state.open) return null;

  const candidates = days.filter(d => d.key !== state.sourceDay);
  const allSelected = candidates.length > 0 && candidates.every(d => selected.has(d.key));

  const toggle = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(candidates.map(d => d.key)));
  };

  const sourceName = days.find(d => d.key === state.sourceDay)?.name ?? '';
  const count = state.sourceSlots.length;

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <h3 style={S.title}>{state.title ?? "Copier vers d'autres jours"}</h3>
          <p style={S.subtitle}>
            {sourceName && <><strong style={{ color: '#7e22ce' }}>{sourceName}</strong> ({count} poste{count > 1 ? 's' : ''}) · </>}
            {state.subtitle ?? 'Sélectionnez les jours cibles'}
          </p>
        </div>

        <div style={S.selectAllRow}>
          <button style={S.selectAll} onClick={toggleAll}>
            {allSelected ? '✕ Tout désélectionner' : '✓ Tout sélectionner'}
          </button>
        </div>

        <div style={S.body}>
          {candidates.map(day => {
            const checked = selected.has(day.key);
            return (
              <div
                key={day.key}
                style={{ ...S.row, ...(checked ? { background: '#faf5ff' } : undefined) }}
                onClick={() => toggle(day.key)}
              >
                <div style={{ ...S.checkbox, ...(checked ? S.checkboxChecked : undefined) }}>
                  {checked && <CheckIcon />}
                </div>
                <span>{day.name}</span>
              </div>
            );
          })}
        </div>

        <div style={S.footer}>
          <button style={S.cancel} onClick={onCancel}>Annuler</button>
          <button
            style={{ ...S.confirm, ...(selected.size === 0 ? S.confirmDisabled : undefined) }}
            disabled={selected.size === 0}
            onClick={() => onConfirm([...selected])}
          >
            {state.mode === 'replace'
              ? `Remplacer ${selected.size} jour${selected.size > 1 ? 's' : ''}`
              : `Copier vers ${selected.size} jour${selected.size > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
