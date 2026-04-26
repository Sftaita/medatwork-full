import React, { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import CreateWeekForm from "../../WeekDispatcher/components/CreateWeekForm";
import UpdateWeekTemplates from "./UpdateWeekTemplate";

const TOTAL_HOURS = 72;

const TopBar = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { weekTemplates, selectedWeekId, setSelectedWeekId } = useWeekShedulerContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);

  const selectedWeek = weekTemplates.find((wt) => wt.id === selectedWeekId);

  let totalSeconds = 0;
  if (selectedWeek?.weekTaskList) {
    for (const task of selectedWeek.weekTaskList) {
      if (task.startTime && task.endTime) {
        const [sh, sm] = task.startTime.split(":").map(Number);
        const [eh, em] = task.endTime.split(":").map(Number);
        totalSeconds += (eh * 60 + em - sh * 60 - sm) * 60;
      }
    }
  }
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const progress = Math.min((totalSeconds / (TOTAL_HOURS * 3600)) * 100, 100);
  const hoursLabel = totalMinutes > 0 ? `${totalHours}h${totalMinutes}` : `${totalHours}h`;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `auto 1fr auto ${selectedWeek ? "160px" : "0px"}`,
        alignItems: "center",
        columnGap: 1,
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* col 1 — Add button, toujours visible */}
      <Tooltip title="Nouveau modèle de semaine">
        <IconButton
          size="small"
          color="primary"
          onClick={() => setCreateOpen(true)}
          sx={{ border: "1px dashed", borderColor: "primary.main", borderRadius: 1, p: 0.25 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* col 2 — Zone scrollable strictement bornée à 1fr */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {weekTemplates.map((wt) => {
          const isSelected = wt.id === selectedWeekId;
          const chipColor = wt.color || "#16b1ff";
          return (
            <Box key={wt.id} sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <Chip
                label={wt.title}
                onClick={() => setSelectedWeekId(wt.id)}
                size="small"
                sx={{
                  border: `1px solid ${chipColor}`,
                  color: isSelected ? "#fff" : chipColor,
                  backgroundColor: isSelected ? chipColor : "transparent",
                  fontWeight: isSelected ? 700 : 400,
                  "&:hover": { backgroundColor: isSelected ? chipColor : `${chipColor}22` },
                }}
              />
              {isSelected && (
                <Tooltip title="Modifier ce modèle">
                  <IconButton size="small" onClick={() => setEditOpen(true)} sx={{ ml: 0.25 }}>
                    <EditIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      {/* col 3 — (vide, le ? est dans le formulaire) */}
      <Box />

      {/* col 4 — Barre d'heures (160px, masquée si aucun template sélectionné) */}
      <Box sx={{ pl: 1, overflow: "hidden" }}>
        {selectedWeek && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Semaine
              </Typography>
              <Typography variant="caption" fontWeight={700} color={progress >= 100 ? "error.main" : "text.primary"}>
                {hoursLabel} / {TOTAL_HOURS}h
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: (t) => t.palette.action.hover,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  backgroundColor: progress >= 100 ? "error.main" : "primary.main",
                },
              }}
            />
          </>
        )}
      </Box>

      {/* Drawers */}
      <Drawer
        anchor="right"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        PaperProps={{ style: { width: isMd ? "50%" : "100%" } }}
      >
        <IconButton onClick={() => setCreateOpen(false)} sx={{ alignSelf: "flex-start", m: 1 }}>
          <CloseIcon />
        </IconButton>
        <CreateWeekForm onCancel={() => setCreateOpen(false)} />
      </Drawer>

      <Drawer
        anchor="right"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        PaperProps={{ style: { width: isMd ? "50%" : "100%" } }}
      >
        <IconButton onClick={() => setEditOpen(false)} sx={{ alignSelf: "flex-start", m: 1 }}>
          <CloseIcon />
        </IconButton>
        <UpdateWeekTemplates onCancel={() => setEditOpen(false)} />
      </Drawer>
    </Box>
  );
};

export default TopBar;
