/**
 * WeekScheduleTable — Gestion des semaines (refonte)
 * Adapté au thème MUI Medatwork. Styles inline pour isolation CSS.
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTheme, alpha } from '@mui/material/styles';

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonId = string;
type PosteId  = string;

export interface WSTPerson { name: string; initials: string; color: string; }
export interface WSTPoste  { id: PosteId; name: string; }
export interface WSTWeek {
  idx: number; num: number;
  startD: number; startM: string;
  endD: number;   endM: string;
  month: number; monthLabel: string; year: string;
}

export interface WeekScheduleTableProps {
  people:          Record<PersonId, WSTPerson>;
  postes:          WSTPoste[];
  weeks:           WSTWeek[];
  rotation:        Record<PosteId, (PersonId | null)[]>;
  currentWeekIdx?: number;
  onCellClick?:    (posteId: PosteId, weekIdx: number, event: React.MouseEvent<HTMLElement>) => void;
  onAddPoste?:     () => void;
  title?:          string;
  yearSelector?:   React.ReactNode;
}

// ── Cell width preference ─────────────────────────────────────────────────────

const CELL_WIDTH_KEY = 'medatwork:week-dispatcher-cell-width';
type CellWidth = 'compact' | 'large';
const CELL_PX: Record<CellWidth, number> = { compact: 110, large: 170 };

function readCellWidth(): CellWidth {
  try { const v = localStorage.getItem(CELL_WIDTH_KEY); if (v === 'large') return 'large'; } catch {}
  return 'compact';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PersonAvatar({ p, size = 22, dimmed }: { p: WSTPerson; size?: number; dimmed?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: dimmed ? '#d0c8d8' : p.color,
      color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: '.02em',
      flex: '0 0 auto',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)',
      transition: 'background .12s',
    }}>
      {p.initials}
    </div>
  );
}

function MonthOverview({ weeks, postes, rotation, currentWeekIdx, focusedWeekIdx, primary, onWeekClick }: {
  weeks: WSTWeek[]; postes: WSTPoste[];
  rotation: Record<PosteId, (PersonId | null)[]>;
  currentWeekIdx: number; focusedWeekIdx: number; primary: string;
  onWeekClick: (weekIdx: number) => void;
}) {
  const months = useMemo(() => {
    const map = new Map<number, WSTWeek[]>();
    weeks.forEach((w) => {
      if (!map.has(w.month)) map.set(w.month, []);
      map.get(w.month)!.push(w);
    });
    return [...map.entries()];
  }, [weeks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {months.map(([m, mWeeks]) => (
        <div key={m}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6,
            fontSize: 10.5, fontWeight: 700, color: '#8a7d72',
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            <span style={{ color: '#1d1b1a' }}>{mWeeks[0].monthLabel}</span>
            <span>· S{mWeeks[0].num}–S{mWeeks[mWeeks.length - 1].num}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mWeeks.length}, 1fr)`, gap: 4 }}>
            {mWeeks.map((w) => {
              const filled = postes.reduce((acc, po) => acc + (rotation[po.id]?.[w.idx] ? 1 : 0), 0);
              const pct = postes.length > 0 ? filled / postes.length : 0;
              const cur     = w.idx === currentWeekIdx;
              const focused = w.idx === focusedWeekIdx;
              return (
                <div
                  key={'mo' + w.idx}
                  title={`S${w.num} — ${filled}/${postes.length} — cliquer pour naviguer`}
                  onClick={() => onWeekClick(w.idx)}
                  style={{
                    background: cur ? primary : '#f3efe7',
                    color: cur ? '#fff' : '#5a544c',
                    borderRadius: 6, padding: '5px 0 4px',
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    fontFeatureSettings: '"tnum"', position: 'relative', overflow: 'hidden',
                    cursor: 'pointer',
                    outline: focused && !cur ? `2px solid ${primary}` : 'none',
                    outlineOffset: 1,
                    transition: 'outline .15s',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1 }}>{w.num}</div>
                  {!cur && (
                    <div style={{
                      position: 'absolute', left: 0, bottom: 0, right: 0,
                      height: `${pct * 100}%`,
                      background: pct < 1 ? 'rgba(232,90,106,.18)' : 'rgba(58,166,118,.22)',
                      zIndex: 0,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeekScheduleTable({
  people, postes, weeks, rotation,
  currentWeekIdx = -1,
  onCellClick, onAddPoste,
  title = 'Répartition des semaines',
  yearSelector,
}: WeekScheduleTableProps) {
  const theme   = useTheme();
  const primary = theme.palette.primary.main;
  const bg      = theme.palette.background.default;
  const paper   = theme.palette.background.paper;
  const divider = theme.palette.divider;
  const textPrimary   = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;
  const textDisabled  = theme.palette.text.disabled;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs   = useRef<Map<string, HTMLDivElement>>(new Map());

  const [focusPerson, setFocusPerson]       = useState<PersonId | null>(null);
  const [showRail, setShowRail]             = useState(true);
  const [cellWidth, setCellWidth]           = useState<CellWidth>(readCellWidth);
  const [focusedWeekIdx, setFocusedWeekIdx] = useState<number>(-1);
  const [unassignedCursor, setUnassignedCursor] = useState(-1);
  const [highlightedCell, setHighlightedCell]   = useState<{ posteId: string; weekIdx: number } | null>(null);

  const cellPx = CELL_PX[cellWidth];

  // Liste ordonnée des cellules non assignées (poste par poste, semaine par semaine)
  const unassignedCells = useMemo(() => {
    const cells: Array<{ posteId: string; weekIdx: number }> = [];
    postes.forEach((po) => {
      (rotation[po.id] ?? []).forEach((personId, idx) => {
        if (!personId) cells.push({ posteId: po.id, weekIdx: idx });
      });
    });
    return cells;
  }, [postes, rotation]);

  // Reset curseur quand le nombre de cellules vides change
  useEffect(() => { setUnassignedCursor(-1); }, [unassignedCells.length]);

  const handleUnassignedClick = useCallback(() => {
    if (unassignedCells.length === 0) return;
    const next = (unassignedCursor + 1) % unassignedCells.length;
    setUnassignedCursor(next);

    const { posteId, weekIdx } = unassignedCells[next];

    // Scroll vertical (fenêtre) — sans scrollIntoView qui réinitialise le scroll horizontal
    const rowEl = rowRefs.current.get(posteId);
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      const isInView = rect.top >= 80 && rect.bottom <= window.innerHeight - 20;
      if (!isInView) {
        window.scrollBy({ top: rect.top - 140, behavior: 'smooth' });
      }
    }

    // Scroll horizontal — dans un rAF pour ne pas conflictuer avec window.scrollBy
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: Math.max(0, weekIdx * cellPx - 20), behavior: 'smooth' });
      }
    });

    // Flash de surbrillance
    setHighlightedCell({ posteId, weekIdx });
    setTimeout(() => setHighlightedCell(null), 1400);
  }, [unassignedCells, unassignedCursor, cellPx]);

  const handleWeekClick = useCallback((weekIdx: number) => {
    setFocusedWeekIdx(weekIdx);
    if (scrollRef.current) {
      const targetLeft = Math.max(0, weekIdx * cellPx - 16);
      scrollRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [cellPx]);

  const toggleCellWidth = useCallback(() => {
    setCellWidth((prev) => {
      const next: CellWidth = prev === 'compact' ? 'large' : 'compact';
      try { localStorage.setItem(CELL_WIDTH_KEY, next); } catch {}
      return next;
    });
  }, []);

  const counts = useMemo(() => {
    const c: Record<PersonId, number> = {};
    postes.forEach((po) => (rotation[po.id] ?? []).forEach((id) => {
      if (id) c[id] = (c[id] || 0) + 1;
    }));
    return c;
  }, [postes, rotation]);

  const openCount = useMemo(() => {
    let n = 0;
    postes.forEach((po) => (rotation[po.id] ?? []).forEach((v) => { if (!v) n++; }));
    return n;
  }, [postes, rotation]);

  const labelW = showRail ? 200 : 220;

  // ── Styles ─────────────────────────────────────────────────────────────────

  const borderSoft = divider;
  const borderFaint = alpha(divider, 0.6);

  return (
    <div style={{ fontFamily: 'inherit', color: textPrimary, background: bg, padding: 24, boxSizing: 'border-box' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: textDisabled }}>
            Horaires · Année
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-.01em', color: textPrimary }}>
            {title}
          </h2>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '10px 14px', background: paper,
        border: `1px solid ${borderSoft}`, borderRadius: 12,
        marginBottom: 12, fontSize: 13, color: textSecondary,
      }}>
        {/* Sélecteur d'année */}
        {yearSelector && (
          <div style={{ minWidth: 260 }}>
            {yearSelector}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {openCount > 0 && (
          <span
            onClick={handleUnassignedClick}
            title="Cliquer pour naviguer vers la prochaine cellule non assignée"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 999,
              background: '#fef2f3', border: '1px solid #fadbdf',
              color: '#a83242', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', userSelect: 'none',
              transition: 'opacity .12s',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 6, background: '#e85a6a', flexShrink: 0 }} />
            {openCount} non assignée{openCount > 1 ? 's' : ''}
            {unassignedCursor >= 0 && (
              <span style={{ opacity: 0.65, fontWeight: 500, fontSize: 11 }}>
                · {unassignedCursor + 1}/{unassignedCells.length}
              </span>
            )}
          </span>
        )}

        <span style={{ color: textDisabled, fontSize: 12 }}>
          {postes.length} poste{postes.length !== 1 ? 's' : ''} · {weeks.length} semaine{weeks.length !== 1 ? 's' : ''}
        </span>

        <div style={{ width: 1, height: 18, background: borderSoft, margin: '0 4px' }} />

        <button
          onClick={onAddPoste}
          style={{
            border: `1px solid ${borderSoft}`, background: paper,
            cursor: 'pointer', padding: '7px 14px', borderRadius: 8,
            fontSize: 12, color: textSecondary, fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          ＋ Importer un poste
        </button>

        <button
          onClick={toggleCellWidth}
          title={cellWidth === 'compact' ? 'Élargir les cases' : 'Rétrécir les cases'}
          style={{
            border: `1px solid ${borderSoft}`,
            background: cellWidth === 'large' ? alpha(primary, 0.08) : paper,
            color: cellWidth === 'large' ? primary : textSecondary,
            cursor: 'pointer', padding: '7px 10px', borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
            lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          {cellWidth === 'compact' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
              Élargir
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 14l-1 1 7 7 1-1M20 10l1-1-7-7-1 1M14 3v6h6M4 21v-6H10"/>
              </svg>
              Rétrécir
            </>
          )}
        </button>

        <button
          onClick={() => setShowRail((v) => !v)}
          style={{
            border: `1px solid ${borderSoft}`,
            background: showRail ? paper : primary,
            color: showRail ? textSecondary : '#fff',
            cursor: 'pointer', padding: '7px 14px', borderRadius: 8,
            fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          {showRail ? '⮞ Masquer le panneau' : '⮜ Afficher le panneau'}
        </button>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showRail ? '1fr 280px' : '1fr',
        gap: 14, alignItems: 'start',
      }}>

        {/* ── Schedule ─────────────────────────────────────────────────────── */}
        <div style={{
          background: paper, border: `1px solid ${borderSoft}`,
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div ref={scrollRef} style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: labelW + weeks.length * cellPx }}>
          {/* Month header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${labelW}px repeat(${weeks.length}, ${cellPx}px)`,
            borderBottom: `1px solid ${borderSoft}`,
            background: alpha(primary, 0.03),
          }}>
            <div style={{
              padding: '10px 16px', fontSize: 10, fontWeight: 700,
              letterSpacing: '.1em', textTransform: 'uppercase',
              color: textDisabled, borderRight: `1px solid ${borderSoft}`,
              display: 'flex', alignItems: 'center',
              position: 'sticky', left: 0, zIndex: 2,
              background: alpha(primary, 0.03),
            }}>
              Poste
            </div>
            {weeks.map((w, i) => {
              const monthStart = i === 0 || weeks[i - 1].month !== w.month;
              const monthSpan  = weeks.filter((x) => x.month === w.month && x.idx >= w.idx).length;
              return monthStart ? (
                <div key={'m' + i} style={{
                  gridColumn: `${i + 2} / span ${monthSpan}`,
                  borderRight: i + monthSpan === weeks.length ? 'none' : `1px solid ${borderSoft}`,
                  padding: '10px 12px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase', color: textDisabled,
                }}>
                  {w.monthLabel} {w.year}
                </div>
              ) : null;
            })}
          </div>

          {/* Week header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${labelW}px repeat(${weeks.length}, ${cellPx}px)`,
            borderBottom: `1px solid ${borderSoft}`,
          }}>
            <div style={{
              padding: '10px 16px', fontSize: 11, fontWeight: 600,
              color: textSecondary, borderRight: `1px solid ${borderSoft}`,
              display: 'flex', alignItems: 'center', background: paper,
              position: 'sticky', left: 0, zIndex: 2,
            }}>
              Semaine
            </div>
            {weeks.map((w, i) => {
              const cur = i === currentWeekIdx;
              return (
                <div key={'w' + i} style={{
                  padding: '8px 4px',
                  borderRight: i === weeks.length - 1 ? 'none' : `1px solid ${borderFaint}`,
                  fontSize: 11, fontFeatureSettings: '"tnum"', textAlign: 'center',
                  background: cur ? primary : paper,
                  color: cur ? '#fff' : textSecondary,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>S{w.num}</div>
                  <div style={{ opacity: 0.75, fontSize: 10 }}>
                    {w.startD}/{String(w.month + 1).padStart(2, '0')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {postes.map((poste, rIdx) => (
            <div
              key={poste.id}
              ref={(el) => { if (el) rowRefs.current.set(poste.id, el); else rowRefs.current.delete(poste.id); }}
              style={{
                display: 'grid',
                gridTemplateColumns: `${labelW}px repeat(${weeks.length}, ${cellPx}px)`,
                borderBottom: rIdx === postes.length - 1 ? 'none' : `1px solid ${borderFaint}`,
              }}
            >
              {/* Label — sticky */}
              <div style={{
                padding: '10px 16px', borderRight: `1px solid ${borderSoft}`,
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 10, color: textPrimary,
                position: 'sticky', left: 0, zIndex: 1, background: paper,
              }}>
                <span style={{ width: 4, height: 22, borderRadius: 2, background: primary, opacity: 0.25 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {poste.name}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: textDisabled, fontFeatureSettings: '"tnum"' }}>
                  {(rotation[poste.id] ?? []).filter(Boolean).length}/{weeks.length}
                </span>
              </div>

              {/* Cells */}
              {weeks.map((w, i) => {
                const personId = rotation[poste.id]?.[i] ?? null;
                const p       = personId ? people[personId] : null;
                const cur     = i === currentWeekIdx;
                const dim     = Boolean(focusPerson && focusPerson !== personId);
                const prev    = i > 0 ? (rotation[poste.id]?.[i - 1] ?? null) : null;
                const rotated = Boolean(personId && prev && prev !== personId);

                const isHighlighted = highlightedCell?.posteId === poste.id && highlightedCell?.weekIdx === i;

                if (!p) {
                  return (
                    <div key={'c' + i}
                      onClick={(e) => onCellClick && onCellClick(poste.id, i, e)}
                      style={{
                        padding: 5,
                        borderRight: i === weeks.length - 1 ? 'none' : `1px solid ${borderFaint}`,
                        background: isHighlighted ? hexToRgba(primary, 0.08) : cur ? alpha(primary, 0.05) : alpha(bg, 0.5),
                        cursor: onCellClick ? 'pointer' : 'default',
                        transition: 'background .3s',
                      }}
                    >
                      <div style={{
                        border: `1.5px dashed ${isHighlighted ? primary : alpha(primary, 0.3)}`,
                        borderRadius: 8, padding: '6px 6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 5, minHeight: 38, boxSizing: 'border-box',
                        color: isHighlighted ? primary : textDisabled,
                        fontSize: 11, fontWeight: 500,
                        transition: 'border-color .3s, color .3s',
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 20,
                          border: '1.3px dashed currentColor',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flex: '0 0 auto',
                        }}>+</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={'c' + i}
                    onMouseEnter={() => setFocusPerson(personId)}
                    onMouseLeave={() => setFocusPerson(null)}
                    onClick={(e) => onCellClick && onCellClick(poste.id, i, e)}
                    style={{
                      padding: 5,
                      borderRight: i === weeks.length - 1 ? 'none' : `1px solid ${borderFaint}`,
                      background: cur ? hexToRgba(p.color, 0.04) : paper,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      background: dim ? alpha(bg, 0.8) : hexToRgba(p.color, 0.14),
                      border: `1px solid ${dim ? borderSoft : hexToRgba(p.color, 0.28)}`,
                      borderRadius: 8, padding: '6px 8px',
                      display: 'flex', alignItems: 'center', gap: 7,
                      minHeight: 38, boxSizing: 'border-box',
                      transition: 'all .12s', opacity: dim ? 0.5 : 1,
                    }}>
                      <PersonAvatar p={p} size={22} dimmed={dim} />
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: dim ? textDisabled : textPrimary,
                        lineHeight: 1.1, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        minWidth: 0, flex: 1,
                      }}>
                        {p.name}
                      </span>
                      {rotated && !dim && (
                        <span style={{
                          fontSize: 9, color: p.color, background: paper,
                          borderRadius: 4, padding: '1px 4px',
                          fontWeight: 700, letterSpacing: '.04em', flex: '0 0 auto',
                        }}>
                          ↻
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Add row */}
          <div onClick={onAddPoste} style={{
            padding: '14px 16px', fontSize: 13, color: textSecondary,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: onAddPoste ? 'pointer' : 'default',
            borderTop: `1px solid ${borderFaint}`,
            background: alpha(bg, 0.5),
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 20,
              border: `1.5px dashed ${alpha(primary, 0.4)}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: textDisabled,
            }}>+</span>
            Importer un poste
          </div>
          </div>{/* /minWidth */}
          </div>{/* /overflowX */}
        </div>

        {/* ── Right rail ───────────────────────────────────────────────────── */}
        {showRail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Charge par MACC */}
            <div style={{
              background: paper, border: `1px solid ${borderSoft}`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textPrimary, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                  Charge par MACC
                </div>
                <div style={{ fontSize: 10, color: textDisabled, letterSpacing: '.04em' }}>
                  {Object.keys(counts).length} actif{Object.keys(counts).length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([pid, n]) => {
                  const p = people[pid];
                  if (!p) return null;
                  const pct = weeks.length > 0 ? n / weeks.length : 0;
                  const hov = focusPerson === pid;
                  return (
                    <div key={pid} onMouseEnter={() => setFocusPerson(pid)} onMouseLeave={() => setFocusPerson(null)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: 14, background: p.color, flex: '0 0 auto',
                          boxShadow: hov ? `0 0 0 3px ${hexToRgba(p.color, 0.22)}` : 'none',
                          transition: 'box-shadow .12s',
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: hov ? textPrimary : textSecondary, flex: 1 }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 11, color: textDisabled, fontFeatureSettings: '"tnum"' }}>
                          {n} sem.
                        </span>
                      </div>
                      <div style={{ height: 5, background: alpha(primary, 0.1), borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(pct * 100, 100)}%`, height: '100%',
                          background: p.color, opacity: hov ? 1 : 0.7,
                          transition: 'opacity .12s, width .15s', borderRadius: 4,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aperçu mensuel */}
            <div style={{
              background: paper, border: `1px solid ${borderSoft}`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textPrimary, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                  Aperçu mensuel
                </div>
                <div style={{ fontSize: 10, color: textDisabled }}>
                  {weeks.length} semaine{weeks.length !== 1 ? 's' : ''}
                </div>
              </div>
              <MonthOverview
                weeks={weeks} postes={postes} rotation={rotation}
                currentWeekIdx={currentWeekIdx} focusedWeekIdx={focusedWeekIdx}
                primary={primary} onWeekClick={handleWeekClick}
              />
              <div style={{
                marginTop: 12, padding: 10, background: alpha(primary, 0.04),
                borderRadius: 8, fontSize: 11, color: textSecondary,
                lineHeight: 1.5, border: `1px solid ${alpha(primary, 0.1)}`,
              }}>
                <div style={{ color: textPrimary, fontWeight: 600, marginBottom: 2 }}>Astuce</div>
                Survolez un MACC dans la liste pour mettre en évidence ses semaines.
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
