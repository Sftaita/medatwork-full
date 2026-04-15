import React, { useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import dayjs from "@/lib/dayjs";

import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import VisualTimeline, { DRAG_TASK_KEY } from "./VisualTimeline";
import { handleApiError } from "@/services/apiError";

// ── DroppableDay (native HTML5 DnD) ───────────────────────────────────────────
interface DroppableDayProps {
  dayIndex: number;
  children: React.ReactNode;
  onDrop: (e: React.DragEvent<HTMLDivElement>, dayIndex: number) => void;
}

const DroppableDay = ({ dayIndex, children, onDrop }: DroppableDayProps) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { setIsOver(false); onDrop(e, dayIndex); }}
      sx={{
        flex: 1,
        border: isOver ? "2px solid" : "2px solid transparent",
        borderColor: isOver ? "primary.main" : "transparent",
        borderRadius: 1,
        transition: "border-color 0.15s",
      }}
    >
      {children}
    </Box>
  );
};

// ── TimelineBloc ──────────────────────────────────────────────────────────────
const TimelineBloc = () => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const isXl = useMediaQuery(theme.breakpoints.up("xl"), { defaultMatches: true });

  const {
    selectedWeekDay,
    setSelectedWeekDay,
    selectedWeekId,
    weekTemplates,
    setWeekTemplates,
    setSelectedTask,
    setTaskMode,
  } = useWeekShedulerContext();

  const days = [
    { short: "Lu", full: "Lundi" },
    { short: "Ma", full: "Mardi" },
    { short: "Me", full: "Mercredi" },
    { short: "Je", full: "Jeudi" },
    { short: "Ve", full: "Vendredi" },
    { short: "Sa", full: "Samedi" },
    { short: "Di", full: "Dimanche" },
  ];

  const handleDayChange = (_e: React.MouseEvent, newDay: number) => {
    if (newDay !== null && newDay > 0) setSelectedWeekDay(newDay);
  };

  const selectedWeek = useMemo(
    () => weekTemplates.find((wt) => wt.id === selectedWeekId) || { tasks: [] },
    [selectedWeekId, weekTemplates],
  );

  const tasksForSelectedDay = useMemo(() => {
    if (!selectedWeek.weekTaskList) return [];
    return [...selectedWeek.weekTaskList]
      .filter((t: any) => t.dayOfWeek === selectedWeekDay)
      .sort((a: any, b: any) =>
        a.startTime && b.startTime ? a.startTime.localeCompare(b.startTime) : 0,
      );
  }, [selectedWeek, selectedWeekDay]);

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newDay: number) => {
    const taskId = e.dataTransfer.getData(DRAG_TASK_KEY);
    if (!taskId || !selectedWeek.weekTaskList) return;

    const task = selectedWeek.weekTaskList.find((t: any) => String(t.id) === taskId);
    if (!task || task.dayOfWeek === newDay) return;

    const updatedTask = { ...task, dayOfWeek: newDay };
    const previousTemplates = [...weekTemplates];

    setWeekTemplates((prev: any[]) =>
      prev.map((wt) =>
        wt.id === selectedWeekId
          ? { ...wt, weekTaskList: wt.weekTaskList.map((t: any) => (t.id === task.id ? updatedTask : t)) }
          : wt,
      ),
    );

    try {
      const { method, url } = weekTemplatesApi.updateWeekTask(task.id);
      await axiosPrivate[method](url, updatedTask);
    } catch (error) {
      handleApiError(error);
      setWeekTemplates(previousTemplates);
    }
  };

  // ── Task click → open edit form ───────────────────────────────────────────
  const handleTaskClick = (task: any) => {
    setSelectedTask({
      ...task,
      startTime: task.startTime ? dayjs(task.startTime, "HH:mm") : null,
      endTime: task.endTime ? dayjs(task.endTime, "HH:mm") : null,
    });
    setTaskMode("update");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Day selector — sticky */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          px: 1.5,
          pt: 1.5,
          pb: 1,
          backgroundColor: "#F6F4FC",
        }}
      >
        <ToggleButtonGroup
          color="primary"
          value={selectedWeekDay}
          exclusive
          onChange={handleDayChange}
          aria-label="Jour de la semaine"
          fullWidth
          size="small"
          sx={{ backgroundColor: "#fff" }}
        >
          {days.map((day, index) => (
            <DroppableDay key={index} dayIndex={index + 1} onDrop={handleDrop}>
              <ToggleButton value={index + 1} sx={{ width: "100%", py: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: selectedWeekDay === index + 1 ? 700 : 400 }}>
                  {isXl || selectedWeekDay === index + 1 ? day.full : day.short}
                </Typography>
              </ToggleButton>
            </DroppableDay>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Timeline */}
      <Box sx={{ flex: 1, px: 1.5, pb: 1.5, backgroundColor: "#fff", mx: 1.5, mb: 1.5, borderRadius: 1 }}>
        <VisualTimeline
          tasks={tasksForSelectedDay}
          color={(selectedWeek as any).color || "#16b1ff"}
          onTaskClick={handleTaskClick}
        />
      </Box>
    </Box>
  );
};

export default TimelineBloc;
