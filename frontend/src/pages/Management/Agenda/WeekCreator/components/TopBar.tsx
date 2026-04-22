import React, { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import CreateWeekForm from "../../WeekDispatcher/components/CreateWeekForm";
import UpdateWeekTemplates from "./UpdateWeekTemplate";

// ── Tutorial steps ────────────────────────────────────────────────────────────
const STEPS = [
  {
    emoji: "📋",
    title: "Modèles de semaine",
    text: "Chaque onglet en haut représente un modèle réutilisable (ex : « Semaine normale », « Semaine de garde »). Vous pouvez en créer autant que nécessaire et basculer entre eux en un clic.",
  },
  {
    emoji: "➕",
    title: "Créer un modèle",
    text: "Cliquez sur le bouton + (en pointillés) pour créer un nouveau modèle. Donnez-lui un nom et une couleur, puis validez.",
  },
  {
    emoji: "✏️",
    title: "Renommer / modifier un modèle",
    text: "Sélectionnez un modèle puis cliquez sur l'icône crayon qui apparaît à sa droite pour le renommer ou changer sa couleur.",
  },
  {
    emoji: "📅",
    title: "Naviguer par jour",
    text: "Les boutons Lundi → Dimanche au centre permettent de changer de jour. Les tâches affichées dans la timeline correspondent au jour sélectionné.",
  },
  {
    emoji: "⏱️",
    title: "Ajouter une tâche",
    text: "Dans le formulaire à gauche, saisissez un titre, une heure de début et une heure de fin, puis cliquez « Ajouter ». La tâche s'ajoute automatiquement au jour affiché.",
  },
  {
    emoji: "🖊️",
    title: "Modifier ou supprimer une tâche",
    text: "Cliquez sur une tâche dans la timeline pour la charger dans le formulaire. Modifiez-la puis validez, ou cliquez sur l'icône 🗑️ pour la supprimer.",
  },
  {
    emoji: "↔️",
    title: "Glisser-déposer entre les jours",
    text: "Faites glisser une tâche depuis la timeline et déposez-la sur un autre jour dans la barre de navigation pour la déplacer sans passer par le formulaire.",
  },
  {
    emoji: "📊",
    title: "Récapitulatif des heures",
    text: "La colonne de droite affiche le total d'heures de chaque jour ainsi que le total hebdomadaire. La barre de progression en haut indique la charge par rapport à 72 h.",
  },
];

const TutorialModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h6" component="span">
          Comment utiliser le Créateur de semaine
        </Typography>
      </Box>
      <IconButton size="small" onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <Divider />
    <DialogContent sx={{ pt: 2 }}>
      <Stack spacing={2.5}>
        {STEPS.map((step, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5 }}>
            <Typography sx={{ fontSize: "1.4rem", lineHeight: 1, mt: 0.25, flexShrink: 0 }}>
              {step.emoji}
            </Typography>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {step.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {step.text}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </DialogContent>
    <Divider />
    <DialogActions sx={{ px: 3, py: 1.5 }}>
      <Button onClick={onClose} variant="contained" size="small">
        Compris !
      </Button>
    </DialogActions>
  </Dialog>
);

const TOTAL_HOURS = 72;

const TopBar = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { weekTemplates, selectedWeekId, setSelectedWeekId } = useWeekShedulerContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [helpOpen, setHelpOpen]   = useState(false);

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
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      {/* Add button — always visible, pinned to the left */}
      <Tooltip title="Nouveau modèle de semaine">
        <IconButton
          size="small"
          color="primary"
          onClick={() => setCreateOpen(true)}
          sx={{ flexShrink: 0, border: "1px dashed", borderColor: "primary.main", borderRadius: 1, p: 0.25 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Template chips — scrollable, takes all available space */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          flex: 1,
          minWidth: 0,
          alignItems: "center",
          overflowX: "auto",
          // hide scrollbar visually but keep scroll behaviour
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {weekTemplates.map((wt) => {
          const isSelected = wt.id === selectedWeekId;
          const chipColor = wt.color || "#16b1ff";
          return (
            <Box key={wt.id} sx={{ display: "flex", alignItems: "center" }}>
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
      </Stack>

      {/* Help button — always visible, pinned to the right of chips */}
      <Tooltip title="Guide d'utilisation">
        <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ flexShrink: 0 }}>
          <HelpOutlineIcon fontSize="small" color="action" />
        </IconButton>
      </Tooltip>

      {/* Total hours — always pinned to the right */}
      {selectedWeek && (
        <Box sx={{ width: 160, flexShrink: 0, pl: 1 }}>
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
        </Box>
      )}

      {/* Tutorial modal */}
      <TutorialModal open={helpOpen} onClose={() => setHelpOpen(false)} />

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
