import React, { CSSProperties } from 'react';
import { Slot, DayDef, SLOT_COLORS, COLOR_NAMES, decimalToTimeStr, timeStrToDecimal } from './types';

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
  field: { marginBottom: 12 },
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b',
    marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  input: {
    width: '100%', padding: '9px 11px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    color: '#0f172a', boxSizing: 'border-box',
  },
  row: { display: 'flex', gap: 8 },
  swatches: { display: 'flex', gap: 7 },
  swatch: { width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: '2px solid transparent' },
  swatchActive: { border: '2px solid #0f172a' },
  actions: {
    display: 'flex', gap: 7, marginTop: 6,
    paddingTop: 12, borderTop: '1px solid #f1f5f9',
  },
  delBtn: {
    padding: '7px 11px', background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 12, color: '#e11d48', cursor: 'pointer',
    fontWeight: 500, fontFamily: 'inherit',
  },
  applyBtn: {
    padding: '7px 11px', background: '#faf5ff', border: '1px solid #e9d5ff',
    borderRadius: 8, fontSize: 12, color: '#7e22ce', cursor: 'pointer',
    fontWeight: 500, flex: 1, fontFamily: 'inherit',
  },
  empty: {
    padding: '28px 14px', textAlign: 'center',
    color: '#94a3b8', fontSize: 12, lineHeight: 1.5,
  },
};

interface Props {
  slot: Slot | null;
  dayKey: string | null;
  days: DayDef[];
  onUpdate: (patch: Partial<Slot>) => void;
  onDelete: () => void;
  onApplyToDays: () => void;
}

export default function SlotEditor({ slot, onUpdate, onDelete, onApplyToDays }: Props) {
  const [startStr, setStartStr] = React.useState('');
  const [endStr, setEndStr] = React.useState('');

  React.useEffect(() => {
    if (slot) {
      setStartStr(decimalToTimeStr(slot.start));
      setEndStr(decimalToTimeStr(slot.end));
    }
  }, [slot?.localId, slot?.start, slot?.end]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slot) {
    return (
      <div style={S.wrap}>
        <div style={S.title}>Inspecteur</div>
        <div style={S.empty}>
          Sélectionnez un poste pour le modifier,<br />
          ou cliquez-glissez sur un jour pour en créer un.
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.title}>Poste sélectionné</div>

      <div style={S.field}>
        <label style={S.label}>Nom du poste</label>
        <input
          style={S.input}
          value={slot.name}
          placeholder="Ex : Accueil matin"
          onChange={e => onUpdate({ name: e.target.value })}
        />
      </div>

      <div style={S.field}>
        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Début</label>
            <input
              style={S.input}
              type="time"
              value={startStr}
              onChange={e => {
                setStartStr(e.target.value);
                const d = timeStrToDecimal(e.target.value);
                if (!isNaN(d)) onUpdate({ start: d });
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fin</label>
            <input
              style={S.input}
              type="time"
              value={endStr}
              onChange={e => {
                setEndStr(e.target.value);
                const d = timeStrToDecimal(e.target.value);
                if (!isNaN(d)) onUpdate({ end: d });
              }}
            />
          </div>
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Couleur</label>
        <div style={S.swatches}>
          {COLOR_NAMES.map(c => (
            <div
              key={c}
              style={{
                ...S.swatch,
                background: SLOT_COLORS[c].bg,
                ...(slot.color === c ? S.swatchActive : undefined),
              }}
              onClick={() => onUpdate({ color: c })}
            />
          ))}
        </div>
      </div>

      <div style={S.actions}>
        <button style={S.delBtn} onClick={onDelete}>Supprimer</button>
        <button style={S.applyBtn} onClick={onApplyToDays}>
          Appliquer à d'autres jours…
        </button>
      </div>
    </div>
  );
}
