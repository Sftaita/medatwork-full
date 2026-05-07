import React, { useRef, CSSProperties } from 'react';
import { Slot, DayDef, SLOT_COLORS, COLOR_NAMES, fmtHM, fmtDuration, newLocalId } from './types';

const S: Record<string, CSSProperties> = {
  row: {
    display: 'grid',
    gridTemplateColumns: 'var(--pw-label-w, 180px) 1fr',
    alignItems: 'stretch',
    borderBottom: '1px solid #f1f5f9',
    minHeight: 80,
  },
  rowWeekend: { background: '#f8fafc' },
  label: {
    padding: '12px 14px', borderRight: '1px solid #f1f5f9',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
    position: 'sticky', left: 0, zIndex: 2,
  },
  dayName: { fontSize: 13, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' },
  actions: { display: 'flex', gap: 4, marginTop: 4 },
  actionBtn: {
    padding: '2px 7px', fontSize: 10, fontWeight: 500,
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 5, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
  },
  track: { position: 'relative', margin: '8px 0', background: 'transparent', minHeight: 64 },
  gridLines: {
    position: 'absolute', inset: 0,
    backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(100%/12 - 1px), #f1f5f9 calc(100%/12 - 1px), #f1f5f9 calc(100%/12))',
    pointerEvents: 'none',
  },
  ghostHint: {
    position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)',
    color: '#94a3b8', fontSize: 12, pointerEvents: 'none',
  },
  slot: {
    position: 'absolute', top: 6, bottom: 6,
    borderRadius: 8, padding: '7px 9px',
    color: '#fff', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.18)',
    userSelect: 'none', transition: 'box-shadow .15s, transform .15s',
  },
  slotName: {
    fontSize: 11.5, fontWeight: 600, lineHeight: 1.2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  slotTime: { fontSize: 10, opacity: 0.9, fontVariantNumeric: 'tabular-nums' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 6, cursor: 'ew-resize' },
};

interface Props {
  day: DayDef;
  slots: Slot[];
  startHour: number;
  endHour: number;
  isWeekend: boolean;
  granularity: number;
  selectedId: string | null;
  onAddSlot: (dayKey: string, slot: Slot) => void;
  onUpdateSlot: (dayKey: string, localId: string, patch: Partial<Slot>) => void;
  onDeleteSlot: (dayKey: string, localId: string) => void;
  onSelectSlot: (dayKey: string, localId: string) => void;
  onDuplicateDay: (dayKey: string) => void;
  onClearDay: (dayKey: string) => void;
}

interface DragState {
  kind: 'move' | 'left' | 'right';
  slotId: string;
  startX: number;
  origStart: number;
  origEnd: number;
}

interface DraftState {
  start: number;
  end: number;
  rectLeft: number;
  rectWidth: number;
}

export default function DayRow({
  day, slots, startHour, endHour, isWeekend, granularity,
  selectedId, onAddSlot, onUpdateSlot, onDeleteSlot, onSelectSlot,
  onDuplicateDay, onClearDay,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const span = endHour - startHour;
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [draft, setDraft] = React.useState<DraftState | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const snap = (h: number) => Math.round(h / granularity) * granularity;
  const pxToHour = (px: number, w: number) => startHour + (px / w) * span;

  // ── Draft drag (create) ───────────────────────────────────────────────────────
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editingId) return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('pw-track') && !target.classList.contains('pw-grid')) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const h = snap(pxToHour(e.clientX - rect.left, rect.width));
    setDraft({ start: h, end: h + granularity, rectLeft: rect.left, rectWidth: rect.width });
  };

  React.useEffect(() => {
    if (!draft) return;
    const onMove = (e: MouseEvent) => {
      const h = Math.max(startHour, Math.min(endHour, snap(pxToHour(e.clientX - draft.rectLeft, draft.rectWidth))));
      setDraft(d => d ? { ...d, end: h } : null);
    };
    const onUp = () => {
      if (draft) {
        const s = Math.min(draft.start, draft.end);
        let e = Math.max(draft.start, draft.end);
        if (e - s >= granularity) {
          // trim against existing slots
          const sorted = slots.filter(sl => sl.start >= s).sort((a, b) => a.start - b.start);
          for (const sl of sorted) {
            if (sl.start < e && sl.start >= s) { e = sl.start; break; }
          }
          const conflict = slots.find(sl => sl.start <= s && sl.end > s);
          if (!conflict && e - s >= granularity) {
            const newSlot: Slot = {
              localId: newLocalId(), name: '', start: s, end: e, color: 'violet',
            };
            onAddSlot(day.key, newSlot);
            onSelectSlot(day.key, newSlot.localId);
          }
        }
      }
      setDraft(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slot drag (move / resize) ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!drag || !trackRef.current) return;
    const onMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const dh = ((e.clientX - drag.startX) / rect.width) * span;
      let ns = drag.origStart, ne = drag.origEnd;

      if (drag.kind === 'move') { ns = drag.origStart + dh; ne = drag.origEnd + dh; }
      else if (drag.kind === 'left') { ns = drag.origStart + dh; }
      else { ne = drag.origEnd + dh; }

      ns = snap(ns); ne = snap(ne);
      if (ns < startHour) { const d = startHour - ns; ns += d; if (drag.kind === 'move') ne += d; }
      if (ne > endHour) { const d = ne - endHour; ne -= d; if (drag.kind === 'move') ns -= d; }
      if (ne - ns < granularity) {
        if (drag.kind === 'left') ns = ne - granularity;
        else ne = ns + granularity;
      }
      const others = slots.filter(s => s.localId !== drag.slotId);
      for (const o of others) { if (ns < o.end && ne > o.start) return; }
      onUpdateSlot(day.key, drag.slotId, { start: ns, end: ne });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close inline editor on outside click
  React.useEffect(() => {
    if (!editingId) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-slot-edit]')) setEditingId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editingId]);

  return (
    <div style={{ ...S.row, ...(isWeekend ? S.rowWeekend : undefined) }}>
      <div style={{ ...S.label, background: isWeekend ? '#f8fafc' : '#fff' }}>
        <div style={S.dayName}>{day.name}</div>
        <div style={S.actions}>
          <button style={S.actionBtn} onClick={() => onDuplicateDay(day.key)}>⎘ Copier</button>
          {slots.length > 0 && (
            <button style={S.actionBtn} onClick={() => onClearDay(day.key)}>✕ Vider</button>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="pw-track"
        style={{ ...S.track, cursor: 'crosshair' }}
        onMouseDown={handleTrackMouseDown}
      >
        <div className="pw-grid" style={S.gridLines} />
        {slots.length === 0 && !draft && (
          <div style={S.ghostHint}>Cliquez-glissez pour ajouter un poste</div>
        )}

        {slots.map(slot => {
          const left = ((slot.start - startHour) / span) * 100;
          const width = ((slot.end - slot.start) / span) * 100;
          const palette = SLOT_COLORS[slot.color] || SLOT_COLORS.violet;
          const isSelected = selectedId === slot.localId;
          const isEditing = editingId === slot.localId;

          return (
            <div
              key={slot.localId}
              data-slot-edit={isEditing ? 'true' : undefined}
              style={{
                ...S.slot,
                left: `${left}%`, width: `${width}%`,
                background: palette.bg,
                boxShadow: isSelected || isEditing
                  ? `0 0 0 2px ${palette.ring}, 0 6px 18px ${palette.ring}40`
                  : S.slot.boxShadow,
                transform: isSelected || isEditing ? 'translateY(-1px)' : 'none',
                cursor: isEditing ? 'default' : 'grab',
              }}
              onMouseDown={e => {
                if (isEditing) return;
                if ((e.target as Element).closest('[data-no-drag]')) return;
                e.stopPropagation();
                setDrag({ kind: 'move', slotId: slot.localId, startX: e.clientX, origStart: slot.start, origEnd: slot.end });
              }}
              onClick={e => { e.stopPropagation(); if (!isEditing) onSelectSlot(day.key, slot.localId); }}
              onDoubleClick={e => { e.stopPropagation(); setEditingId(slot.localId); onSelectSlot(day.key, slot.localId); }}
            >
              {isEditing ? (
                <div data-no-drag style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                  <input
                    autoFocus
                    value={slot.name}
                    onChange={e => onUpdateSlot(day.key, slot.localId, { name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.95)', border: 'none',
                      borderRadius: 4, padding: '3px 6px', fontSize: 11.5, fontWeight: 600,
                      color: '#0f172a', outline: '2px solid rgba(255,255,255,0.6)', fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} data-no-drag>
                    {COLOR_NAMES.map(c => (
                      <button
                        key={c}
                        data-no-drag
                        onClick={e => { e.stopPropagation(); onUpdateSlot(day.key, slot.localId, { color: c }); }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          width: 14, height: 14, borderRadius: 3, padding: 0,
                          background: SLOT_COLORS[c].bg, cursor: 'pointer',
                          border: slot.color === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                          boxShadow: slot.color === c ? '0 0 0 1px rgba(0,0,0,0.3)' : 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 9.5, opacity: 0.85, fontWeight: 500 }}>
                      {fmtHM(slot.start)}–{fmtHM(slot.end)}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div style={S.slotName}>{slot.name || 'Sans nom'}</div>
                  <div style={S.slotTime}>
                    {fmtHM(slot.start)}–{fmtHM(slot.end)} · {fmtDuration(slot.end - slot.start)}
                  </div>
                </>
              )}

              {!isEditing && (
                <>
                  {isSelected && (
                    <button
                      data-no-drag
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onDeleteSlot(day.key, slot.localId); }}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.95)', color: palette.ring,
                        border: 'none', cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 700, padding: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 2,
                        fontFamily: 'inherit',
                      }}
                    >×</button>
                  )}
                  <div
                    style={{ ...S.handle, left: 0 }}
                    onMouseDown={e => { e.stopPropagation(); setDrag({ kind: 'left', slotId: slot.localId, startX: e.clientX, origStart: slot.start, origEnd: slot.end }); }}
                  />
                  <div
                    style={{ ...S.handle, right: 0 }}
                    onMouseDown={e => { e.stopPropagation(); setDrag({ kind: 'right', slotId: slot.localId, startX: e.clientX, origStart: slot.start, origEnd: slot.end }); }}
                  />
                </>
              )}
            </div>
          );
        })}

        {draft && (() => {
          const s = Math.min(draft.start, draft.end);
          const e = Math.max(draft.start, draft.end);
          return (
            <div style={{
              ...S.slot, pointerEvents: 'none',
              left: `${((s - startHour) / span) * 100}%`,
              width: `${((e - s) / span) * 100}%`,
              background: '#f3e8ff', border: '2px dashed #a439b6',
              color: '#7e22ce', boxShadow: 'none',
            }}>
              <div style={S.slotName}>Nouveau</div>
              <div style={S.slotTime}>{fmtHM(s)}–{fmtHM(e)}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
