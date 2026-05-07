import React, { CSSProperties } from 'react';
import { Slot } from './types';

const S: Record<string, CSSProperties> = {
  wrap: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: 16,
    boxShadow: '0 4px 12px rgba(15,17,21,0.04)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  title: {
    fontSize: 10.5, fontWeight: 600, color: '#94a3b8',
    letterSpacing: '0.12em', textTransform: 'uppercase',
  },
  slotName: {
    fontSize: 13, fontWeight: 600, color: '#0f172a',
    borderBottom: '1px solid #f1f5f9', paddingBottom: 8,
  },
  textarea: {
    width: '100%', minHeight: 100,
    padding: '10px 12px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit',
    color: '#0f172a', lineHeight: 1.6,
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  hint: { fontSize: 11, color: '#94a3b8' },
  empty: {
    padding: '24px 0', textAlign: 'center',
    color: '#94a3b8', fontSize: 12, lineHeight: 1.6,
  },
};

interface Props {
  slot: Slot | null;
  onChange: (description: string) => void;
}

export default function DescriptionEditor({ slot, onChange }: Props) {
  return (
    <div style={S.wrap}>
      <div style={S.title}>Description</div>
      {slot ? (
        <>
          <div style={S.slotName}>{slot.name || 'Sans nom'}</div>
          <textarea
            style={S.textarea}
            value={slot.description}
            placeholder="Ajouter une description à ce poste…"
            onChange={e => onChange(e.target.value)}
          />
          <span style={S.hint}>Sauvegardé automatiquement</span>
        </>
      ) : (
        <div style={S.empty}>
          Sélectionnez un poste<br />pour modifier sa description.
        </div>
      )}
    </div>
  );
}
