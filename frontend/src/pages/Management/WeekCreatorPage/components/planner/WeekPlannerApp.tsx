import React, { useEffect, useState, useCallback, useRef, CSSProperties } from 'react';
import { toast } from 'react-toastify';
import useAxiosPrivate from '../../../../../hooks/useAxiosPrivate';
import weekTemplatesApi from '../../../../../services/weekTemplatesApi';
import { handleApiError } from '@/services/apiError';

import {
  Slot, LocalTemplate, ServerTemplate, SyncStatus, ALL_DAYS, WEEKEND_KEYS,
  serverToLocal, newLocalId, decimalToTimeStr,
} from './types';
import TopBar from './TopBar';
import TimeRuler from './TimeRuler';
import DayRow from './DayRow';
import DescriptionEditor from './DescriptionEditor';
import WeekTotals from './WeekTotals';
import DayPickerModal, { DayPickerModalState } from './DayPickerModal';

const LABEL_W = 180;   // largeur colonne Jour sticky (px) — doit correspondre à --pw-label-w
const SIDE_W  = 300;   // largeur panneau Inspecteur (px)
const CONTENT_MIN_W = 1100; // largeur minimale du contenu horaire total (label + tracks)

const CSS_VARS = `
  .pw-root {
    --pw-label-w: ${LABEL_W}px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .pw-root button:focus        { outline: none !important; box-shadow: none !important; }
  .pw-root button:focus-visible{ outline: 2px solid #a439b6 !important; outline-offset: 2px; box-shadow: none !important; }
  .pw-chips-scroll::-webkit-scrollbar { display: none; }
  @keyframes pw-spin { to { transform: rotate(360deg); } }
  .pw-spinner {
    width: 13px; height: 13px; border-radius: 50%;
    border: 2px solid #e2e8f0; border-top-color: #a439b6;
    animation: pw-spin .7s linear infinite; flex-shrink: 0;
  }
`;

const S: Record<string, CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: 'calc(100vh - 64px)',
    background: '#f8fafc', overflow: 'hidden',
  },
  topArea: { background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 },

  // 2 colonnes : plannerCard | sidePanel — grid garantit que chaque colonne reste dans ses limites
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: `minmax(0, 1fr) ${SIDE_W}px`,
    gap: 16,
    padding: 16,
    flex: 1,
    overflow: 'hidden',
    alignItems: 'start',
  },

  // Carte blanche qui contient toute la timeline
  plannerCard: {
    minWidth: 0,           // empêche la colonne de forcer le débordement
    overflow: 'hidden',    // clip interne — le scroll est dans timelineScroll
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },

  // Zone de scroll horizontal UNIQUEMENT pour la timeline
  timelineScroll: {
    overflowX: 'auto',
    overflowY: 'auto',
    flex: 1,
  },

  // Contenu interne : min-width déclenche le scroll si besoin
  timelineContent: {
    minWidth: CONTENT_MIN_W,
  },

  // Panneau droit : carte séparée, ne déborde jamais sur la grille
  sidePanel: {
    display: 'flex', flexDirection: 'column',
    gap: 12, overflowY: 'auto',
    maxHeight: '100%',
  },

  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94a3b8', fontSize: 14 },
  error:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#e11d48', fontSize: 14 },
};

function cloneSlots(slots: Record<string, Slot[]>): Record<string, Slot[]> {
  const out: Record<string, Slot[]> = {};
  for (const key of Object.keys(slots)) out[key] = [...slots[key]];
  return out;
}
function cloneTemplate(t: LocalTemplate): LocalTemplate {
  return { ...t, slots: cloneSlots(t.slots) };
}

export default function WeekPlannerApp() {
  const axiosPrivate = useAxiosPrivate();

  const [templates, setTemplates] = useState<LocalTemplate[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const [weekendVisible, setWeekendVisible] = useState(false);
  const startHour = 5;
  const endHour = 23;
  const granularity = 0.25;

  const [selected, setSelected] = useState<{ dayKey: string; localId: string } | null>(null);
  const [modal, setModal] = useState<DayPickerModalState>({
    open: false, sourceDay: '', sourceSlots: [], mode: 'replace',
  });

  // Mirror templates in a ref so async callbacks always read fresh state
  const templatesRef = useRef(templates);
  useEffect(() => { templatesRef.current = templates; }, [templates]);

  // Debounce timers per slot (keyed by localId)
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const days = weekendVisible ? ALL_DAYS : ALL_DAYS.filter(d => !WEEKEND_KEYS.has(d.key));
  const currentTemplate = templates.find(t => t.id === currentId) ?? null;
  const slots = currentTemplate?.slots ?? {};
  const selectedSlot = selected
    ? (slots[selected.dayKey] ?? []).find(s => s.localId === selected.localId) ?? null
    : null;

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { method, url } = weekTemplatesApi.getWeekTemplatesList();
        const res = await axiosPrivate[method](url);
        if (cancelled) return;
        const local = (res.data as ServerTemplate[]).map(serverToLocal);
        setTemplates(local);
        if (local.length > 0) setCurrentId(local[0].id);
      } catch (err) {
        if (!cancelled) { handleApiError(err); setLoadError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync helpers ──────────────────────────────────────────────────────────────
  const syncCall = useCallback(async (fn: () => Promise<unknown>) => {
    setSyncStatus('saving');
    try {
      await fn();
      setSyncStatus('idle');
    } catch (err) {
      handleApiError(err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  // ── Template mutations ────────────────────────────────────────────────────────
  const updateTemplate = useCallback((id: number, fn: (t: LocalTemplate) => LocalTemplate) => {
    setTemplates(prev => prev.map(t => t.id === id ? fn(t) : t));
  }, []);

  const handleCreateTemplate = useCallback(async () => {
    const tempId = -Date.now();
    const optimistic: LocalTemplate = {
      id: tempId, name: 'Nouveau modèle', description: '',
      slots: Object.fromEntries(ALL_DAYS.map(d => [d.key, []])),
    };
    // Afficher immédiatement le chip à droite de "+ Nouveau"
    setTemplates(prev => [optimistic, ...prev]);
    setCurrentId(tempId);
    setSyncStatus('saving');
    try {
      const { method, url } = weekTemplatesApi.CreateWeekTemplate();
      const res = await axiosPrivate[method](url, { title: 'Nouveau modèle', description: '', color: '#a439b6' });
      const realId: number = res.data.id;
      setTemplates(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
      setCurrentId(realId);
      setSyncStatus('idle');
    } catch (err) {
      setTemplates(prev => prev.filter(t => t.id !== tempId));
      setCurrentId(null);
      handleApiError(err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [axiosPrivate]);

  const handleRenameTemplate = useCallback((id: number, newName: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
    const { method, url } = weekTemplatesApi.UpdateWeekTemplate(id);
    axiosPrivate[method](url, { title: newName }).catch(handleApiError);
  }, [axiosPrivate]);

  const handleDeleteTemplate = useCallback(async (id: number) => {
    if (templates.length <= 1) { toast.error('Impossible de supprimer le dernier modèle'); return; }
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      if (currentId === id) setCurrentId(next[0]?.id ?? null);
      return next;
    });
    if (id > 0) {
      await syncCall(async () => {
        const { method, url } = weekTemplatesApi.DeleteWeekTemplate(id);
        await axiosPrivate[method](url);
      });
    }
  }, [axiosPrivate, syncCall, templates.length, currentId]);

  const handleDuplicateTemplate = useCallback(async () => {
    if (!currentId) return;
    const original = templatesRef.current.find(t => t.id === currentId);
    if (!original) return;

    // Compute copy name: strip existing " - Copie N" suffix, find next available
    const baseName = original.name.replace(/ - Copie( \d+)?$/, '');
    const existingNames = new Set(templatesRef.current.map(t => t.name));
    let copyName = `${baseName} - Copie`;
    let n = 2;
    while (existingNames.has(copyName)) copyName = `${baseName} - Copie ${n++}`;

    // Optimistic copy: temp negative ID, fresh localIds, no serverIds
    const tempId = -Date.now();
    const optimisticSlots: Record<string, Slot[]> = {};
    for (const key of Object.keys(original.slots)) {
      optimisticSlots[key] = original.slots[key].map(s => ({ ...s, localId: newLocalId(), serverId: undefined }));
    }
    const optimistic: LocalTemplate = { id: tempId, name: copyName, slots: optimisticSlots };

    // Insert right after original and select immediately
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === currentId);
      const next = [...prev];
      next.splice(idx + 1, 0, optimistic);
      return next;
    });
    setCurrentId(tempId);
    setSyncStatus('saving');

    try {
      const existingIds = new Set(templatesRef.current.filter(t => t.id !== tempId).map(t => t.id));

      const copyApi = weekTemplatesApi.copyTemplate(currentId);
      await axiosPrivate[copyApi.method](copyApi.url, {});

      // Rename to computed name (server gives it the original's name)
      const listApi = weekTemplatesApi.getWeekTemplatesList();
      const listRes = await axiosPrivate[listApi.method](listApi.url);
      const serverList = listRes.data as ServerTemplate[];
      const newServer = serverList.find(s => !existingIds.has(s.id));

      if (newServer) {
        // Rename silently — don't block on failure
        if (newServer.title !== copyName) {
          const renameApi = weekTemplatesApi.UpdateWeekTemplate(newServer.id);
          axiosPrivate[renameApi.method](renameApi.url, {
            title: copyName,
            description: newServer.description ?? '',
            color: newServer.color ?? '',
          }).catch(() => {/* nom affiché localement même si le rename échoue */});
        }
        const realLocal = serverToLocal({ ...newServer, title: copyName });
        setTemplates(prev => prev.map(t => t.id === tempId ? realLocal : t));
        setCurrentId(newServer.id);
      }

      setSyncStatus('idle');
    } catch (err) {
      // Rollback
      setTemplates(prev => prev.filter(t => t.id !== tempId));
      setCurrentId(currentId);
      handleApiError(err);
      toast.error('Erreur lors de la duplication');
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [axiosPrivate, currentId]);

  // ── Slot API helpers ──────────────────────────────────────────────────────────
  const apiCreateSlot = useCallback((templateId: number, dayKey: string, slot: Slot) => {
    const day = ALL_DAYS.find(d => d.key === dayKey);
    if (!day) return;
    const { method, url } = weekTemplatesApi.addTaskToWeekTemplate(templateId);
    syncCall(() =>
      axiosPrivate[method](url, {
        title: slot.name || 'Poste',
        description: `${slot.color}|${slot.description ?? ''}`,
        dayOfWeek: day.dayOfWeek,
        startTime: decimalToTimeStr(slot.start),
        endTime: decimalToTimeStr(slot.end),
        weekTemplateId: templateId,
      }).then((res: { data: { id: number } }) => {
        setTemplates(prev => prev.map(t => {
          if (t.id !== templateId) return t;
          const cl = cloneTemplate(t);
          cl.slots[dayKey] = (cl.slots[dayKey] ?? [])
            .map(s => s.localId === slot.localId ? { ...s, serverId: res.data.id } : s);
          return cl;
        }));
      })
    );
  }, [axiosPrivate, syncCall]);

  const apiUpdateSlot = useCallback((serverId: number, dayKey: string, slot: Slot) => {
    const day = ALL_DAYS.find(d => d.key === dayKey);
    if (!day) return;
    const { method, url } = weekTemplatesApi.updateWeekTask(serverId);
    syncCall(() => axiosPrivate[method](url, {
      title: slot.name || 'Poste',
      description: `${slot.color}|${slot.description ?? ''}`,
      dayOfWeek: day.dayOfWeek,
      startTime: decimalToTimeStr(slot.start),
      endTime: decimalToTimeStr(slot.end),
    }));
  }, [axiosPrivate, syncCall]);

  const apiDeleteSlot = useCallback((serverId: number) => {
    const { method, url } = weekTemplatesApi.deleteWeekTask(serverId);
    syncCall(() => axiosPrivate[method](url));
  }, [axiosPrivate, syncCall]);

  // ── Slot mutations ────────────────────────────────────────────────────────────
  const handleAddSlot = useCallback((dayKey: string, slot: Slot) => {
    if (!currentId) return;
    updateTemplate(currentId, t => {
      const cl = cloneTemplate(t);
      cl.slots[dayKey] = [...(cl.slots[dayKey] ?? []), slot].sort((a, b) => a.start - b.start);
      return cl;
    });
    apiCreateSlot(currentId, dayKey, slot);
  }, [currentId, updateTemplate, apiCreateSlot]);

  const handleUpdateSlot = useCallback((dayKey: string, localId: string, patch: Partial<Slot>) => {
    if (!currentId) return;
    updateTemplate(currentId, t => {
      const cl = cloneTemplate(t);
      cl.slots[dayKey] = (cl.slots[dayKey] ?? [])
        .map(s => s.localId === localId ? { ...s, ...patch } : s)
        .sort((a, b) => a.start - b.start);
      return cl;
    });
    // Debounce API call — only fire when user stops interacting (drag end, etc.)
    const existing = debounceMap.current.get(localId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceMap.current.delete(localId);
      const tpl = templatesRef.current.find(t => t.id === currentId);
      const slot = Object.values(tpl?.slots ?? {}).flat().find(s => s.localId === localId);
      if (slot?.serverId) apiUpdateSlot(slot.serverId, dayKey, slot);
    }, 500);
    debounceMap.current.set(localId, timer);
  }, [currentId, updateTemplate, apiUpdateSlot]);

  const handleSlotDescription = useCallback((desc: string) => {
    if (!selected) return;
    handleUpdateSlot(selected.dayKey, selected.localId, { description: desc });
  }, [selected, handleUpdateSlot]);

  const handleDeleteSlot = useCallback((dayKey: string, localId: string) => {
    if (!currentId) return;
    const tpl = templatesRef.current.find(t => t.id === currentId);
    const serverId = (tpl?.slots[dayKey] ?? []).find(s => s.localId === localId)?.serverId;
    updateTemplate(currentId, t => {
      const cl = cloneTemplate(t);
      cl.slots[dayKey] = (cl.slots[dayKey] ?? []).filter(s => s.localId !== localId);
      return cl;
    });
    setSelected(prev => prev?.localId === localId ? null : prev);
    if (serverId) apiDeleteSlot(serverId);
  }, [currentId, updateTemplate, apiDeleteSlot]);

  const handleSelectSlot = useCallback((dayKey: string, localId: string) => {
    setSelected(s => s?.localId === localId ? null : { dayKey, localId });
  }, []);

  // ── Day-level operations ──────────────────────────────────────────────────────
  const handleDuplicateDay = useCallback((dayKey: string) => {
    if (!currentId) return;
    setModal({ open: true, sourceDay: dayKey, sourceSlots: slots[dayKey] ?? [], mode: 'replace' });
  }, [currentId, slots]);

  const handleClearDay = useCallback((dayKey: string) => {
    if (!currentId) return;
    const tpl = templatesRef.current.find(t => t.id === currentId);
    const serverIds = (tpl?.slots[dayKey] ?? []).map(s => s.serverId).filter(Boolean) as number[];
    updateTemplate(currentId, t => { const cl = cloneTemplate(t); cl.slots[dayKey] = []; return cl; });
    setSelected(prev => prev?.dayKey === dayKey ? null : prev);
    serverIds.forEach(id => apiDeleteSlot(id));
  }, [currentId, updateTemplate, apiDeleteSlot]);

  const handleModalConfirm = useCallback((targetKeys: string[]) => {
    if (!currentId) return;
    const source = slots[modal.sourceDay] ?? [];
    const newSlotsByKey: Record<string, Slot[]> = {};
    updateTemplate(currentId, t => {
      const cl = cloneTemplate(t);
      for (const key of targetKeys) {
        const copies = source.map(s => ({ ...s, localId: newLocalId(), serverId: undefined }));
        newSlotsByKey[key] = copies;
        cl.slots[key] = modal.mode === 'replace'
          ? copies
          : [...(cl.slots[key] ?? []), ...copies].sort((a, b) => a.start - b.start);
        if (modal.mode === 'replace') {
          (templatesRef.current.find(t => t.id === currentId)?.slots[key] ?? [])
            .forEach(s => { if (s.serverId) apiDeleteSlot(s.serverId); });
        }
      }
      return cl;
    });
    for (const [key, copies] of Object.entries(newSlotsByKey)) {
      copies.forEach(s => apiCreateSlot(currentId, key, s));
    }
    setModal(m => ({ ...m, open: false }));
  }, [currentId, slots, modal, updateTemplate, apiCreateSlot, apiDeleteSlot]);

  const handleApplySlotToDays = useCallback(() => {
    if (!selected || !selectedSlot) return;
    setModal({ open: true, sourceDay: selected.dayKey, sourceSlots: [selectedSlot], mode: 'add',
      title: "Appliquer ce poste à d'autres jours", subtitle: 'Sélectionnez les jours cibles' });
  }, [selected, selectedSlot]);

  const handleModalConfirmSlot = useCallback((targetKeys: string[]) => {
    if (!currentId || !selectedSlot) return;
    updateTemplate(currentId, t => {
      const cl = cloneTemplate(t);
      for (const key of targetKeys) {
        const copy = { ...selectedSlot, localId: newLocalId(), serverId: undefined };
        const existing = cl.slots[key] ?? [];
        if (!existing.some(s => s.start < copy.end && s.end > copy.start)) {
          cl.slots[key] = [...existing, copy].sort((a, b) => a.start - b.start);
          apiCreateSlot(currentId, key, copy);
        }
      }
      return cl;
    });
    setModal(m => ({ ...m, open: false }));
  }, [currentId, selectedSlot, updateTemplate, apiCreateSlot]);

  const isApplyingSlot = modal.sourceSlots.length === 1;

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading)   return <div style={S.loading}>Chargement des modèles…</div>;
  if (loadError) return <div style={S.error}>Impossible de charger les modèles.</div>;

  return (
    <>
      <style>{CSS_VARS}</style>
      <div className="pw-root" style={S.root}>
        <div style={S.topArea}>
          <TopBar
            templates={templates}
            currentTemplateId={currentId}
            weekendVisible={weekendVisible}
            syncStatus={syncStatus}
            onSelectTemplate={id => { setCurrentId(id); setSelected(null); }}
            onCreateTemplate={handleCreateTemplate}
            onRenameTemplate={handleRenameTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            onToggleWeekend={() => setWeekendVisible(v => !v)}
          />
        </div>

        <div style={S.mainLayout}>
          {/* Carte planificateur — colonne gauche */}
          <div style={S.plannerCard}>
            <div style={S.timelineScroll}>
              <div style={S.timelineContent}>
                <TimeRuler startHour={startHour} endHour={endHour} />
                {days.map(day => (
                  <DayRow
                    key={day.key}
                    day={day}
                    slots={slots[day.key] ?? []}
                    startHour={startHour}
                    endHour={endHour}
                    isWeekend={WEEKEND_KEYS.has(day.key)}
                    granularity={granularity}
                    selectedId={selected?.dayKey === day.key ? (selected?.localId ?? null) : null}
                    onAddSlot={handleAddSlot}
                    onUpdateSlot={handleUpdateSlot}
                    onDeleteSlot={handleDeleteSlot}
                    onSelectSlot={handleSelectSlot}
                    onDuplicateDay={handleDuplicateDay}
                    onClearDay={handleClearDay}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Panneau Inspecteur — colonne droite */}
          <div style={S.sidePanel}>
            {currentTemplate && <WeekTotals days={days} slotsByDay={slots} />}
            <DescriptionEditor
              slot={selectedSlot}
              onChange={handleSlotDescription}
            />
          </div>
        </div>

        <DayPickerModal
          state={modal}
          days={days}
          onCancel={() => setModal(m => ({ ...m, open: false }))}
          onConfirm={isApplyingSlot ? handleModalConfirmSlot : handleModalConfirm}
        />
      </div>
    </>
  );
}
