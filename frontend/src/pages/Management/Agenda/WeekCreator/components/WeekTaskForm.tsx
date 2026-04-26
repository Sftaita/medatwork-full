import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import LoadingButton from "@mui/lab/LoadingButton";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Alert, Button, TextField } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import IconButton from "@mui/material/IconButton";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import { Stack } from "@mui/system";
import { Delete } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";

// General components
import { toastError } from "../../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";

// ── Tutorial ──────────────────────────────────────────────────────────────────
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
    title: "Sélectionner un jour",
    text: "Cliquez sur le nom d'un jour dans la timeline (colonne gauche) pour le cibler. La tâche ajoutée sera rattachée à ce jour.",
  },
  {
    emoji: "⏱️",
    title: "Ajouter une tâche",
    text: "Saisissez un titre, une heure de début et une heure de fin, puis cliquez « Ajouter ». La tâche apparaît instantanément dans la timeline.",
  },
  {
    emoji: "🖊️",
    title: "Modifier ou supprimer une tâche",
    text: "Cliquez sur une tâche dans la timeline pour la charger dans ce formulaire. Modifiez-la puis validez, ou cliquez sur l'icône 🗑️ pour la supprimer.",
  },
  {
    emoji: "↔️",
    title: "Glisser-déposer entre les jours",
    text: "Faites glisser une tâche horizontalement et déposez-la sur la ligne d'un autre jour pour la déplacer sans passer par le formulaire.",
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

// ── Form ──────────────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  title: "",
  description: "",
  startTime: null as any,
  endTime: null as any,
};

const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const WeekTaskForm = () => {
  const axiosPrivate = useAxiosPrivate();

  const {
    selectedWeekDay,
    selectedTask,
    setSelectedTask,
    taskMode,
    setTaskMode,
    selectedWeekId,
    weekTemplates,
    setWeekTemplates,
  } = useWeekShedulerContext();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [serverError, setServerError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setServerError(null);
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleTimeChange = (value: any, name: string) => {
    setServerError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM });
    setServerError(null);
  };

  const isTimeConflict = (newTask: any): boolean => {
    const selectedWeekType = weekTemplates.find((wt) => wt.id === selectedWeekId);
    if (!selectedWeekType) return false;

    const sameDayTasks = selectedWeekType.weekTaskList.filter(
      (task: any) => task.dayOfWeek === newTask.dayOfWeek
    );

    for (const task of sameDayTasks) {
      if (task.id !== newTask.id) {
        if (
          (newTask.startTime >= task.startTime && newTask.startTime < task.endTime) ||
          (newTask.endTime > task.startTime && newTask.endTime <= task.endTime) ||
          (newTask.startTime <= task.startTime && newTask.endTime >= task.endTime)
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedFormData = {
      ...formData,
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
      weekTemplateId: selectedWeekId,
    };

    if (!isTimeConflict(updatedFormData)) {
      const previousWeekTypes = [...weekTemplates];
      setIsLoading(true);

      try {
        const { method, url } = weekTemplatesApi.addTaskToWeekTemplate(selectedWeekId);
        const response = await axiosPrivate[method](url, updatedFormData);

        if (response.data && response.data.id) {
          updatedFormData.id = response.data.id;

          setWeekTemplates((prev: any[]) =>
            prev.map((wt) =>
              wt.id === selectedWeekId
                ? { ...wt, weekTaskList: [...wt.weekTaskList, updatedFormData] }
                : wt
            )
          );
        }
        resetForm();
      } catch (error: any) {
        if (error?.response?.data?.error) {
          setServerError(error.response.data.error);
        } else {
          handleApiError(error);
          toast.error("Oups! Une erreur c'est produite.", toastError);
        }
        setWeekTemplates(previousWeekTypes);
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error("Un conflit horaire a été détecté", toastError);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTask = {
      ...selectedTask,
      ...formData,
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
    };

    if (!isTimeConflict(updatedTask)) {
      const previousWeekTypes = [...weekTemplates];

      setWeekTemplates((prev: any[]) =>
        prev.map((wt) =>
          wt.id === selectedWeekId
            ? {
                ...wt,
                weekTaskList: wt.weekTaskList.map((task: any) =>
                  task.id === selectedTask.id ? updatedTask : task
                ),
              }
            : wt
        )
      );

      setTaskMode("creation");
      resetForm();
      setIsLoading(true);
      try {
        const { method, url } = weekTemplatesApi.updateWeekTask(updatedTask.id);
        await axiosPrivate[method](url, updatedTask);
      } catch (error: any) {
        if (error?.response?.data?.error) {
          setServerError(error.response.data.error);
        } else {
          handleApiError(error);
          toast.error("Oups! Une erreur c'est produite.", toastError);
        }
        setWeekTemplates(previousWeekTypes);
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error("Il y a un conflit d'horaire avec une autre tâche.", toastError);
    }
  };

  const handleCancel = () => {
    setTaskMode("creation");
    setSelectedTask(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (selectedTask) {
      const previousWeekTemplates = [...weekTemplates];

      setWeekTemplates((prev: any[]) =>
        prev.map((wt) =>
          wt.id === selectedWeekId
            ? { ...wt, weekTaskList: wt.weekTaskList.filter((task: any) => task.id !== selectedTask.id) }
            : wt
        )
      );

      setSelectedTask(null);
      setTaskMode("creation");
      resetForm();

      try {
        const { method, url } = weekTemplatesApi.deleteWeekTask(selectedTask.id);
        await axiosPrivate[method](url, { data: { id: selectedTask.id } });
      } catch (error: any) {
        handleApiError(error);
        toast.error("Oups! Une erreur s'est produite.", toastError);
        setWeekTemplates(previousWeekTemplates);
      }
    }
  };

  useEffect(() => {
    if (selectedTask) {
      setFormData({
        title: selectedTask.title ?? "",
        description: selectedTask.description ?? "",
        startTime: selectedTask.startTime ?? null,
        endTime: selectedTask.endTime ?? null,
      });
      setServerError(null);
    }
  }, [selectedTask]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid
        item
        sx={{
          width: "100%",
        }}
        aria-label="weekTask-Creator"
      >
        <Box>
          <Typography variant="button">
            {taskMode === "update" ? "Modifier une tâche" : "Ajouter une tâche"}
          </Typography>
          <form
            onSubmit={(e) => {
              taskMode === "update" ? handleUpdate(e) : handleAddTask(e);
            }}
          >
            <Grid
              container
              direction="column"
              alignContent={"center"}
              spacing={2}
              sx={{ marginTop: 1 }}
            >
              <Grid item md={12} sx={{ width: "100%" }}>
                <TextField
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  label="Titre *"
                  variant="outlined"
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item md={12}>
                <TextField
                  name="description"
                  onChange={handleChange}
                  value={formData.description}
                  label="Description"
                  multiline
                  rows={3}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item md={12}>
                <Typography color="primary">
                  {taskMode === "update" && selectedTask ? (
                    <Box display="flex" alignItems="center">
                      {dayNames[selectedTask.dayOfWeek - 1]}
                      {selectedTask.dayOfWeek !== selectedWeekDay && (
                        <>
                          <TrendingFlatIcon />
                          {dayNames[selectedWeekDay - 1]}
                        </>
                      )}
                    </Box>
                  ) : (
                    dayNames[selectedWeekDay ? selectedWeekDay - 1 : 0]
                  )}
                </Typography>
              </Grid>
              <Grid item md={6}>
                <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                  <AccessTimeIcon sx={{ color: "primary.main", mr: 1, my: 0.5 }} />
                  <TimeField
                    label="Début"
                    name="startTime"
                    value={formData.startTime}
                    onChange={(value) => handleTimeChange(value, "startTime")}
                    format="HH:mm"
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                </Box>
              </Grid>
              <Grid item md={6} marginBottom={2}>
                <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                  <AccessTimeFilledIcon sx={{ color: "primary.main", mr: 1, my: 0.5 }} />
                  <TimeField
                    label="Fin"
                    name="endTime"
                    value={formData.endTime}
                    onChange={(value) => handleTimeChange(value, "endTime")}
                    format="HH:mm"
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                </Box>
              </Grid>
              {serverError && (
                <Grid item md={12}>
                  <Alert severity="error">{serverError}</Alert>
                </Grid>
              )}
              <Grid item md={12} marginBottom={2}>
                <Stack
                  direction="row"
                  justifyContent="flex-start"
                  alignItems="center"
                  spacing={1}
                >
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    color="primary"
                    loading={isLoading}
                    disabled={formData.title.trim() === ""}
                  >
                    {taskMode === "update" ? "Modifier" : "Ajouter"}
                  </LoadingButton>

                  {taskMode === "update" && (
                    <>
                      <Button variant="outlined" color="primary" onClick={handleCancel}>
                        Annuler
                      </Button>
                      <IconButton onClick={handleDelete}>
                        <Delete sx={{ color: "red" }} />
                      </IconButton>
                    </>
                  )}

                  <Tooltip title="Guide d'utilisation">
                    <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ ml: "auto !important" }}>
                      <HelpOutlineIcon fontSize="small" color="action" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Grid>
      <TutorialModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </LocalizationProvider>
  );
};

export default WeekTaskForm;
