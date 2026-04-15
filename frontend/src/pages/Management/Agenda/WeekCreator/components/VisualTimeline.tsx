import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

const PX_PER_MIN = 1.2;
const START_HOUR = 6;  // 06:00
const END_HOUR = 23;   // 23:00
const START_MINUTES = START_HOUR * 60; // 360
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 1020
const TOTAL_HEIGHT = TOTAL_MINUTES * PX_PER_MIN; // 1224

const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export const DRAG_TASK_KEY = "application/week-task-id";

interface WeekTask {
  id: number | string;
  title: string;
  description: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  weekTemplateId: number;
}

interface VisualTimelineProps {
  tasks: WeekTask[];
  color: string;
  onTaskClick: (task: WeekTask) => void;
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

interface TaskBlockProps {
  task: WeekTask;
  color: string;
  topPx: number;
  heightPx: number;
  onTaskClick: (task: WeekTask) => void;
}

const TaskBlock = ({ task, color, topPx, heightPx, onTaskClick }: TaskBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DRAG_TASK_KEY, String(task.id));
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <Box
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onTaskClick(task)}
      style={{
        position: "absolute",
        top: topPx,
        left: 0,
        right: 0,
        height: heightPx,
        backgroundColor: alpha(color, isDragging ? 0.1 : 0.2),
        borderLeft: `4px solid ${color}`,
        borderRadius: 4,
        padding: "2px 6px",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        zIndex: 1,
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>
        {task.title}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", lineHeight: 1.2 }}>
        {task.startTime}–{task.endTime}
      </Typography>
    </Box>
  );
};

const VisualTimeline = ({ tasks, color, onTaskClick }: VisualTimelineProps) => {
  return (
    <Box sx={{ position: "relative" }}>
      {tasks.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            minHeight: 120,
          }}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            Aucune tâche pour ce jour — cliquez sur un créneau du formulaire pour en ajouter.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", position: "relative" }}>
          {/* Left column: hour labels */}
          <Box sx={{ width: 48, flexShrink: 0, position: "relative", height: TOTAL_HEIGHT }}>
            {hours.map((h) => {
              const topPx = (h * 60 - START_MINUTES) * PX_PER_MIN;
              return (
                <Typography
                  key={h}
                  variant="caption"
                  sx={{
                    position: "absolute",
                    top: topPx,
                    right: 4,
                    color: "text.secondary",
                    lineHeight: 1,
                    transform: "translateY(-50%)",
                  }}
                >
                  {String(h).padStart(2, "0")}
                </Typography>
              );
            })}
          </Box>

          {/* Right column: task blocks */}
          <Box
            sx={{
              flex: 1,
              position: "relative",
              height: TOTAL_HEIGHT,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          >
            {hours.map((h) => (
              <Box
                key={h}
                sx={{
                  position: "absolute",
                  top: (h * 60 - START_MINUTES) * PX_PER_MIN,
                  left: 0,
                  right: 0,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              />
            ))}

            {tasks.map((task) => {
              if (!task.startTime || !task.endTime) return null;
              const startMin = timeToMinutes(task.startTime);
              const endMin = timeToMinutes(task.endTime);
              const topPx = (Math.max(startMin, START_MINUTES) - START_MINUTES) * PX_PER_MIN;
              const heightPx = Math.max((endMin - startMin) * PX_PER_MIN, 20);

              return (
                <TaskBlock
                  key={task.id}
                  task={task}
                  color={color || "#16b1ff"}
                  topPx={topPx}
                  heightPx={heightPx}
                  onTaskClick={onTaskClick}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VisualTimeline;
