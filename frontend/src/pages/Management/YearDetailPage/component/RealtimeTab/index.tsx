import { useState, useMemo, useEffect, useCallback } from 'react';
import type { MaccsEntry } from './types';
import { statusOf } from './types';
import { DEMO_MACCS, DEMO_WEEKS } from './realtimeDemoData';
import MaccsRow from './MaccsRow';
import OverviewChart from './OverviewChart';
import ReportModal from './ReportModal';
import { downloadExportPdf, downloadPresentationPdf, presentationPdfToBase64 } from './exportRealtimePdf';
import realtimeReportApi from '../../../../../services/realtimeReportApi';
import useAxiosPrivate from '../../../../../hooks/useAxiosPrivate';
import styles from './RealtimeTab.module.css';

interface RealtimeTabProps {
  yearId: number | null;
}

type FilterMode = 'all' | 'alert';
type Toast = { type: 'success' | 'error'; msg: string } | null;

const FR_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const RealtimeTab = ({ yearId }: RealtimeTabProps) => {
  const axiosPrivate = useAxiosPrivate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [maccs,     setMaccs]     = useState<MaccsEntry[]>(DEMO_MACCS);
  const [weeks,     setWeeks]     = useState<string[]>(DEMO_WEEKS);
  const [yearTitle, setYearTitle] = useState<string>('');
  const [loading,   setLoading]   = useState<boolean>(false);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [filter, setFilter]               = useState<FilterMode>('all');
  const [month,  setMonth]                = useState<number>(new Date().getMonth() + 1);
  const [reportModalOpen, setReportModal] = useState<boolean>(false);
  const [sending, setSending]             = useState<boolean>(false);
  const [toast,   setToast]               = useState<Toast>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (yearId === null) return;
    setLoading(true);
    try {
      const res = await axiosPrivate.get<{
        maccs: MaccsEntry[];
        weeks: string[];
        yearTitle: string;
      }>(`manager/years/${yearId}/realtime/${month}`);
      setMaccs(res.data.maccs);
      setWeeks(res.data.weeks);
      setYearTitle(res.data.yearTitle);
    } catch {
      // Fallback sur les données de démo si l'API n'est pas encore disponible
      setMaccs(DEMO_MACCS);
      setWeeks(DEMO_WEEKS);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, yearId, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Dérivés ──────────────────────────────────────────────────────────────────
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

  const avgPct = withPrev.length
    ? Math.round(withPrev.reduce((s, m) => s + m.pct!, 0) / withPrev.length)
    : null;

  // ── Mois courant affiché ──────────────────────────────────────────────────────
  const monthLabel = `${FR_MONTHS[month - 1]} ${new Date().getFullYear()}`;
  const monthStr   = FR_MONTHS[month - 1]; // utilisé dans les PDF et l'email

  // ── Actions export ────────────────────────────────────────────────────────────
  const title = yearTitle || 'Année';

  const handleExportPdf = () => {
    downloadExportPdf(maccs, weeks, title, monthStr);
  };

  const handlePresentationPdf = () => {
    downloadPresentationPdf(maccs, weeks, title, monthStr);
  };

  const handleSendReport = async () => {
    setReportModal(false);
    setSending(true);
    setToast(null);
    try {
      const pdfBase64 = presentationPdfToBase64(maccs, weeks, title, monthStr);
      const result    = await realtimeReportApi.emailManagers(yearId!, pdfBase64, monthStr);
      const skipped   = result.skipped ?? 0;

      if (result.sent === 0 && skipped > 0) {
        setToast({
          type: 'success',
          msg: `Aucun envoi — ${skipped} manager${skipped > 1 ? 's ont' : ' a'} désactivé les emails pour ce rapport.`,
        });
      } else {
        let msg = `Rapport envoyé à ${result.sent} manager${result.sent > 1 ? 's' : ''}.`;
        if (skipped > 0) {
          msg += ` ${skipped} ignoré${skipped > 1 ? 's' : ''} (préférences email).`;
        }
        setToast({ type: 'success', msg });
      }
    } catch {
      setToast({ type: 'error', msg: 'Échec de l\'envoi. Réessayez.' });
    } finally {
      setSending(false);
    }
  };

  const handleGoToSchedule = () => { /* TODO: setActiveLink("residentParameters") */ };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper} data-testid="panel-realtime">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
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

        <div className={styles['header-actions']}>
          {/* Rapport RH */}
          <button
            className={`${styles['export-btn']} ${styles['export-btn--violet']}`}
            onClick={handlePresentationPdf}
            disabled={loading || maccs.length === 0}
            data-testid="btn-presentation-pdf"
            title="Télécharger le rapport de présentation RH (4 pages)"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 3v10M6 9l4 4 4-4" /><path d="M4 17h12" />
            </svg>
            Rapport RH
          </button>

          {/* Envoyer aux managers */}
          <button
            className={`${styles['export-btn']} ${styles['export-btn--send']}`}
            onClick={() => setReportModal(true)}
            disabled={loading || sending || maccs.length === 0 || yearId === null}
            data-testid="btn-send-report"
            title="Envoyer le rapport de présentation par email aux managers de l'année"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M2 4h16l-8 8-8-8z" /><path d="M2 4v12h16V4" />
            </svg>
            {sending ? 'Envoi…' : 'Envoyer aux managers'}
          </button>
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

        {/* Sélecteur de mois */}
        <div className={styles['month-nav']} role="group" aria-label="Naviguer entre les mois">
          <button
            className={styles['month-nav-btn']}
            onClick={() => setMonth(m => Math.max(1, m - 1))}
            disabled={month === 1 || loading}
            aria-label="Mois précédent"
            data-testid="month-prev"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </button>
          <span className={styles['month-label']} data-testid="month-label">
            {monthLabel}
          </span>
          <button
            className={styles['month-nav-btn']}
            onClick={() => setMonth(m => Math.min(12, m + 1))}
            disabled={month === 12 || loading}
            aria-label="Mois suivant"
            data-testid="month-next"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 5l5 5-5 5" />
            </svg>
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
        {loading ? (
          <div className={styles.loading} data-testid="rt-loading">
            <span className={styles.spinner} aria-hidden="true" />
            Chargement…
          </div>
        ) : visible.length > 0 ? (
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

        {/* Toast retour envoi */}
        {toast && (
          <div
            className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
            data-testid="rt-toast"
          >
            {toast.msg}
            <button
              onClick={() => setToast(null)}
              aria-label="Fermer"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles['overview-actions']}>
          <h3 className={styles['overview-title']}>
            Vue d'ensemble — heures prestées par semaine
          </h3>
          <button
            className={`${styles['export-btn']} ${styles['export-btn--outline']}`}
            onClick={handleExportPdf}
            disabled={loading || maccs.length === 0}
            data-testid="btn-export-pdf"
            title="Exporter le graphique en PDF"
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 3v10M6 9l4 4 4-4" /><path d="M4 17h12" />
            </svg>
            Export PDF
          </button>
        </div>

        <OverviewChart maccs={maccs} weeks={weeks} />
      </div>

      {/* ── Modal confirmation envoi ────────────────────────────────────── */}
      {reportModalOpen && (
        <ReportModal
          yearTitle={title}
          month={monthStr}
          sending={sending}
          onConfirm={handleSendReport}
          onCancel={() => setReportModal(false)}
        />
      )}
    </div>
  );
};

export default RealtimeTab;
