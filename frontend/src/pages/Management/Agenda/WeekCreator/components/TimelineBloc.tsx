import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "@/lib/dayjs";

import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import VisualTimeline, { DRAG_TASK_KEY } from "./VisualTimeline";
import { handleApiError } from "@/services/apiError";

const TimelineBloc = () => {
  const axiosPrivate = useAxiosPrivate();

  const {
    selectedWeekDay,
    setSelectedWeekDay,
    selectedWeekId,
    weekTemplates,
    setWeekTemplates,
    setSelectedTask,
    setTaskMode,
  } = useWeekShedulerContext();

  const selectedWeek = useMemo(
    () => weekTemplates.find((wt) => wt.id === selectedWeekId),
    [selectedWeekId, weekTemplates],
  );

  // ── Drag & drop: move a task to a different day ───────────────────────────
  const handleDropToDay = async (taskId: string, newDay: number) => {
    if (!selectedWeek?.weekTaskList) return;

    const task = selectedWeek.weekTaskList.find((t: any) => String(t.id) === taskId);
    if (!task || task.dayOfWeek === newDay) return;

    const updatedTask       = { ...task, dayOfWeek: newDay };
    const previousTemplates = [...weekTemplates];

    setWeekTemplates((prev: any[]) =>
      prev.map((wt) =>
        wt.id === selectedWeekId
          ? {
              ...wt,
              weekTaskList: wt.weekTaskList.map((t: any) =>
                t.id === task.id ? updatedTask : t,
              ),
            }
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

  // ── Task click → load in edit form ───────────────────────────────────────
  const handleTaskClick = (task: any) => {
    setSelectedTask({
      ...task,
      startTime: task.startTime ? dayjs(task.startTime, "HH:mm") : null,
      endTime:   task.endTime   ? dayjs(task.endTime,   "HH:mm") : null,
    });
    setTaskMode("update");
  };

  if (!selectedWeek) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 4,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Sélectionnez un modèle de semaine pour afficher les tâches.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#F6F4FC",
        p: 1.5,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <VisualTimeline
          tasks={selectedWeek.weekTaskList || []}
          color={(selectedWeek as any).color || "#16b1ff"}
          onTaskClick={handleTaskClick}
          selectedDay={selectedWeekDay}
          onDaySelect={setSelectedWeekDay}
          onDropToDay={handleDropToDay}
        />
      </Box>
    </Box>
  );
};

export default TimelineBloc;
