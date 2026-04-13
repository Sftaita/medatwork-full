import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import { v4 as uuidv4 } from "uuid";
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
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import Drawer from "@mui/material/Drawer";
import { Stack } from "@mui/system";
import { Delete } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// General components
import { toastError } from "../../../../../doc/ToastParams";

// Local components
import WeekTemplatesList from "./WeekTemplatesList";
import CreateWeekForm from "../../WeekDispatcher/components/CreateWeekForm";
import { handleApiError } from "@/services/apiError";

const AddBloc = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
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

  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const [formData, setFormData] = useState({
    uuid: "",
    title: "",
    description: "",
    startTime: null,
    endTime: null,
    dayOfWeek: "",
  });

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleTimeChange = (value, name) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();

    // Créer des données de formulaire mises à jour avec un nouvel UUID comme ID
    const updatedFormData = {
      ...formData,
      id: uuidv4(),
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
      weekTemplateId: selectedWeekId,
    };

    // Vérifier les conflits de temps
    if (!isTimeConflict(updatedFormData)) {
      // Sauvegarder l'état précédent des weekTemplates
      const previousWeekTypes = [...weekTemplates];
      setIsLoading(true);

      try {
        const { method, url } = weekTemplatesApi.addTaskToWeekTemplate(selectedWeekId);

        const response = await axiosPrivate[method](url, updatedFormData);

        // Si la réponse est bonne, mettez à jour l'UUID avec l'ID de la réponse
        if (response.data && response.data.id) {
          updatedFormData.id = response.data.id;

          // Mettre à jour le weekType correspondant
          setWeekTemplates((prevWeekTypes) => {
            const updatedWeekTypes = prevWeekTypes.map((weekType) => {
              if (weekType.id === selectedWeekId) {
                return {
                  ...weekType,
                  weekTaskList: [...weekType.weekTaskList, updatedFormData],
                };
              }
              return weekType;
            });
            return updatedWeekTypes;
          });
        }
      } catch (error) {
        handleApiError(error);
        toast.error("Oups! Une erreur c'est produite.", toastError);

        // Restaurer l'état précédent des weekTemplates en cas d'erreur
        setWeekTemplates(previousWeekTypes);
      } finally {
        setIsLoading(false);
      }

      // Réinitialiser le formulaire
      resetForm();
    } else {
      // Afficher un message d'erreur s'il y a un conflit de temps
      toast.error("Un conflit horaire a été détecté", toastError);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Create updated form data with a new UUID as the ID
    const updatedTask = {
      ...selectedTask,
      ...formData,
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
    };

    // Check for time conflicts
    if (!isTimeConflict(updatedTask)) {
      // Backup the previous state of the weekTemplates
      const previousWeekTypes = [...weekTemplates];

      // Update the corresponding weekType
      setWeekTemplates((prevWeekTypes) => {
        const updatedWeekTypes = prevWeekTypes?.map((weekType) => {
          if (weekType.id === selectedWeekId) {
            return {
              ...weekType,
              weekTaskList: weekType.weekTaskList.map((task) =>
                task.id === selectedTask.id ? updatedTask : task
              ),
            };
          }
          return weekType;
        });
        return updatedWeekTypes;
      });

      setTaskMode("creation");
      resetForm();
      setIsLoading(true);
      try {
        const { method, url } = weekTemplatesApi.updateWeekTask(updatedTask.id);
        await axiosPrivate[method](url, updatedTask);
      } catch (error) {
        handleApiError(error);
        toast.error("Oups! Une erreur c'est produite.", toastError);

        // Restore the previous state of the weekTemplates in case of error
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
      // Sauvegarder l'état précédent des weekTemplates
      const previousWeekTemplates = [...weekTemplates];

      // Mettre à jour le weekType correspondant (Approche optimiste)
      setWeekTemplates((prevWeekTypes) => {
        const updatedWeekTypes = prevWeekTypes.map((weekType) => {
          if (weekType.id === selectedWeekId) {
            return {
              ...weekType,
              weekTaskList: weekType.weekTaskList.filter((task) => task.id !== selectedTask.id),
            };
          }
          return weekType;
        });
        return updatedWeekTypes;
      });

      setSelectedTask(null);
      setTaskMode("creation");
      resetForm();

      // Essayer de supprimer la tâche via l'API
      try {
        const { method, url } = weekTemplatesApi.deleteWeekTask(selectedTask.id);
        await axiosPrivate[method](url, { data: { id: selectedTask.id } });
      } catch (error) {
        handleApiError(error);
        toast.error("Oups! Une erreur s'est produite.", toastError);

        // Restaurer l'état précédent des weekTemplates en cas d'erreur
        setWeekTemplates(previousWeekTemplates);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      status: "local",
      title: "",
      description: "",
      startTime: null,
      endTime: null,
      dayOfWeek: "",
    });
  };

  const isTimeConflict = (newTask) => {
    // Retrieve the weekType corresponding to selectedWeekId
    const selectedWeekType = weekTemplates.find((weekType) => weekType.id === selectedWeekId);

    // If no weekType is found, return false (no conflict)
    if (!selectedWeekType) {
      return false;
    }

    // Filter tasks that take place on the same day as the new task
    const sameDayTasks = selectedWeekType.weekTaskList.filter(
      (task) => task.dayOfWeek === newTask.dayOfWeek
    );

    for (const task of sameDayTasks) {
      // Exclude the task being modified from the conflict check
      if (task.id !== newTask.id) {
        // Check if there is a time conflict between the new task and existing tasks
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

  useEffect(() => {
    if (selectedTask) {
      setFormData(selectedTask);
    }
  }, [selectedTask]);

  // Week Template Creator
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Grid container direction="column" padding={2} spacing={2}>
        <Grid item sx={{ textAlign: "center" }} aria-label="Bloc-Tilte">
          <Typography variant={"h6"} color={"primary"}>
            Editeur de postes
          </Typography>
        </Grid>

        <Grid item aria-label="weekTemplate-List">
          <Grid
            container
            direction="column"
            justifyContent="space-between"
            alignItems="center"
            paddingBottom={4}
          >
            <Grid item>
              <Grid aria-label="weekTemplate-Title">
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Typography variant="button">Postes de travail types</Typography>
                  <Fab size="small" color="primary" aria-label="add" onClick={handleDrawerOpen}>
                    <AddIcon />
                  </Fab>
                </Stack>
              </Grid>
              <Grid item paddingTop={2} aria-label="List">
                {weekTemplates?.length !== 0 && <WeekTemplatesList />}
                {weekTemplates?.length === 0 && (
                  <Alert severity="info">
                    Vous n'avez pas encore de modèle de semaine. Créez-en un en appuyant sur le
                    bouton '+'.
                  </Alert>
                )}
              </Grid>
            </Grid>

            {selectedWeekId && (
              <Grid
                item
                sx={{
                  flex: 4,
                  marginTop: 3,
                  width: "100%",
                }}
                aria-label="weekTask-Creator"
              >
                <Box>
                  <Typography variant="button">
                    {taskMode === "update" ? "Modifier une tâche" : "Ajouter une tâche"}
                  </Typography>{" "}
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
                      sx={{
                        marginTop: 1,
                      }}
                    >
                      <Grid item md={12} sx={{ width: "100%" }}>
                        <TextField
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          label="Titre"
                          variant="outlined"
                          size="small"
                          disabled={selectedWeekId ? false : true}
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
                          disabled={selectedWeekId ? false : true}
                        />
                      </Grid>
                      <Grid item md={12}>
                        <Typography color="primary">
                          {taskMode === "update" ? (
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
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-end",
                          }}
                        >
                          <AccessTimeIcon
                            sx={{
                              color: "primary.main",
                              mr: 1,
                              my: 0.5,
                            }}
                          />
                          <TimeField
                            label="Début"
                            name="startTime"
                            value={formData.startTime}
                            disabled={selectedWeekId ? false : true}
                            onChange={(value) => handleTimeChange(value, "startTime")}
                            format="HH:mm"
                            variant="outlined"
                            size="small"
                            fullWidth
                          />
                        </Box>
                      </Grid>
                      <Grid item md={6} marginBottom={2}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-end",
                          }}
                        >
                          <AccessTimeFilledIcon
                            sx={{
                              color: "primary.main",
                              mr: 1,
                              my: 0.5,
                            }}
                          />
                          <TimeField
                            label="Fin"
                            name="endTime"
                            disabled={selectedWeekId ? false : true}
                            value={formData.endTime}
                            onChange={(value) => handleTimeChange(value, "endTime")}
                            format="HH:mm"
                            variant="outlined"
                            size="small"
                            fullWidth
                          />
                        </Box>
                      </Grid>
                      <Grid item md={12} marginBottom={2}>
                        <Stack
                          direction="row"
                          justifyContent="flex-start"
                          alignItems="center"
                          spacing={2}
                        >
                          <LoadingButton
                            type="submit"
                            variant="contained"
                            color="primary"
                            loading={isLoading}
                            disabled={selectedWeekId ? false : true}
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
                        </Stack>
                      </Grid>
                    </Grid>{" "}
                  </form>
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          style: {
            width: isMd ? "50%" : "100%",
          },
        }}
      >
        <div>
          <IconButton onClick={handleDrawerClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <CreateWeekForm onCancel={handleDrawerClose} />
      </Drawer>
    </LocalizationProvider>
  );
};

export default AddBloc;
