import { useEffect } from 'react';
import type { MaccsEntry } from './types';
import { THRESHOLDS } from './types';
import styles from './RealtimeTab.module.css';

interface ViolationModalProps {
  entry: MaccsEntry;
  weeks: string[];
  onClose: () => void;
}

const ViolationModal = ({ entry: m, weeks, onClose }: ViolationModalProps) => {
  // Fermeture au clavier (Escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const peak    = Math.max(...m.week.prest);
  const peakIdx = m.week.prest.indexOf(peak);

  // Raisons du dépassement
  const reasons: string[] = [];
  if (peak > THRESHOLDS.abs)
    reasons.push(`Pic hebdomadaire de ${peak}h (${weeks[peakIdx]}) — limite absolue : 72h`);
  if (m.pct !== null && m.pct >= 100)
    reasons.push(`Progression mensuelle : ${m.totH} / ${m.prevH}h prévues (${m.pct}%)`);

  // Avertissement complémentaire
  const tresWarn = m.tresV >= 20;

  // Couleur de chaque semaine
  const weekColor = (h: number) =>
    h > THRESHOLDS.abs ? '#d6483f' :
    h > THRESHOLDS.max ? '#d99214' :
    '#2f9e5b';

  return (
    <div
      className={styles['modal-backdrop']}
      role="dialog"
      aria-modal="true"
      aria-label={`Violations légales — ${m.name}`}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        data-testid={`violation-modal-${m.last}`}
      >
        {/* Header */}
        <div className={styles['modal-header']}>
          <div>
            <div className={styles['modal-eyebrow']}>Dépassement légal</div>
            <div className={styles['modal-title']}>{m.name}</div>
          </div>
          <button
            className={styles['modal-close']}
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles['modal-body']}>
          {/* Raisons principales */}
          <div className={styles['modal-section-title']}>
            Motifs de dépassement
          </div>
          <ul className={styles['violation-list']}>
            {reasons.map((r, i) => (
              <li key={i} className={styles['violation-item']}>
                <span className={styles['violation-dot']} style={{ background: '#d6483f' }} />
                {r}
              </li>
            ))}
          </ul>

          {/* Pénibilité RH — informatif, pas un critère légal */}
          {tresWarn && (
            <>
              <div className={styles['modal-section-title']} style={{ marginTop: 16 }}>
                Pénibilité RH (informatif)
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: '#fbf1dd', borderRadius: 8, padding: '10px 12px',
                fontSize: 13, color: '#26222b', lineHeight: 1.4,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d99214', flexShrink: 0, marginTop: 4 }} />
                <span>
                  {m.tres} travaillées les dimanches et jours fériés.{' '}
                  <span style={{ color: '#938c9c', fontSize: 12 }}>
                    Signal RH — non inclus dans l'évaluation légale.
                  </span>
                </span>
              </div>
            </>
          )}

          {/* Tableau hebdomadaire */}
          <div className={styles['modal-section-title']} style={{ marginTop: 16 }}>
            Détail par semaine
          </div>
          <table className={styles['week-table']}>
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Heures prestées</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const h    = m.week.prest[i];
                const col  = weekColor(h);
                const flag = h > THRESHOLDS.abs ? 'Au-delà 72h' :
                             h > THRESHOLDS.max ? 'Au-delà 60h' : 'Conforme';
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{w}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: col, fontWeight: 700 }}>{h}h</td>
                    <td>
                      <span className={styles['week-flag']} style={{ color: col }}>
                        {flag}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Légende seuils */}
          <div className={styles['modal-legend']}>
            <span style={{ color: '#2f9e5b' }}>● 48h</span> cible légale
            <span style={{ color: '#d99214', marginLeft: 12 }}>● 60h</span> max opting-out
            <span style={{ color: '#d6483f', marginLeft: 12 }}>● 72h</span> limite absolue
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationModal;
