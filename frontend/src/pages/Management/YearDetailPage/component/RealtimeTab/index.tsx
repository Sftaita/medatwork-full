import { useState, useMemo } from 'react';
import type { MaccsEntry } from './types';
import { statusOf } from './types';
import { DEMO_MACCS, DEMO_WEEKS } from './realtimeDemoData';
import MaccsRow from './MaccsRow';
import OverviewChart from './OverviewChart';
import styles from './RealtimeTab.module.css';

interface RealtimeTabProps {
  yearId: number | null;
}

type FilterMode = 'all' | 'alert';

// ── TODO : remplacer par un vrai appel API ────────────────────────────────────
// Quand l'endpoint GET managers/realtime/{yearId}/{month} existe :
//   const { data: maccs = [], isLoading } = useQuery({
//     queryKey: ['realtime', yearId, month],
//     queryFn: () => axiosPrivate.get(`managers/realtime/${yearId}/${month}`).then(r => r.data),
//     enabled: yearId !== null,
//   });
// Supprimer ensuite les imports DEMO_MACCS / DEMO_WEEKS.
// ─────────────────────────────────────────────────────────────────────────────

const RealtimeTab = ({ yearId }: RealtimeTabProps) => {
  void yearId; // sera utilisé par la query quand l'API sera prête

  const maccs: MaccsEntry[] = DEMO_MACCS;
  const weeks: string[]     = DEMO_WEEKS;

  const [filter, setFilter] = useState<FilterMode>('all');

  const visible = useMemo(() => {
    return maccs
      .filter(m => filter !== 'alert' || statusOf(m) === 'bad')
      .sort((a, b) => {
        const rank = (s: string) => s === 'bad' ? 0 : s === 'warn' ? 1 : 2;
        return rank(statusOf(a)) - rank(statusOf(b));
      });
  }, [maccs, filter]);

  const alertCount = useMemo(() => maccs.filter(m => statusOf(m) === 'bad').length,  [maccs]);
  const watchCount = useMemo(() => maccs.filter(m => statusOf(m) === 'warn').length, [maccs]);
  const withPrev   = useMemo(() => maccs.filter(m => m.pct !== null), [maccs]);

  // La progression moyenne exclut intentionnellement les MACCS sans prévisionnel
  const avgPct = withPrev.length
    ? Math.round(withPrev.reduce((s, m) => s + m.pct!, 0) / withPrev.length)
    : null;

  // Navigation vers ResidentParameters — le parent devrait injecter ce callback
  // quand il expose setActiveLink. Pour l'instant pas de navigation croisée.
  const handleGoToSchedule = () => { /* TODO: setActiveLink("residentParameters") */ };

  return (
    <div className={styles.wrapper} data-testid="panel-realtime">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.eyebrow}>Activité par mois</div>
        <div className={styles.title}>
          En temps réel
          <span
            className={styles['live-dot']}
            role="img"
            aria-label="En direct"
          />
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label="Filtrer les MACCS">
          <button
            className={`${styles['filter-btn']} ${filter === 'all' ? styles['filter-btn--on'] : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            Tous
            <span className={styles['filter-count']} data-testid="count-all">
              {maccs.length}
            </span>
          </button>
          <button
            className={`${styles['filter-btn']} ${filter === 'alert' ? styles['filter-btn--on'] : ''}`}
            onClick={() => setFilter('alert')}
            aria-pressed={filter === 'alert'}
          >
            En alerte
            <span className={styles['filter-count']} data-testid="count-alert">
              {alertCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────────── */}
      <div className={styles.summary} data-testid="rt-summary">
        <div className={styles.sumc}>
          <div className={styles['sumc-k']}>MACCS suivis</div>
          <div className={styles['sumc-v']} data-testid="summary-total">{maccs.length}</div>
        </div>
        <div className={`${styles.sumc} ${alertCount > 0 ? styles['sumc--alert'] : ''}`}>
          <div className={styles['sumc-k']}>En dépassement</div>
          <div className={styles['sumc-v']} data-testid="summary-alert">{alertCount}</div>
        </div>
        <div className={styles.sumc}>
          <div className={styles['sumc-k']}>À surveiller</div>
          <div className={styles['sumc-v']} data-testid="summary-watch">{watchCount}</div>
        </div>
        <div className={styles.sumc}>
          <div className={styles['sumc-k']}>Progression moy.</div>
          <div className={styles['sumc-v']} data-testid="summary-avg">
            {avgPct !== null
              ? <>{avgPct}<small>%</small></>
              : <span style={{ fontSize: 16, color: '#938c9c' }}>—</span>
            }
          </div>
        </div>
      </div>

      {/* ── MACCS list ─────────────────────────────────────────────────── */}
      <div className={styles.list} data-testid="rt-list">
        {visible.length > 0 ? (
          visible.map(m => (
            <MaccsRow
              key={m.last}
              entry={m}
              colorIndex={maccs.indexOf(m)}
              weeks={weeks}
              onGoToSchedule={handleGoToSchedule}
            />
          ))
        ) : (
          <div
            style={{ padding: '40px', textAlign: 'center', color: '#938c9c' }}
            data-testid="rt-empty"
          >
            Aucun MACCS ne correspond.
          </div>
        )}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────── */}
      <div className={styles.overview} data-testid="rt-overview">
        <h3 className={styles['overview-title']}>
          Vue d'ensemble — heures prestées par semaine
        </h3>
        <OverviewChart maccs={maccs} weeks={weeks} />
      </div>
    </div>
  );
};

export default RealtimeTab;
