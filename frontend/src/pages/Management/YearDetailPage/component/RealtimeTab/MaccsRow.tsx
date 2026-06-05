import { useState } from 'react';
import type { MaccsEntry } from './types';
import { statusOf, maccsInitials, SERIES_COLORS, FALLBACK_AV_COLORS } from './types';
import BarChart from './BarChart';
import ViolationModal from './ViolationModal';
import styles from './RealtimeTab.module.css';

interface MaccsRowProps {
  entry: MaccsEntry;
  /** Position index in the full MACCS array — used for fallback avatar colour */
  colorIndex: number;
  weeks: string[];
  onGoToSchedule: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  bad:  'Dépassement',
  warn: 'À surveiller',
  ok:   'Conforme',
};

const MaccsRow = ({ entry: m, colorIndex, weeks, onGoToSchedule }: MaccsRowProps) => {
  const [open,        setOpen]        = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  const st       = statusOf(m);
  const hasPrev  = m.pct !== null;
  const tresFlag = m.tresV >= 20;
  const color    = SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[colorIndex % FALLBACK_AV_COLORS.length];

  const openModal = () => setModalOpen(true);
  const handleStatusKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openModal(); }
  };

  return (
    <>
    <div
      className={[
        styles.row,
        st === 'bad'  ? styles['row--alert'] : '',
        open          ? styles['row--open']  : '',
      ].filter(Boolean).join(' ')}
      data-testid={`maccs-row-${m.last}`}
    >
      {/* ── Row header ───────────────────────────────────────────────────── */}
      <div
        className={styles['row-main']}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={`rt-detail-${m.last}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        {/* Chevron */}
        <span
          className={`${styles.chevron} ${open ? styles['chevron--open'] : ''}`}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 5l5 5-5 5" />
          </svg>
        </span>

        {/* Avatar + name */}
        <div className={styles.who}>
          <span className={styles.avatar} style={{ background: color }} aria-hidden="true">
            {maccsInitials(m.name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className={styles.nm}>{m.name}</div>
            {hasPrev
              ? <div className={styles.meta}>{m.prevH}h prévues</div>
              : (
                <div
                  className={`${styles.meta} ${styles['meta--undef']}`}
                  data-testid={`no-prev-${m.last}`}
                >
                  prévisionnel non établi
                </div>
              )
            }
          </div>
        </div>

        {/* Progress block */}
        {hasPrev ? (
          <div className={`${styles.prog} ${m.pct! >= 100 ? styles['prog--full'] : ''}`}>
            <div className={styles['prog-top']}>
              <span className={styles['prog-h']}>{m.totH}</span>
              <span className={styles['prog-of']}>/ {m.prevH}h</span>
              <span className={styles['prog-pct']}>{m.pct}%</span>
            </div>
            <div className={styles['prog-bar']}>
              <i style={{ width: `${Math.min(m.pct!, 100)}%` }} />
            </div>
          </div>
        ) : (
          <div className={`${styles.prog} ${styles['prog--noprev']}`}>
            <div className={styles['prog-top']}>
              <span className={styles['prog-h']}>{m.totH}</span>
              <span className={styles['prog-of']}>prestées</span>
              <span className={`${styles['prog-pct']} ${styles['prog-pct--none']}`}>cible —</span>
            </div>
            <div className={`${styles['prog-bar']} ${styles['prog-bar--ghost']}`} />
          </div>
        )}

        {/* Metrics chips */}
        <div className={styles.mchips}>
          <div className={styles.mchip}>
            <div className={styles.lab}>
              <span className={styles.pin} style={{ background: '#d99214' }} />
              Inconf.
            </div>
            <div className={styles.val}>{m.inconf}</div>
          </div>
          <div className={styles.mchip}>
            <div className={styles.lab}>
              <span className={styles.pin} style={{ background: '#d6483f' }} />
              Très inc.
            </div>
            <div className={`${styles.val} ${tresFlag ? styles['val--bad'] : ''}`}>{m.tres}</div>
          </div>
          <div className={styles.mchip}>
            <div className={styles.lab}>
              <span className={styles.pin} style={{ background: '#5d5765' }} />
              Congés
            </div>
            <div className={styles.val}>{m.conge.used}</div>
          </div>
          <div
            className={`${styles.status} ${styles[`status--${st}`]}`}
            data-testid={`status-${m.last}`}
            onClick={st === 'bad' ? (e) => { e.stopPropagation(); openModal(); } : undefined}
            role={st === 'bad' ? 'button' : undefined}
            tabIndex={st === 'bad' ? 0 : undefined}
            onKeyDown={st === 'bad' ? handleStatusKeyDown : undefined}
            title={st === 'bad' ? 'Voir les violations légales' : undefined}
          >
            <span className={styles['status-dot']} />
            {STATUS_LABELS[st]}
          </div>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          id={`rt-detail-${m.last}`}
          className={styles.detail}
          data-testid={`detail-${m.last}`}
        >
          <div className={styles['detail-inner']}>
            {/* KPIs */}
            <div className={styles['kpi-block']}>
              <h4 className={styles['block-title']}>Indicateurs du mois</h4>
              <div className={styles['kpi-grid']}>
                <div className={styles.kpi}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#2f9e5b' }} />
                    Heures totales
                  </div>
                  <div className={styles['kpi-val']}>
                    {m.totH}
                    {hasPrev
                      ? <small> / {m.prevH}h</small>
                      : <small className={styles['kpi-undef']}> / prévu non défini</small>
                    }
                  </div>
                </div>

                <div className={styles.kpi}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#d99214' }} />
                    Inconfortables
                  </div>
                  <div className={styles['kpi-val']}>{m.inconf}</div>
                </div>

                <div className={`${styles.kpi} ${tresFlag ? styles['kpi--flag'] : ''}`}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#d6483f' }} />
                    Très inconfortables
                  </div>
                  <div className={styles['kpi-val']}>{m.tres}</div>
                </div>

                <div className={styles.kpi}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#7B3FA0' }} />
                    Gardes appelables
                  </div>
                  <div className={styles['kpi-val']}>{m.app}</div>
                </div>

                <div className={styles.kpi}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#2A6FDB' }} />
                    Gardes sur place
                  </div>
                  <div className={styles['kpi-val']}>{m.place}</div>
                </div>

                <div className={styles.kpi}>
                  <div className={styles['kpi-lab']}>
                    <span className={styles.pin} style={{ background: '#5d5765' }} />
                    Jours de congé
                  </div>
                  <div className={styles['kpi-val']}>
                    {m.conge.used} <small>/ {m.conge.total}</small>
                  </div>
                </div>
              </div>

              {/* Congés detail */}
              <div className={styles.conge}>
                <div className={styles['conge-title']}>
                  Détail des congés · {m.conge.used}/{m.conge.total} jours
                </div>
                {m.conge.items.map((item, ii) => {
                  const pct = item.b
                    ? Math.round((item.a / item.b) * 100)
                    : (item.a ? 100 : 0);
                  return (
                    <div key={ii} className={styles['conge-row']}>
                      <span className={styles['conge-nm']}>{item.nm}</span>
                      <span className={styles['conge-bar']}><i style={{ width: `${pct}%` }} /></span>
                      <span className={styles['conge-n']}>{item.a}/{item.b}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart block */}
            <div>
              <h4 className={styles['block-title']}>Horaire prévisionnel</h4>

              <div className={styles.legend}>
                {hasPrev ? (
                  <>
                    <span>
                      <span className={styles.sw} style={{ background: '#2f9e5b' }} />
                      Heures prestées
                    </span>
                    <span>
                      <span className={styles.sw} style={{ background: '#d9c2ec' }} />
                      Heures prévisionnelles
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      <span className={styles.sw} style={{ background: '#2f9e5b' }} />
                      Heures prestées
                    </span>
                    <span className={styles['legend-muted']}>
                      <span className={styles.sw} style={{ background: '#e2dee8' }} />
                      Prévisionnelles — non établies
                    </span>
                  </>
                )}
              </div>

              {!hasPrev && (
                <div
                  className={styles['prev-empty']}
                  data-testid={`prev-empty-${m.last}`}
                >
                  <svg
                    width="16" height="16" viewBox="0 0 20 20"
                    fill="none" stroke="currentColor" strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="14" height="13" rx="2" />
                    <path d="M3 8h14M7 3v3M13 3v3M9 12l2 2 3-4" />
                  </svg>
                  Aucun horaire prévisionnel établi pour ce mois.
                  <button
                    className={styles['prev-cta']}
                    onClick={e => { e.stopPropagation(); onGoToSchedule(); }}
                    data-testid={`go-to-schedule-${m.last}`}
                  >
                    Établir l'horaire
                  </button>
                </div>
              )}

              <BarChart weeks={weeks} prest={m.week.prest} prev={m.week.prev} />
            </div>
          </div>
        </div>
      )}
    </div>

    {modalOpen && (
      <ViolationModal
        entry={m}
        weeks={weeks}
        onClose={() => setModalOpen(false)}
      />
    )}
    </>
  );
};

export default MaccsRow;
