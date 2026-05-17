import React, { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";
import type { WeekInterval, YearWeekTemplate, ResidentAssignment } from "@/store/weekDispatcherStore";
import { handleApiError } from "@/services/apiError";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme, alpha } from "@mui/material/styles";
import YearSelect from "../../../../../components/YearSelect";

import WeekScheduleTable, { type WSTPerson, type WSTPoste, type WSTWeek } from "./WeekScheduleTable";
import WeekTemplateImport from "./WeekTemplateImport";

// ── Color palette for residents ───────────────────────────────────────────────

const PALETTE = [
  '#9C27B0', '#e85a6a', '#3aa676', '#5b8def',
  '#f0a93b', '#1fb3d6', '#d05a8a', '#6b6bd6',
  '#e8853b', '#3F7A4E', '#7b3fa0', '#E8625A',
];

const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

// ── Pending op helpers ────────────────────────────────────────────────────────

interface PendingOp {
  method: "create" | "delete";
  residentId: number;
  yearWeekTemplateId: number;
  weekIntervalId: number;
}

function upsertPendingOp(prev: unknown[], newOp: PendingOp): unknown[] {
  const key = `${newOp.yearWeekTemplateId}-${newOp.weekIntervalId}`;
  return [
    ...(prev as PendingOp[]).filter((op) => `${op.yearWeekTemplateId}-${op.weekIntervalId}` !== key),
    newOp,
  ];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const N_COLS = 8;  // colonnes semaine simulées
const N_ROWS = 5;  // lignes poste simulées

function WeekDispatcherSkeleton() {
  const theme  = useTheme();
  const bg     = theme.palette.background.default;
  const paper  = theme.palette.background.paper;
  const border = theme.palette.divider;
  const soft   = alpha(theme.palette.divider, 0.5);

  const cellW  = 110;
  const labelW = 200;

  return (
    <div style={{ fontFamily: 'inherit', background: bg, padding: 24, boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton variant="text" width={80}  height={14} />
          <Skeleton variant="text" width={260} height={32} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '10px 14px', background: paper,
        border: `1px solid ${border}`, borderRadius: 12,
        marginBottom: 12,
      }}>
        <Skeleton variant="rounded" width={260} height={38} sx={{ borderRadius: 2 }} />
        <div style={{ flex: 1 }} />
        <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={80}  height={14} />
        <Skeleton variant="rounded" width={1}   height={18} sx={{ mx: '4px' }} />
        <Skeleton variant="rounded" width={140} height={34} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={80}  height={34} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={100} height={34} sx={{ borderRadius: 1 }} />
      </div>

      {/* ── Main grid : schedule + rail ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

        {/* Schedule card */}
        <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>

          {/* Month header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${labelW}px repeat(${N_COLS}, ${cellW}px)`,
            borderBottom: `1px solid ${border}`,
            background: alpha(theme.palette.primary.main, 0.03),
          }}>
            <div style={{ padding: '10px 16px', borderRight: `1px solid ${border}` }}>
              <Skeleton width={40} height={12} />
            </div>
            {Array.from({ length: N_COLS }).map((_, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRight: i === N_COLS - 1 ? 'none' : `1px solid ${border}` }}>
                {i === 0 && <Skeleton width={60} height={12} />}
                {i === 4 && <Skeleton width={50} height={12} />}
              </div>
            ))}
          </div>

          {/* Week header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${labelW}px repeat(${N_COLS}, ${cellW}px)`,
            borderBottom: `1px solid ${border}`,
          }}>
            <div style={{ padding: '10px 16px', borderRight: `1px solid ${border}` }}>
              <Skeleton width={60} height={13} />
            </div>
            {Array.from({ length: N_COLS }).map((_, i) => (
              <div key={i} style={{
                padding: '8px 4px', textAlign: 'center',
                borderRight: i === N_COLS - 1 ? 'none' : `1px solid ${soft}`,
              }}>
                <Skeleton width={28} height={14} sx={{ mx: 'auto', mb: '2px' }} />
                <Skeleton width={22} height={11} sx={{ mx: 'auto' }} />
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: N_ROWS }).map((_, r) => (
            <div key={r} style={{
              display: 'grid',
              gridTemplateColumns: `${labelW}px repeat(${N_COLS}, ${cellW}px)`,
              borderBottom: r === N_ROWS - 1 ? 'none' : `1px solid ${soft}`,
            }}>
              {/* Label */}
              <div style={{
                padding: '10px 16px', borderRight: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: border }} />
                <Skeleton width={100 + (r % 3) * 20} height={14} />
                <Skeleton width={28} height={12} sx={{ ml: 'auto' }} />
              </div>
              {/* Cells */}
              {Array.from({ length: N_COLS }).map((_, c) => (
                <div key={c} style={{
                  padding: 5,
                  borderRight: c === N_COLS - 1 ? 'none' : `1px solid ${soft}`,
                }}>
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height={38}
                    sx={{ borderRadius: 2 }}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Add row */}
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8,
            borderTop: `1px solid ${soft}`, background: alpha(bg, 0.5),
          }}>
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton width={110} height={14} />
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Charge par MACC */}
          <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Skeleton width={110} height={12} />
              <Skeleton width={50}  height={12} />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Skeleton variant="circular" width={14} height={14} />
                  <Skeleton width={80 + i * 12} height={13} sx={{ flex: 1 }} />
                  <Skeleton width={36} height={12} />
                </div>
                <Skeleton variant="rounded" width="100%" height={5} sx={{ borderRadius: 4 }} />
              </div>
            ))}
          </div>

          {/* Aperçu mensuel */}
          <div style={{ background: paper, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Skeleton width={100} height={12} />
              <Skeleton width={60}  height={12} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 2 }).map((_, m) => (
                <div key={m}>
                  <Skeleton width={80} height={12} sx={{ mb: 1 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                    {Array.from({ length: 4 }).map((_, w) => (
                      <Skeleton key={w} variant="rounded" height={26} sx={{ borderRadius: 1 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const WeekTaskAllocation = ({ isLoading }: { isLoading: boolean }) => {
  const axiosPrivate = useAxiosPrivate();
  const {
    residents, intervals, yearWeekTemplates, assignments,
    setAssignments, setPendingChange, currentYearId,
    years, setCurrentYearId, setResidents, setInterval, setYearWeekTemplates,
  } = useWeekDispatcherContext();

  const [menuAnchor, setMenuAnchor]         = useState<HTMLElement | null>(null);
  const [currentWeekIdx, setCurrentWeekIdx] = useState<number | null>(null);
  const [currentPosteId, setCurrentPosteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]         = useState(false);

  useEffect(() => { setMenuAnchor(null); }, [currentYearId]);

  // ── Data mapping ────────────────────────────────────────────────────────────

  const people = useMemo<Record<string, WSTPerson>>(() => {
    const result: Record<string, WSTPerson> = {};
    (residents as ResidentAssignment[]).forEach((r, i) => {
      result[String(r.residentId)] = {
        name:     `${r.firstname} ${r.lastname}`,
        initials: `${r.firstname?.[0] ?? ''}${r.lastname?.[0] ?? ''}`.toUpperCase(),
        color:    PALETTE[r.residentId % PALETTE.length],
      };
    });
    return result;
  }, [residents]);

  const postes = useMemo<WSTPoste[]>(() =>
    (yearWeekTemplates as YearWeekTemplate[]).map((t) => ({
      id:   String(t.yearWeekTemplateId),
      name: t.title,
    })),
    [yearWeekTemplates]
  );

  const weeks = useMemo<WSTWeek[]>(() =>
    (intervals as WeekInterval[]).map((iv, idx) => {
      const s = dayjs(iv.dateOfStart);
      const e = dayjs(iv.dateOfEnd);
      return {
        idx,
        num:        iv.weekNumber,
        startD:     s.date(),
        startM:     MONTHS_FR[s.month()],
        endD:       e.date(),
        endM:       MONTHS_FR[e.month()],
        month:      s.month(),
        monthLabel: MONTHS_FR[s.month()],
        year:       String(iv.yearNumber ?? s.year()).slice(-2),
      };
    }),
    [intervals]
  );

  const rotation = useMemo<Record<string, (string | null)[]>>(() => {
    const result: Record<string, (string | null)[]> = {};
    (yearWeekTemplates as YearWeekTemplate[]).forEach((t) => {
      result[String(t.yearWeekTemplateId)] = (intervals as WeekInterval[]).map((iv) => {
        const a = assignments[t.yearWeekTemplateId]?.[iv.weekIntervalId];
        return a ? String(a.residentId) : null;
      });
    });
    return result;
  }, [yearWeekTemplates, intervals, assignments]);

  const todayWeekIdx = useMemo(() => {
    const today = dayjs();
    return (intervals as WeekInterval[]).findIndex((iv) =>
      !today.isBefore(dayjs(iv.dateOfStart)) &&
      !today.isAfter(dayjs(iv.dateOfEnd))
    );
  }, [intervals]);

  const contextLabel = useMemo(() => {
    const y = (years as any[]).find((yr) => yr.yearId === currentYearId);
    if (!y) return '';
    const info = y.yearInfo ?? y;
    const title    = info.title    ?? y.title    ?? '';
    const location = info.location ?? y.location ?? '';
    return location ? `${title} — ${location}` : title;
  }, [years, currentYearId]);

  // ── Year selection ──────────────────────────────────────────────────────────

  const handleYearChange = (yearId: number | "") => {
    if (!yearId) return;
    const selectedYear = (years as any[]).find((y) => y.yearId === yearId);
    if (selectedYear) {
      setResidents(selectedYear.residents ?? []);
      setInterval(selectedYear.weekIntervals ?? []);
      setYearWeekTemplates(selectedYear.yearWeekTemplates ?? []);
    }
    setCurrentYearId(yearId as number);
    setPendingChange([]);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCellClick = (posteId: string, weekIdx: number, event: React.MouseEvent<HTMLElement>) => {
    setCurrentPosteId(posteId);
    setCurrentWeekIdx(weekIdx);
    setMenuAnchor(event.currentTarget);
  };

  const handleCloseMenu = () => setMenuAnchor(null);

  // Envoie une ou plusieurs opérations directement à l'API (optimiste)
  const dispatchOps = async (ops: PendingOp[]) => {
    try {
      const { method, url } = calendarApi.dispatchWeek(currentYearId);
      await axiosPrivate[method](url, ops);
    } catch (error) {
      handleApiError(error);
      toast.error("Erreur lors de la mise à jour.", toastError);
    }
  };

  const handleResidentAssignment = (residentId: number) => {
    if (currentPosteId === null || currentWeekIdx === null) return;
    const templateId    = parseInt(currentPosteId, 10);
    const weekInterval  = (intervals as WeekInterval[])[currentWeekIdx];
    if (!weekInterval) return;
    const weekIntervalId = weekInterval.weekIntervalId;

    const assignedResident = (residents as ResidentAssignment[]).find((r) => r.residentId === residentId);
    const opsToSend: PendingOp[] = [];

    setAssignments((prev) => {
      let updated = { ...prev };
      for (const type in updated) {
        const typeNum = parseInt(type, 10);
        const slot = updated[typeNum]?.[weekIntervalId];
        if (slot?.residentId === residentId && typeNum !== templateId) {
          updated = { ...updated, [typeNum]: { ...updated[typeNum], [weekIntervalId]: null } };
          opsToSend.push({ method: "delete", residentId, yearWeekTemplateId: typeNum, weekIntervalId });
        }
      }
      return { ...updated, [templateId]: { ...updated[templateId], [weekIntervalId]: assignedResident ?? null } };
    });

    opsToSend.push({ method: "create", residentId, yearWeekTemplateId: templateId, weekIntervalId });
    dispatchOps(opsToSend);
    handleCloseMenu();
  };

  const handleRemoveAssignment = () => {
    if (currentPosteId === null || currentWeekIdx === null) return;
    const templateId    = parseInt(currentPosteId, 10);
    const weekInterval  = (intervals as WeekInterval[])[currentWeekIdx];
    if (!weekInterval) return;
    const weekIntervalId = weekInterval.weekIntervalId;

    const removedId = assignments[templateId]?.[weekIntervalId]?.residentId;

    setAssignments((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], [weekIntervalId]: null },
    }));

    if (removedId !== undefined) {
      dispatchOps([{ method: "delete", residentId: removedId, yearWeekTemplateId: templateId, weekIntervalId }]);
    }

    handleCloseMenu();
  };

  // Current assignment in the selected cell
  const currentTemplateId = currentPosteId ? parseInt(currentPosteId, 10) : null;
  const currentIntervalId = currentWeekIdx !== null
    ? (intervals as WeekInterval[])[currentWeekIdx]?.weekIntervalId
    : null;
  const cellHasAssignment = Boolean(
    currentTemplateId !== null && currentIntervalId !== null &&
    assignments[currentTemplateId]?.[currentIntervalId]
  );

  const yearSelectorNode = (
    <YearSelect
      years={(years as any[]).map((y) => ({ id: y.yearId, title: y.yearInfo?.title ?? y.title ?? '', period: y.yearInfo?.period ?? y.period, location: y.yearInfo?.location ?? y.location, dateOfStart: y.yearInfo?.dateOfStart ?? y.dateOfStart, dateOfEnd: y.yearInfo?.dateOfEnd ?? y.dateOfEnd, status: y.status }))}
      value={currentYearId ?? ""}
      onChange={handleYearChange}
      label="Année"
      disabled={isLoading}
    />
  );

  if (!isLoading && (years as any[]).length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Vous n'avez actuellement aucune année en cours. Seules les années en cours ou à venir sont susceptibles d'être planifiées.
        </Alert>
      </Box>
    );
  }

  if (isLoading) return <WeekDispatcherSkeleton />;

  return (
    <>
      <WeekScheduleTable
        people={people}
        postes={postes}
        weeks={weeks}
        rotation={rotation}
        currentWeekIdx={todayWeekIdx}
        onCellClick={handleCellClick}
        onAddPoste={() => setDialogOpen(true)}
        yearSelector={yearSelectorNode}
      />

      {/* Resident assignment menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        {(residents as ResidentAssignment[]).map((r) => (
          <MenuItem key={r.residentId} onClick={() => handleResidentAssignment(r.residentId)}>
            {r.firstname} {r.lastname}
          </MenuItem>
        ))}
        {cellHasAssignment && [
          <Divider key="div" />,
          <MenuItem key="remove" sx={{ color: "error.main" }} onClick={handleRemoveAssignment}>
            Retirer l'assignation
          </MenuItem>,
        ]}
      </Menu>

      <WeekTemplateImport open={dialogOpen} handleClose={() => setDialogOpen(false)} />
    </>
  );
};

export default WeekTaskAllocation;
