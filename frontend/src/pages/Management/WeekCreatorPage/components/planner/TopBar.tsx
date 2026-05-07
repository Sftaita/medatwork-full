import React, { CSSProperties, useRef, useEffect, useState } from 'react';
import { LocalTemplate, SyncStatus } from './types';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';

const S: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '20px 28px 10px 28px', gap: 20, flexWrap: 'wrap',
  },
  left: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 },
  title: {
    fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
    margin: 0, color: '#0f172a',
  },
  titleInput: {
    fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
    margin: 0, border: '1px solid #c084fc', borderRadius: 6,
    padding: '2px 8px', outline: 'none', minWidth: 240, fontFamily: 'inherit',
  },
  chipsRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  chipsLabel: {
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    flexShrink: 0, alignSelf: 'center',
  },
  divider: {
    width: 1, height: 18, background: '#e2e8f0', flexShrink: 0, alignSelf: 'center',
  },
  chipsScroll: {
    display: 'flex', alignItems: 'center', gap: 6,
    overflowX: 'auto', overflowY: 'hidden',
    scrollbarWidth: 'none' as const,
    WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
    cursor: 'grab',
    userSelect: 'none',
    flex: 1, minWidth: 0,
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', border: '1px solid #e2e8f0', borderRadius: 999,
    fontSize: 12, fontWeight: 500, color: '#334155', background: '#fff',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all .15s', outline: 'none',
  },
  chipActive: {
    background: '#faf5ff', border: '1px solid #d8b4fe', color: '#7e22ce', fontWeight: 600,
  },
  chipNew: { border: '1px dashed #cbd5e1', color: '#64748b' },
  chipInput: {
    display: 'inline-flex', alignItems: 'center',
    padding: '5px 11px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: '#7e22ce',
    background: '#faf5ff', border: '1px solid #c084fc',
    outline: 'none', minWidth: 100, fontFamily: 'inherit',
  },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '8px 13px', border: '1px solid #e2e8f0', borderRadius: 8,
    background: '#fff', cursor: 'pointer', fontSize: 13,
    fontWeight: 500, color: '#334155', fontFamily: 'inherit',
  },
  toggleBtnActive: { background: '#faf5ff', borderColor: '#d8b4fe', color: '#7e22ce' },
  ghostBtn: {
    padding: '8px 13px', background: '#fff', color: '#334155',
    border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
    fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },
  syncDot: {
    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
  },
  syncWrap: {
    display: 'flex', alignItems: 'center', gap: 6,
    width: 90, justifyContent: 'flex-start',
  },
  syncLabel: { fontSize: 11, fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' },
  deleteX: {
    position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
    width: 16, height: 16, borderRadius: '50%',
    border: 'none', background: '#94a3b8', color: '#fff',
    cursor: 'pointer', fontSize: 10, lineHeight: 1,
    display: 'grid', placeItems: 'center', padding: 0,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,17,21,0.4)',
    display: 'grid', placeItems: 'center', zIndex: 300, backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff', borderRadius: 14, width: 'min(380px, 90vw)',
    boxShadow: '0 20px 50px rgba(15,17,21,0.16)', padding: '24px 24px 20px',
  },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' },
  modalSub: { fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  modalCancel: {
    padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#334155',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  modalConfirm: {
    padding: '8px 16px', background: '#e11d48', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff',
    cursor: 'pointer', fontFamily: 'inherit',
  },
};

interface Props {
  templates: LocalTemplate[];
  currentTemplateId: number | null;
  weekendVisible: boolean;
  syncStatus: SyncStatus;
  onSelectTemplate: (id: number) => void;
  onCreateTemplate: () => void;
  onRenameTemplate: (id: number, name: string) => void;
  onDeleteTemplate: (id: number) => void;
  onDuplicateTemplate: () => void;
  onToggleWeekend: () => void;
}

export default function TopBar({
  templates, currentTemplateId, weekendVisible, syncStatus,
  onSelectTemplate, onCreateTemplate, onRenameTemplate,
  onDeleteTemplate, onDuplicateTemplate, onToggleWeekend,
}: Props) {
  const [editingChipId, setEditingChipId] = React.useState<number | null>(null);
  const [chipDraft, setChipDraft] = React.useState('');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const [chipsDrag, setChipsDrag] = useState<{ startX: number; startScroll: number } | null>(null);

  const handleChipsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('input')) return;
    const el = scrollRef.current;
    if (!el) return;
    didDragRef.current = false;
    setChipsDrag({ startX: e.clientX, startScroll: el.scrollLeft });
    el.style.cursor = 'grabbing';
  };

  useEffect(() => {
    if (!chipsDrag) return;
    const el = scrollRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (Math.abs(e.clientX - chipsDrag.startX) > 4) didDragRef.current = true;
      el.scrollLeft = chipsDrag.startScroll - (e.clientX - chipsDrag.startX);
    };
    const onUp = () => {
      el.style.cursor = 'grab';
      setChipsDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [chipsDrag]);

  const commitChip = () => {
    if (editingChipId !== null && chipDraft.trim()) {
      onRenameTemplate(editingChipId, chipDraft.trim());
    }
    setEditingChipId(null);
  };

  const tplToDelete = confirmDeleteId !== null ? templates.find(t => t.id === confirmDeleteId) : null;

  return (
    <>
    <div style={S.wrap}>
      <div style={S.left}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={S.title}>Semaines modèles</h1>
          <Tooltip title="Guide d'utilisation" arrow>
            <IconButton size="small" onClick={() => setTutorialOpen(true)} sx={{ color: 'text.secondary' }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        <div style={S.chipsRow}>
          <span style={S.chipsLabel}>Modèles</span>
          <div style={S.divider} />
          <div
            ref={scrollRef}
            className="pw-chips-scroll"
            style={S.chipsScroll}
            onMouseDown={handleChipsMouseDown}
          >
            <button
              style={{ ...S.chip, ...S.chipNew }}
              onClick={() => { if (!didDragRef.current) onCreateTemplate(); }}
            >
              + Nouveau
            </button>

            {templates.map(tpl => {
              const active = tpl.id === currentTemplateId;
              if (editingChipId === tpl.id) {
                return (
                  <input
                    key={tpl.id}
                    autoFocus
                    value={chipDraft}
                    onChange={e => setChipDraft(e.target.value)}
                    onBlur={commitChip}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitChip();
                      if (e.key === 'Escape') setEditingChipId(null);
                    }}
                    style={S.chipInput}
                  />
                );
              }
              return (
                <span
                  key={tpl.id}
                  style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                >
                  <button
                    style={{
                      ...S.chip, ...(active ? S.chipActive : undefined),
                      paddingRight: active && templates.length > 1 ? 26 : undefined,
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { if (!didDragRef.current) onSelectTemplate(tpl.id); }}
                    onDoubleClick={() => { setEditingChipId(tpl.id); setChipDraft(tpl.name); }}
                    title="Double-cliquer pour renommer"
                  >
                    {active && '● '}{tpl.name}
                  </button>
                  {active && templates.length > 1 && (
                    <button
                      style={S.deleteX as CSSProperties}
                      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(tpl.id); }}
                      title="Supprimer ce modèle"
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <div style={S.divider} />
        </div>
      </div>

      <div style={S.right}>
        <button
          style={{ ...S.toggleBtn, ...(weekendVisible ? S.toggleBtnActive : undefined) }}
          onClick={onToggleWeekend}
        >
          {weekendVisible ? '✓' : '+'} Week-end
        </button>
        <button style={S.ghostBtn} onClick={onDuplicateTemplate}>
          Dupliquer
        </button>
        <div style={S.syncWrap}>
          {syncStatus === 'saving' ? (
            <div className="pw-spinner" />
          ) : (
            <div style={{
              ...S.syncDot,
              background: syncStatus === 'error' ? '#e11d48' : '#22c55e',
            }} />
          )}
          <span style={S.syncLabel}>
            {syncStatus === 'error' ? 'Erreur' : 'Sauvegardé'}
          </span>
        </div>
      </div>
    </div>

    <Dialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon color="primary" />
          <Typography variant="h6" component="span">Guide — Semaines modèles</Typography>
        </Box>
        <IconButton size="small" onClick={() => setTutorialOpen(false)}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {[
            { e: '📋', t: 'Modèles de semaine', d: "Chaque onglet en haut représente un modèle de semaine réutilisable (ex : « Semaine normale », « Semaine de garde »). Vous pouvez en créer autant que nécessaire et basculer entre eux en un clic. Double-cliquez sur un onglet pour le renommer." },
            { e: '➕', t: 'Créer un poste', d: "Cliquez sur une ligne de jour et glissez horizontalement pour dessiner un créneau. Relâchez pour le créer — sa durée est définie par l'amplitude du geste. Minimum 15 minutes." },
            { e: '✏️', t: 'Modifier un poste', d: "Double-cliquez sur un poste pour modifier son nom et sa couleur directement dans la grille, sans quitter le planning. Appuyez sur Entrée ou cliquez ailleurs pour valider." },
            { e: '↔️', t: 'Déplacer et redimensionner', d: "Glissez un poste pour le déplacer sur la même journée. Utilisez les poignées sur les bords gauche et droit pour ajuster sa durée. Les chevauchements sont automatiquement bloqués." },
            { e: '⎘',  t: 'Copier vers d\'autres jours', d: "Cliquez sur « Copier » dans la colonne d'un jour pour dupliquer tous ses postes vers un ou plusieurs autres jours en une seule action." },
            { e: '📝', t: 'Description d\'un poste', d: "Sélectionnez un poste pour afficher l'éditeur de description dans le panneau de droite. Ajoutez des notes, des consignes ou des remarques — tout est sauvegardé automatiquement." },
            { e: '💾', t: 'Sauvegarde automatique', d: "Chaque action (création, déplacement, suppression, description) est synchronisée en temps réel avec le serveur. L'indicateur en haut à droite confirme l'état de la sauvegarde." },
          ].map(({ e, t, d }) => (
            <Box key={t} sx={{ display: 'flex', gap: 1.5 }}>
              <Typography sx={{ fontSize: '1.4rem', lineHeight: 1, mt: 0.25, flexShrink: 0 }}>{e}</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t}</Typography>
                <Typography variant="body2" color="text.secondary">{d}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={() => setTutorialOpen(false)} variant="contained" size="small">Compris !</Button>
      </DialogActions>
    </Dialog>

    {tplToDelete && (
      <div style={S.overlay} onClick={() => setConfirmDeleteId(null)}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>
          <p style={S.modalTitle}>Supprimer ce modèle ?</p>
          <p style={S.modalSub}>
            Le modèle <strong>«&nbsp;{tplToDelete.name}&nbsp;»</strong> et tous ses postes seront
            supprimés définitivement. Cette action est irréversible.
          </p>
          <div style={S.modalActions}>
            <button style={S.modalCancel} onClick={() => setConfirmDeleteId(null)}>
              Annuler
            </button>
            <button
              style={S.modalConfirm}
              onClick={() => { onDeleteTemplate(confirmDeleteId!); setConfirmDeleteId(null); }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
