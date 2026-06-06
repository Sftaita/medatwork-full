import styles from './RealtimeTab.module.css';

interface ReportModalProps {
  yearTitle: string;
  month:     string;
  sending:   boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

const ReportModal = ({ yearTitle, month, sending, onConfirm, onCancel }: ReportModalProps) => (
  <div className={styles['modal-backdrop']} role="dialog" aria-modal="true" onClick={onCancel}>
    <div
      className={styles.modal}
      style={{ maxWidth: 420 }}
      onClick={e => e.stopPropagation()}
      data-testid="report-confirm-modal"
    >
      <div className={styles['modal-header']}>
        <div>
          <div className={styles['modal-eyebrow']} style={{ color: '#7B3FA0' }}>
            Envoi du rapport
          </div>
          <div className={styles['modal-title']}>Envoyer aux managers</div>
        </div>
        <button className={styles['modal-close']} onClick={onCancel} aria-label="Fermer la fenêtre">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 5l10 10M15 5l-10 10" />
          </svg>
        </button>
      </div>

      <div className={styles['modal-body']}>
        <p style={{ fontSize: 13, color: '#26222b', lineHeight: 1.6, marginBottom: 16 }}>
          Le rapport de présentation PDF pour{' '}
          <strong>{yearTitle}</strong> ({month}) sera envoyé par email à{' '}
          <strong>tous les managers liés à cette année</strong>.
        </p>
        <p style={{ fontSize: 12, color: '#938c9c', marginBottom: 20 }}>
          Aucun email ne sera envoyé aux MACCS.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={sending}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid #e2dee8', background: '#fff',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            data-testid="report-confirm-btn"
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: 'none', background: '#7B3FA0',
              color: '#fff', fontSize: 13,
              cursor: sending ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? 'Envoi en cours…' : 'Confirmer l\'envoi'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ReportModal;
