/**
 * MonthCalendar.tsx — Calendrier mensuel Medatwork
 * Vues : mois, semaine, jour, planning. Styles inline pour isolation CSS.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import ExportScheduleModal from './ExportScheduleModal';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MCMacc    { id: string; name: string; color: string; }
export interface MCService { code: string; label: string; tint: string; }
export interface MCEvent   {
  maccId: string;
  serviceId: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  [key: string]: unknown;
}

export interface MonthCalendarProps {
  maccs:        MCMacc[];
  services:     Record<string, MCService>;
  events:       Record<string, MCEvent[]>; // clé = 'YYYY-MM-DD'
  viewMonth:    Date;
  today?:       string; // 'YYYY-MM-DD'
  maccSearch?:  string;
  yearSelector?: React.ReactNode;
  yearId?:       string | number;
  onPrevMonth?:  () => void;
  onNextMonth?:  () => void;
  onTodayClick?: () => void;
  onViewChange?: (v: 'month' | 'week' | 'day' | 'agenda') => void;
  onDayClick?:   (dateKey: string) => void;
  onAddEvent?:   (dateKey: string) => void;
  onEventClick?: (dateKey: string, event: MCEvent) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
}

function weekMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - dow);
  return toKey(d);
}

const FR_DAYS       = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const FR_DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const FR_DAYS_FULL  = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const FR_MONTHS     = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function buildCells(viewMonth: Date) {
  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  // Heure 12h00 : évite le décalage UTC (minuit local → jour précédent en UTC+)
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0);
  const offset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - offset + i, 12, 0, 0);
    cells.push({ date: d, key: toKey(d), day: d.getDate(), month: d.getMonth(), inMonth: d.getMonth() === month, dow: d.getDay() });
    if (i === 34) {
      const next = new Date(year, month, 1 - offset + 35, 12, 0, 0);
      if (next.getMonth() !== month) break;
    }
  }
  return cells;
}

function labelForDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${FR_DAYS_FULL[(d.getDay() + 6) % 7]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── useBreakpoint hook ────────────────────────────────────────────────────────

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const get = (): Breakpoint => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  };
  const [bp, setBp] = useState<Breakpoint>(get);
  useEffect(() => {
    const onResize = () => setBp(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

// ── BottomSheet component ─────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, height = '75vh', children }: {
  open: boolean; onClose: () => void; title?: string; height?: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(20,15,10,.35)', display: 'flex', alignItems: 'flex-end', animation: 'mcFadeIn .15s ease-out' }}>
      <style>{`@keyframes mcFadeIn{from{opacity:0}to{opacity:1}} @keyframes mcSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxHeight: height, borderTopLeftRadius: 18, borderTopRightRadius: 18, display: 'flex', flexDirection: 'column', animation: 'mcSlideUp .2s ease-out' }}>
        <div onClick={onClose} style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: '#d2c4ad' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 12px', borderBottom: '1px solid #f3efe7' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1b1a' }}>{title}</span>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 0, background: '#f3efe7', color: '#5a544c', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── MaccSheetContent component ────────────────────────────────────────────────

function MaccSheetContent({ maccs, enabledMaccs, setEnabledMaccs, focusMacc, setFocusMacc, paper, border, primary, textPrimary, textSecondary, textDisabled }: {
  maccs: MCMacc[]; enabledMaccs: Set<string>; setEnabledMaccs: React.Dispatch<React.SetStateAction<Set<string>>>;
  focusMacc: string | null; setFocusMacc: (id: string | null) => void;
  paper: string; border: string; primary: string; textPrimary: string; textSecondary: string; textDisabled: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = maccs.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => setEnabledMaccs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ padding: 16 }}>
      {/* Search input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#faf8f4', border: `1px solid ${border}`, marginBottom: 10 }}>
        <span style={{ color: textDisabled, fontSize: 14 }}>⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un MACC…" style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: textPrimary, fontFamily: 'inherit' }} />
      </div>
      {/* Tout / Aucun */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([['Tout', () => setEnabledMaccs(new Set(maccs.map(m => m.id)))], ['Aucun', () => setEnabledMaccs(new Set())]] as const).map(([label, fn]) => (
          <button key={label as string} onClick={fn as () => void} style={{ flex: 1, border: `1px solid ${border}`, background: rgba(primary, 0.04), borderRadius: 8, padding: '7px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: textSecondary, fontFamily: 'inherit' }}>{label as string}</button>
        ))}
      </div>
      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((m) => {
          const enabled = enabledMaccs.has(m.id);
          const focused = focusMacc === m.id;
          return (
            <div key={m.id} onMouseEnter={() => setFocusMacc(m.id)} onMouseLeave={() => setFocusMacc(null)} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, background: focused ? rgba(primary, 0.06) : 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: enabled ? 0 : `1.5px solid ${border}`, background: enabled ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flex: '0 0 auto' }}>{enabled ? '✓' : ''}</div>
              <div style={{ width: 28, height: 28, borderRadius: 28, background: enabled ? m.color : rgba(primary, 0.1), color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{initials(m.name)}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? textPrimary : textDisabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{m.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MaccsSidebar({ maccs, enabledMaccs, setEnabledMaccs, focusMacc, setFocusMacc, search, paper, border, primary, textPrimary, textSecondary, textDisabled }: {
  maccs: MCMacc[]; enabledMaccs: Set<string>;
  setEnabledMaccs: React.Dispatch<React.SetStateAction<Set<string>>>;
  focusMacc: string | null; setFocusMacc: (id: string | null) => void;
  search: string;
  paper: string; border: string; primary: string;
  textPrimary: string; textSecondary: string; textDisabled: string;
}) {
  const filtered = maccs.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => setEnabledMaccs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, padding: 14, maxHeight: 920, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: textPrimary, letterSpacing: '.14em', textTransform: 'uppercase' }}>MACCs</div>
        <span style={{ fontSize: 11, color: textDisabled, fontFeatureSettings: '"tnum"' }}>{enabledMaccs.size}/{maccs.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[['Tout', () => setEnabledMaccs(new Set(maccs.map((m) => m.id)))], ['Aucun', () => setEnabledMaccs(new Set())]].map(([label, fn]) => (
          <button key={label as string} onClick={fn as () => void} style={{ flex: 1, border: `1px solid ${border}`, background: rgba(primary, 0.04), borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: textSecondary, fontFamily: 'inherit' }}>{label as string}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((m) => {
          const enabled = enabledMaccs.has(m.id);
          const focused = focusMacc === m.id;
          return (
            <div key={m.id} onMouseEnter={() => setFocusMacc(m.id)} onMouseLeave={() => setFocusMacc(null)} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 6px', borderRadius: 7, background: focused ? rgba(primary, 0.06) : 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, borderRadius: 5, border: enabled ? 0 : `1.5px solid ${border}`, background: enabled ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flex: '0 0 auto' }}>
                {enabled ? '✓' : ''}
              </div>
              <div style={{ width: 22, height: 22, borderRadius: 22, background: enabled ? m.color : rgba(primary, 0.1), color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', opacity: enabled ? 1 : 0.7 }}>
                {initials(m.name)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: enabled ? textPrimary : textDisabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({ ev, macById, services, dateKey, focusMacc, onEventClick, border, textDisabled, textSecondary }: {
  ev: MCEvent; macById: Record<string, MCMacc>; services: Record<string, MCService>;
  dateKey: string; focusMacc: string | null;
  onEventClick?: (k: string, e: MCEvent) => void;
  border: string; textDisabled: string; textSecondary: string;
}) {
  const m   = macById[ev.maccId];
  const svc = services[ev.serviceId];
  if (!m) return null;
  const dim = !!(focusMacc && focusMacc !== ev.maccId);
  return (
    <div onClick={(e) => { e.stopPropagation(); onEventClick?.(dateKey, ev); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px 2px 3px', borderRadius: 4, background: dim ? alpha(border, 0.3) : rgba(m.color, 0.13), borderLeft: `3px solid ${dim ? border : m.color}`, fontSize: 10, opacity: dim ? 0.5 : 1, transition: 'all .12s', minWidth: 0, cursor: onEventClick ? 'pointer' : 'default' }}>
      <span style={{ fontWeight: 700, color: dim ? textDisabled : m.color, flex: '0 0 auto' }}>{initials(m.name)}</span>
      {svc && <span style={{ color: dim ? textDisabled : textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1, fontWeight: 500 }}>{svc.code}</span>}
      <span style={{ fontSize: 9, color: dim ? alpha(textDisabled, 0.5) : textDisabled, fontFeatureSettings: '"tnum"', flex: '0 0 auto' }}>{ev.end}</span>
    </div>
  );
}

function DetailCard({ dayKey, events, macById, services, onClose, onAddEvent, onEventClick, paper, border, primary, textPrimary, textSecondary, textDisabled }: {
  dayKey: string; events: MCEvent[]; macById: Record<string, MCMacc>; services: Record<string, MCService>;
  onClose?: () => void; onAddEvent?: (k: string) => void; onEventClick?: (k: string, e: MCEvent) => void;
  paper: string; border: string; primary: string; textPrimary: string; textSecondary: string; textDisabled: string;
}) {
  const d = new Date(dayKey + 'T12:00:00');
  const dow     = FR_DAYS_FULL[(d.getDay() + 6) % 7];
  const dateStr = `${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;

  return (
    <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: textDisabled, letterSpacing: '.14em', textTransform: 'uppercase' }}>Détail du jour</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginTop: 4, textTransform: 'capitalize' }}>{dow} {dateStr}</div>
          <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{events.length} affectation{events.length > 1 ? 's' : ''}</div>
        </div>
        {onClose && <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 7, border: 0, background: rgba(primary, 0.08), color: primary, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>✕</button>}
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: textDisabled, fontSize: 12, background: rgba(primary, 0.03), borderRadius: 10, border: `1.5px dashed ${rgba(primary, 0.2)}` }}>
          Aucune affectation ce jour.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((ev, i) => {
            const m   = macById[ev.maccId];
            const svc = services[ev.serviceId];
            if (!m) return null;
            return (
              <div key={i} onClick={() => onEventClick?.(dayKey, ev)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: rgba(m.color, 0.07), border: `1px solid ${rgba(m.color, 0.18)}`, cursor: onEventClick ? 'pointer' : 'default' }}>
                <div style={{ width: 30, height: 30, borderRadius: 30, background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flex: '0 0 auto' }}>
                  {initials(m.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  {svc && <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>{svc.label}</div>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: textSecondary, fontFeatureSettings: '"tnum"', textAlign: 'right', flex: '0 0 auto' }}>
                  {ev.start}<br />{ev.end}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {onAddEvent && (
        <button onClick={() => onAddEvent(dayKey)} style={{ marginTop: 12, width: '100%', background: primary, color: '#fff', border: 0, borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          ＋ Ajouter une affectation
        </button>
      )}
    </div>
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export default function MonthCalendar({
  maccs, services, events, viewMonth, today,
  maccSearch = '',
  yearSelector, yearId,
  onPrevMonth, onNextMonth, onTodayClick, onViewChange,
  onDayClick, onAddEvent, onEventClick,
}: MonthCalendarProps) {
  const theme         = useTheme();
  const primary       = theme.palette.primary.main;
  const bg            = theme.palette.background.default;
  const paper         = theme.palette.background.paper;
  const border        = theme.palette.divider;
  const textPrimary   = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;
  const textDisabled  = theme.palette.text.disabled;

  const todayKey = today || toKey(new Date());

  const [view, setView]                     = useState<'month'|'week'|'day'|'agenda'>('month');
  const [enabledMaccs, setEnabledMaccs]     = useState<Set<string>>(new Set(maccs.map((m) => m.id)));
  const [focusMacc, setFocusMacc]           = useState<string | null>(null);
  const [selectedDay, setSelectedDay]       = useState<string>(todayKey);
  const [anchorDate, setAnchorDate]         = useState<string>(todayKey); // anchor for week/day nav
  const [showRail, setShowRail]             = useState(true);
  const [exportOpen, setExportOpen]         = useState(false);

  // Responsive breakpoint
  const bp        = useBreakpoint();
  const isMobile  = bp === 'mobile';
  const isTablet  = bp === 'tablet';
  const isDesktop = bp === 'desktop';

  // Bottom sheet state
  const [maccsSheetOpen, setMaccsSheetOpen] = useState(false);
  const [daySheetOpen,   setDaySheetOpen]   = useState(false);

  // Sync enabledMaccs when maccs load async or year changes
  const maccIdKey = maccs.map((m) => m.id).sort().join(',');
  useEffect(() => {
    setEnabledMaccs(new Set(maccs.map((m) => m.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maccIdKey]);

  const cells   = useMemo(() => buildCells(viewMonth), [viewMonth]);
  const macById = useMemo(() => Object.fromEntries(maccs.map((m) => [m.id, m])), [maccs]);

  const eventsFor = (key: string) =>
    (events[key] || []).filter((e) => enabledMaccs.has(e.maccId) && (!focusMacc || focusMacc === e.maccId));

  const handleViewChange = (v: 'month' | 'week' | 'day' | 'agenda') => {
    setView(v);
    onViewChange?.(v);
    // Sync anchor to selected day when entering week/day
    if (v === 'week' || v === 'day') setAnchorDate(selectedDay);
  };

  const handleDayClick = (key: string) => {
    setSelectedDay(key);
    setAnchorDate(key);
    onDayClick?.(key);
    if (isMobile) setDaySheetOpen(true);
  };

  // Navigation: behaviour depends on active view
  const handlePrev = () => {
    if (view === 'month' || view === 'agenda') { onPrevMonth?.(); }
    else if (view === 'week') setAnchorDate((d) => addDays(d, -7));
    else if (view === 'day')  setAnchorDate((d) => addDays(d, -1));
  };

  const handleNext = () => {
    if (view === 'month' || view === 'agenda') { onNextMonth?.(); }
    else if (view === 'week') setAnchorDate((d) => addDays(d, 7));
    else if (view === 'day')  setAnchorDate((d) => addDays(d, 1));
  };

  const handleTodayClick = () => {
    setAnchorDate(todayKey);
    setSelectedDay(todayKey);
    onTodayClick?.();
  };

  // ── Header label ─────────────────────────────────────────────────────────────

  const monthLabel = `${FR_MONTHS[viewMonth.getMonth()].charAt(0).toUpperCase() + FR_MONTHS[viewMonth.getMonth()].slice(1)} ${viewMonth.getFullYear()}`;

  const headerLabel = (() => {
    if (view === 'month' || view === 'agenda') return monthLabel;
    if (view === 'day') return labelForDate(anchorDate);
    // week
    const mon = weekMondayOf(anchorDate);
    const sun = addDays(mon, 6);
    const dMon = new Date(mon + 'T12:00:00');
    const dSun = new Date(sun + 'T12:00:00');
    if (dMon.getMonth() === dSun.getMonth()) {
      return `${dMon.getDate()} – ${dSun.getDate()} ${FR_MONTHS[dSun.getMonth()]} ${dSun.getFullYear()}`;
    }
    return `${dMon.getDate()} ${FR_MONTHS[dMon.getMonth()]} – ${dSun.getDate()} ${FR_MONTHS[dSun.getMonth()]} ${dSun.getFullYear()}`;
  })();

  const viewSubLabel: Record<typeof view, string> = {
    month:  'Vue mensuelle',
    week:   'Vue hebdomadaire',
    day:    'Vue journalière',
    agenda: 'Planning',
  };

  const commonProps = { paper, border, primary, textPrimary, textSecondary, textDisabled };

  // ── Week view days ────────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    const mon = weekMondayOf(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(mon, i);
      const d   = new Date(key + 'T12:00:00');
      return { key, day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dowIdx: i };
    });
  }, [anchorDate]);

  // ── Agenda: days in current month with events ─────────────────────────────────

  const agendaDays = useMemo(() => {
    return cells
      .filter((c) => c.inMonth)
      .map((c) => ({ key: c.key, day: c.day, events: eventsFor(c.key) }))
      .filter((c) => c.events.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, events, enabledMaccs, focusMacc]);

  // ── Responsive layout ─────────────────────────────────────────────────────────

  const showSidebar = isDesktop && view !== 'day';
  const showRailCol = showRail && !isMobile && view !== 'day' && view !== 'agenda';

  const gridCols = (() => {
    if (view === 'day') return '1fr';
    if (isMobile) return '1fr';
    if (isTablet) return showRailCol ? '1fr 260px' : '1fr';
    // desktop
    return showSidebar
      ? (showRailCol ? '220px 1fr 268px' : '220px 1fr')
      : '1fr';
  })();

  // Responsive cell sizes
  const cellMinH = isMobile ? 78 : isTablet ? 120 : 130;
  const maxChips = isMobile ? 2 : isTablet ? 3 : 4;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'inherit', color: textPrimary, background: bg, padding: isMobile ? 12 : 24, boxSizing: 'border-box', width: '100%', minWidth: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: textDisabled }}>
            Agenda · {viewSubLabel[view]}
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: isMobile ? 22 : 26, fontWeight: 700, letterSpacing: '-.01em', color: textPrimary, textTransform: 'capitalize' }}>
            {headerLabel}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {yearSelector && !isMobile && <div style={{ minWidth: 240 }}>{yearSelector}</div>}

          {/* Export */}
          <button
            onClick={() => setExportOpen(true)}
            title="Exporter le planning (PDF / impression / email)"
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${border}`, background: paper, color: textPrimary, borderRadius: 10, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {isMobile ? '↓' : '↓ Exporter'}
          </button>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 0, background: paper, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={handlePrev} style={{ width: 36, height: 36, border: 0, background: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>‹</button>
            <div style={{ width: 1, background: border }} />
            <button onClick={handleTodayClick} style={{ border: 0, background: 'transparent', color: textPrimary, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Aujourd'hui</button>
            <div style={{ width: 1, background: border }} />
            <button onClick={handleNext} style={{ width: 36, height: 36, border: 0, background: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>›</button>
          </div>

          {/* Vue tabs */}
          <div style={{ display: 'flex', background: paper, border: `1px solid ${border}`, borderRadius: 10, padding: 3 }}>
            {(['month', 'week', 'day', 'agenda'] as const).map((k, idx) => {
              const labels = ['Mois', 'Semaine', 'Jour', 'Planning'];
              return (
                <button key={k} onClick={() => handleViewChange(k)} style={{ border: 0, padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: view === k ? primary : 'transparent', color: view === k ? '#fff' : textSecondary, transition: 'all .15s' }}>
                  {labels[idx]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tablet/Mobile: Filter bar */}
      {!isDesktop && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <button
            onClick={() => setMaccsSheetOpen(true)}
            style={{ flex: isMobile ? 1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 14px', background: paper, border: `1px solid ${border}`, borderRadius: 10, fontSize: 13, color: textPrimary, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <span>Filtrer les MACCs</span>
            <span style={{ fontSize: 11, color: '#fff', background: primary, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{enabledMaccs.size}/{maccs.length}</span>
          </button>
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14, alignItems: 'start' }}>

        {/* MACCs sidebar (desktop only, hidden in day view) */}
        {showSidebar && (
          <MaccsSidebar maccs={maccs} enabledMaccs={enabledMaccs} setEnabledMaccs={setEnabledMaccs} focusMacc={focusMacc} setFocusMacc={setFocusMacc} search={maccSearch} {...commonProps} />
        )}

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Un seul grid 7 colonnes : headers + cellules → alignement parfait garanti */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>

              {/* En-têtes jours */}
              {(isMobile ? FR_DAYS_SHORT : FR_DAYS).map((d, i) => (
                <div key={i} style={{ padding: isMobile ? '8px 0' : '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: i >= 5 ? alpha(textDisabled, 0.6) : textDisabled, borderRight: i < 6 ? `1px solid ${border}` : 'none', borderBottom: `1px solid ${border}`, background: alpha(primary, 0.03) }}>{d}</div>
              ))}

              {/* Cellules */}
              {cells.map((c, idx) => {
                const dayEvents  = eventsFor(c.key);
                const visible    = dayEvents.slice(0, maxChips);
                const more       = dayEvents.length - visible.length;
                const isWeekend  = c.dow === 0 || c.dow === 6;
                const isToday    = c.key === todayKey;
                const isSelected = c.key === selectedDay;
                const lastRow    = idx >= cells.length - 7;
                return (
                  <div
                    key={c.key}
                    onClick={() => handleDayClick(c.key)}
                    onDoubleClick={() => onAddEvent?.(c.key)}
                    style={{ minHeight: cellMinH, padding: isMobile ? 4 : 6, borderRight: idx % 7 < 6 ? `1px solid ${alpha(border, 0.5)}` : 'none', borderBottom: lastRow ? 'none' : `1px solid ${alpha(border, 0.5)}`, background: !c.inMonth ? alpha(bg, 0.6) : isWeekend ? alpha(primary, 0.015) : paper, cursor: 'pointer', position: 'relative', transition: 'background .12s', boxShadow: isSelected ? `inset 0 0 0 2px ${primary}` : 'none', boxSizing: 'border-box', minWidth: 0, overflow: 'hidden' }}
                    title="Clic : sélectionner — Double-clic : ajouter une affectation"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      {isToday ? (
                        <div style={{ width: isMobile ? 22 : 24, height: isMobile ? 22 : 24, borderRadius: 24, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>{c.day}</div>
                      ) : (
                        <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: !c.inMonth ? alpha(textDisabled, 0.5) : isWeekend ? textDisabled : textPrimary, fontFeatureSettings: '"tnum"', padding: isMobile ? '0 2px' : '0 4px' }}>{c.day}</div>
                      )}
                      {dayEvents.length > 0 && c.inMonth && !isMobile && (
                        <span style={{ fontSize: 10, color: textDisabled, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{dayEvents.length}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {visible.map((ev, k) => (
                        <EventChip key={k} ev={ev} macById={macById} services={services} dateKey={c.key} focusMacc={focusMacc} onEventClick={onEventClick} border={border} textDisabled={textDisabled} textSecondary={textSecondary} />
                      ))}
                      {more > 0 && <div style={{ fontSize: isMobile ? 9 : 10, color: primary, fontWeight: 600, padding: '1px 3px' }}>+{more}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === 'week' && (
          <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>

              {/* En-têtes */}
              {weekDays.map(({ key, day, month: m, dowIdx }) => {
                const isToday    = key === todayKey;
                const isWeekend  = dowIdx >= 5;
                const isSelected = key === selectedDay;
                return (
                  <div key={key} style={{ padding: isMobile ? '8px 4px' : '10px 8px', textAlign: 'center', borderRight: dowIdx < 6 ? `1px solid ${border}` : 'none', borderBottom: `1px solid ${border}`, background: isSelected ? rgba(primary, 0.06) : alpha(primary, 0.03) }}>
                    <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: isWeekend ? alpha(textDisabled, 0.6) : textDisabled }}>{isMobile ? FR_DAYS_SHORT[dowIdx] : FR_DAYS[dowIdx]}</div>
                    <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
                      {isToday ? (
                        <div style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 28, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 11 : 13, fontWeight: 700 }}>{day}</div>
                      ) : (
                        <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, color: isSelected ? primary : textPrimary, padding: '2px 6px', borderRadius: 6, background: isSelected ? rgba(primary, 0.1) : 'transparent' }}>{day}</div>
                      )}
                    </div>
                    {m !== viewMonth.getMonth() && !isMobile && (
                      <div style={{ fontSize: 9, color: textDisabled, marginTop: 1 }}>{FR_MONTHS[m].slice(0, 3)}.</div>
                    )}
                  </div>
                );
              })}

              {/* Cellules événements */}
              {weekDays.map(({ key, dowIdx }) => {
                const dayEvents  = eventsFor(key);
                const isSelected = key === selectedDay;
                return (
                  <div
                    key={key}
                    onClick={() => handleDayClick(key)}
                    onDoubleClick={() => onAddEvent?.(key)}
                    title="Clic : sélectionner — Double-clic : ajouter une affectation"
                    style={{ padding: isMobile ? 4 : 6, borderRight: dowIdx < 6 ? `1px solid ${alpha(border, 0.5)}` : 'none', minHeight: cellMinH * 2, cursor: 'pointer', boxShadow: isSelected ? `inset 0 0 0 2px ${primary}` : 'none', background: isSelected ? rgba(primary, 0.02) : 'transparent', boxSizing: 'border-box', minWidth: 0, overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dayEvents.map((ev, k) => {
                        const mac = macById[ev.maccId];
                        const svc = services[ev.serviceId];
                        if (!mac) return null;
                        const dim = !!(focusMacc && focusMacc !== ev.maccId);
                        return (
                          <div key={k} onClick={(e) => { e.stopPropagation(); onEventClick?.(key, ev); }} style={{ padding: isMobile ? '3px 5px' : '5px 7px', borderRadius: 6, background: dim ? alpha(border, 0.3) : rgba(mac.color, 0.13), borderLeft: `3px solid ${dim ? border : mac.color}`, opacity: dim ? 0.5 : 1, transition: 'all .12s', cursor: 'pointer' }}>
                            <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: dim ? textDisabled : mac.color }}>{initials(mac.name)}</div>
                            {svc && !isMobile && <div style={{ fontSize: 10, color: textSecondary, marginTop: 1 }}>{svc.label}</div>}
                            {!isMobile && <div style={{ fontSize: 10, color: textDisabled, fontFeatureSettings: '"tnum"' }}>{ev.start} – {ev.end}</div>}
                          </div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div style={{ fontSize: 10, color: alpha(textDisabled, 0.4), textAlign: 'center', marginTop: 24 }}>–</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DAY VIEW ── */}
        {view === 'day' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '220px 1fr 268px' : '1fr', gap: 14, alignItems: 'start' }}>
            {isDesktop && (
              <MaccsSidebar maccs={maccs} enabledMaccs={enabledMaccs} setEnabledMaccs={setEnabledMaccs} focusMacc={focusMacc} setFocusMacc={setFocusMacc} search={maccSearch} {...commonProps} />
            )}
            <DetailCard
              dayKey={anchorDate}
              events={(events[anchorDate] || []).filter((e) => enabledMaccs.has(e.maccId))}
              macById={macById}
              services={services}
              onAddEvent={onAddEvent}
              onEventClick={onEventClick}
              {...commonProps}
            />
          </div>
        )}

        {/* ── AGENDA / PLANNING VIEW ── */}
        {view === 'agenda' && (
          <div>
            {agendaDays.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: textDisabled, fontSize: 14, background: paper, borderRadius: 14, border: `1px solid ${border}` }}>
                Aucun événement ce mois.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {agendaDays.map(({ key, day, events: dayEvents }) => {
                  const d        = new Date(key + 'T12:00:00');
                  const isToday  = key === todayKey;
                  const dowLabel = FR_DAYS_FULL[(d.getDay() + 6) % 7];
                  return (
                    <div key={key} style={{ background: paper, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div
                        onClick={() => handleDayClick(key)}
                        onDoubleClick={() => onAddEvent?.(key)}
                        title="Double-clic : ajouter une affectation"
                        style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, background: alpha(primary, 0.03), display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                      >
                        {isToday ? (
                          <div style={{ width: 32, height: 32, borderRadius: 32, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flex: '0 0 auto' }}>{day}</div>
                        ) : (
                          <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, flex: '0 0 auto' }}>{day}</div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, textTransform: 'capitalize' }}>{dowLabel} {FR_MONTHS[d.getMonth()]}</div>
                          <div style={{ fontSize: 11, color: textSecondary }}>{dayEvents.length} affectation{dayEvents.length > 1 ? 's' : ''}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onAddEvent?.(key); }} style={{ marginLeft: 'auto', background: rgba(primary, 0.08), color: primary, border: 0, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Ajouter</button>
                      </div>
                      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {dayEvents.map((ev, i) => {
                          const mac = macById[ev.maccId];
                          const svc = services[ev.serviceId];
                          if (!mac) return null;
                          const dim = !!(focusMacc && focusMacc !== ev.maccId);
                          return (
                            <div key={i} onClick={() => onEventClick?.(key, ev)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: dim ? alpha(border, 0.3) : rgba(mac.color, 0.07), border: `1px solid ${dim ? border : rgba(mac.color, 0.18)}`, cursor: 'pointer', opacity: dim ? 0.5 : 1, transition: 'all .12s' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 32, background: mac.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: '0 0 auto' }}>{initials(mac.name)}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{mac.name}</div>
                                {svc && <div style={{ fontSize: 11, color: textSecondary }}>{svc.label}</div>}
                              </div>
                              <div style={{ fontSize: 11, color: textDisabled, fontFeatureSettings: '"tnum"', textAlign: 'right' }}>{ev.start}<br />{ev.end}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rail droit (mois + semaine, tablet + desktop) */}
        {showRailCol && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DetailCard dayKey={selectedDay} events={(events[selectedDay] || []).filter((e) => enabledMaccs.has(e.maccId))} macById={macById} services={services} onClose={() => setShowRail(false)} onAddEvent={onAddEvent} onEventClick={onEventClick} {...commonProps} />
          </div>
        )}
      </div>

      {/* FAB pour réafficher le rail */}
      {!showRail && !isMobile && (view === 'month' || view === 'week') && (
        <button onClick={() => setShowRail(true)} style={{ position: 'fixed', bottom: 28, right: 28, background: primary, color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(0,0,0,.18)', zIndex: 100 }}>
          ⮜ Afficher les détails
        </button>
      )}

      {/* MACCs bottom sheet (mobile + tablet) */}
      {!isDesktop && (
        <BottomSheet open={maccsSheetOpen} onClose={() => setMaccsSheetOpen(false)} title="Filtrer les MACCs" height="80vh">
          <MaccSheetContent
            maccs={maccs} enabledMaccs={enabledMaccs} setEnabledMaccs={setEnabledMaccs}
            focusMacc={focusMacc} setFocusMacc={setFocusMacc}
            {...commonProps}
          />
        </BottomSheet>
      )}

      {/* Day detail bottom sheet (mobile only) */}
      {isMobile && (
        <BottomSheet
          open={daySheetOpen}
          onClose={() => setDaySheetOpen(false)}
          title={(() => {
            const d = new Date(selectedDay + 'T12:00:00');
            return `${FR_DAYS_FULL[(d.getDay() + 6) % 7].charAt(0).toUpperCase() + FR_DAYS_FULL[(d.getDay() + 6) % 7].slice(1)} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
          })()}
          height="75vh"
        >
          <div style={{ padding: 16 }}>
            <DetailCard
              dayKey={selectedDay}
              events={(events[selectedDay] || []).filter((e) => enabledMaccs.has(e.maccId))}
              macById={macById} services={services}
              onAddEvent={(k) => { setDaySheetOpen(false); onAddEvent?.(k); }}
              onEventClick={onEventClick}
              {...commonProps}
            />
          </div>
        </BottomSheet>
      )}

      {/* Modal export */}
      <ExportScheduleModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        maccs={maccs}
        enabledMaccs={enabledMaccs}
        events={events}
        services={services}
        yearId={yearId}
      />
    </div>
  );
}
