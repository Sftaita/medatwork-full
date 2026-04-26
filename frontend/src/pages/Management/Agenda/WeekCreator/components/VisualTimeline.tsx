import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

// ── Layout constants ──────────────────────────────────────────────────────────
const START_HOUR        = 6;   // leftmost hour rendered
const END_HOUR          = 23;  // rightmost hour rendered
const VISIBLE_START     = 8;   // default left edge (scroll target on mount)
const VISIBLE_END       = 18;  // default right edge
const VISIBLE_HOURS     = VISIBLE_END - VISIBLE_START; // 10 h

const ROW_HEIGHT        = 64;  // px per day row
const LABEL_WIDTH       = 76;  // px for sticky day-label column
const HOURS_WIDTH       = 52;  // px for sticky hours-summary column (right)
const HEADER_HEIGHT     = 28;  // px for time-ruler row

const START_MINUTES     = START_HOUR * 60;
const FALLBACK_PPM      = 1.5; // px/min used when container width is unknown (e.g. tests)

const HOURS             = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const DAY_NAMES         = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const DRAG_TASK_KEY = "application/week-task-id";

// ── Types ──────────────────────────────────────────────────────────────────────
interface WeekTask {
  id: number | string;
  title: string;
  description: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  weekTemplateId: number;
}

export interface VisualTimelineProps {
  tasks: WeekTask[];
  color: string;
  onTaskClick: (task: WeekTask) => void;
  selectedDay: number;
  onDaySelect: (day: number) => void;
  onDropToDay: (taskId: string, newDay: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// ── HTaskBlock ────────────────────────────────────────────────────────────────
interface HTaskBlockProps {
  task: WeekTask;
  color: string;
  leftPx: number;
  widthPx: number;
  onTaskClick: (task: WeekTask) => void;
}

const HTaskBlock = ({ task, color, leftPx, widthPx, onTaskClick }: HTaskBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const PAD = 5;

  return (
    <Box
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TASK_KEY, String(task.id));
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={() => onTaskClick(task)}
      style={{
        position: "absolute",
        left: leftPx,
        width: Math.max(widthPx, 20),
        top: PAD,
        height: ROW_HEIGHT - PAD * 2,
        backgroundColor: alpha(color, isDragging ? 0.08 : 0.22),
        borderTop: `3px solid ${color}`,
        borderRadius: 4,
        padding: "2px 5px",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        zIndex: 1,
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          display: "block",
          lineHeight: 1.25,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {task.title}
      </Typography>
      {widthPx > 80 && (
        <Typography
          variant="caption"
          sx={{ display: "block", lineHeight: 1.1, color: "text.secondary", fontSize: "0.62rem" }}
        >
          {task.startTime}–{task.endTime}
        </Typography>
      )}
    </Box>
  );
};

// ── VisualTimeline ─────────────────────────────────────────────────────────────
const VisualTimeline = ({
  tasks,
  color,
  onTaskClick,
  selectedDay,
  onDaySelect,
  onDropToDay,
}: VisualTimelineProps) => {
  const scrollRef     = useRef<HTMLDivElement>(null);
  const [pxPerMin, setPxPerMin] = useState(FALLBACK_PPM);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Current time indicator — updated every minute
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const nowInRange  = nowMinutes >= START_MINUTES && nowMinutes <= END_HOUR * 60;
  const nowLeftPx   = (nowMinutes - START_MINUTES) * pxPerMin;
  const nowLabel    = `${String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:${String(nowMinutes % 60).padStart(2, "0")}`;

  // On mount: measure container width → derive pxPerMin so 8h-18h fills exactly,
  // then scroll left edge to 8h. Guard against jsdom (clientWidth = 0).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const ppm = el.clientWidth / (VISIBLE_HOURS * 60);
    setPxPerMin(ppm);
    el.scrollLeft = (VISIBLE_START - START_HOUR) * 60 * ppm;
  }, []);

  const totalWidth = (END_HOUR - START_HOUR) * 60 * pxPerMin;
  const totalHeight = HEADER_HEIGHT + ROW_HEIGHT * DAY_NAMES.length;

  // Group tasks by dayOfWeek (1-7) + compute per-day and total seconds
  const { tasksByDay, secondsByDay, totalSeconds } = useMemo(() => {
    const tbd: Record<number, WeekTask[]> = {};
    const sbd: Record<number, number>     = {};
    let total = 0;
    for (let d = 1; d <= 7; d++) { tbd[d] = []; sbd[d] = 0; }
    for (const t of tasks) {
      const d = t.dayOfWeek;
      if (d >= 1 && d <= 7) {
        tbd[d].push(t);
        if (t.startTime && t.endTime) {
          const [sh, sm] = t.startTime.split(":").map(Number);
          const [eh, em] = t.endTime.split(":").map(Number);
          const secs = (eh * 60 + em - sh * 60 - sm) * 60;
          sbd[d] += secs;
          total  += secs;
        }
      }
    }
    return { tasksByDay: tbd, secondsByDay: sbd, totalSeconds: total };
  }, [tasks]);

  const fmtTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  };

  return (
    <Box sx={{ display: "flex", width: "100%", height: totalHeight, overflow: "hidden" }}>

      {/* ── Sticky left column: day labels ─────────────────────────────────── */}
      <Box
        sx={{
          width: LABEL_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          zIndex: 3,
        }}
      >
        {/* Top-left corner (blank, same height as ruler) */}
        <Box sx={{ height: HEADER_HEIGHT, borderBottom: "1px solid", borderColor: "divider" }} />

        {DAY_NAMES.map((name, i) => {
          const day = i + 1;
          const isSelected = day === selectedDay;
          return (
            <Box
              key={day}
              onClick={() => onDaySelect(day)}
              sx={{
                height: ROW_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isSelected ? alpha(color, 0.1) : "transparent",
                transition: "background-color 0.15s",
                "&:hover": { backgroundColor: alpha(color, 0.06) },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? color : "text.secondary",
                  fontSize: "0.75rem",
                }}
              >
                {name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Scrollable timeline area ────────────────────────────────────────── */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": { borderRadius: 3, backgroundColor: "action.disabled" },
        }}
      >
        {/* Inner fixed-width canvas */}
        <Box sx={{ width: totalWidth, height: totalHeight, position: "relative" }}>

          {/* Time ruler */}
          <Box
            sx={{
              height: HEADER_HEIGHT,
              position: "relative",
              backgroundColor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {HOURS.map((h) => {
              const leftPx  = (h * 60 - START_MINUTES) * pxPerMin;
              const isInView = h >= VISIBLE_START && h <= VISIBLE_END;
              return (
                <Typography
                  key={h}
                  variant="caption"
                  sx={{
                    position: "absolute",
                    left: leftPx + 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isInView ? "text.primary" : "text.disabled",
                    fontSize: "0.65rem",
                    fontWeight: (h === VISIBLE_START || h === VISIBLE_END) ? 700 : 400,
                    userSelect: "none",
                  }}
                >
                  {String(h).padStart(2, "0")}h
                </Typography>
              );
            })}

            {/* Now tick in ruler */}
            {nowInRange && (
              <>
                <Box
                  sx={{
                    position: "absolute",
                    left: nowLeftPx,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: "error.main",
                    zIndex: 4,
                    pointerEvents: "none",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    left: nowLeftPx + 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: "error.main",
                    backgroundColor: "background.paper",
                    px: 0.25,
                    zIndex: 5,
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nowLabel}
                </Typography>
              </>
            )}
          </Box>

          {/* Now line spanning all rows */}
          {nowInRange && (
            <Box
              sx={{
                position: "absolute",
                left: nowLeftPx,
                top: HEADER_HEIGHT,
                height: ROW_HEIGHT * DAY_NAMES.length,
                width: 2,
                backgroundColor: "error.main",
                opacity: 0.55,
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Day rows */}
          {DAY_NAMES.map((_, i) => {
            const day       = i + 1;
            const dayTasks  = tasksByDay[day] || [];
            const isSelected = day === selectedDay;
            const isDragOver = dragOverDay === day;

            return (
              <Box
                key={day}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverDay(day);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverDay(null);
                  }
                }}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData(DRAG_TASK_KEY);
                  if (taskId) onDropToDay(taskId, day);
                  setDragOverDay(null);
                }}
                sx={{
                  height: ROW_HEIGHT,
                  position: "relative",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  backgroundColor: isDragOver
                    ? alpha(color, 0.18)
                    : isSelected
                    ? alpha(color, 0.04)
                    : "transparent",
                  transition: "background-color 0.1s",
                }}
              >
                {/* Vertical hour gridlines */}
                {HOURS.map((h) => (
                  <Box
                    key={h}
                    sx={{
                      position: "absolute",
                      left: (h * 60 - START_MINUTES) * pxPerMin,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: "divider",
                      opacity: h % 2 === 0 ? 0.5 : 0.15,
                    }}
                  />
                ))}

                {/* Task blocks */}
                {dayTasks.map((task) => {
                  if (!task.startTime || !task.endTime) return null;
                  const startMin    = timeToMinutes(task.startTime);
                  const endMin      = timeToMinutes(task.endTime);
                  const clampedStart = Math.max(startMin, START_MINUTES);
                  const clampedEnd   = Math.min(endMin, END_HOUR * 60);
                  const leftPx   = (clampedStart - START_MINUTES) * pxPerMin;
                  const widthPx  = Math.max((clampedEnd - clampedStart) * pxPerMin, 8);

                  return (
                    <HTaskBlock
                      key={task.id}
                      task={task}
                      color={color}
                      leftPx={leftPx}
                      widthPx={widthPx}
                      onTaskClick={onTaskClick}
                    />
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Sticky right column: hours per day ─────────────────────────────── */}
      <Box
        sx={{
          width: HOURS_WIDTH,
          flexShrink: 0,
          borderLeft: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          zIndex: 3,
        }}
      >
        {/* Top-right corner: total week */}
        <Box
          sx={{
            height: HEADER_HEIGHT,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: "0.6rem", fontWeight: 700, color: "text.secondary", textAlign: "center", lineHeight: 1.2 }}
          >
            {fmtTime(totalSeconds)}
          </Typography>
        </Box>

        {/* Per-day totals */}
        {DAY_NAMES.map((_, i) => {
          const day  = i + 1;
          const secs = secondsByDay[day] || 0;
          const h    = Math.floor(secs / 3600);
          const m    = Math.floor((secs % 3600) / 60);
          const isSelected = day === selectedDay;

          return (
            <Box
              key={day}
              sx={{
                height: ROW_HEIGHT,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isSelected ? alpha(color, 0.1) : "transparent",
              }}
            >
              {secs > 0 ? (
                <>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontSize: "0.78rem", color: isSelected ? color : "text.primary", lineHeight: 1.2 }}
                  >
                    {h}h
                  </Typography>
                  {m > 0 && (
                    <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.secondary", lineHeight: 1 }}>
                      {String(m).padStart(2, "0")}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.disabled" }}>
                  —
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default VisualTimeline;
