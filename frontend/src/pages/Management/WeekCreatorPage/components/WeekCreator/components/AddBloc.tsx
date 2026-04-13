import React, { useState, useEffect } from "react";

// Material UI
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Button, TextField } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import useWeekShedulerContext from "../../../../../../hooks/useWeekShedulerContext";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import IconButton from "@mui/material/IconButton";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { TimeField } from "@mui/x-date-pickers/TimeField";

// Local components
import TaskHistory from "../../TaskHistory";
import { Stack } from "@mui/system";
import { Delete } from "@mui/icons-material";

const AddBloc = () => {
  const {
    currentWeek,
    setCurrentWeek,
    selectedWeekDay,
    selectedTask,
    setSelectedTask,
    taskMode,
    setTaskMode,
  } = useWeekShedulerContext();

  const [nextId, setNextId] = useState(100000000000);
  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const [formData, setFormData] = useState({
    id: "",
    status: "local",
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

  const handleAddTask = (e) => {
    e.preventDefault();
    const updatedFormData = {
      ...formData,
      id: nextId,
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
    };

    if (!isTimeConflict(updatedFormData)) {
      setCurrentWeek([...currentWeek, updatedFormData]);

      resetForm();
    } else {
      alert("Il y a un conflit d'horaire avec une autre tâche.");
    }
    setNextId(nextId + 1);
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    const newTask = {
      ...selectedTask,
      ...formData,
      dayOfWeek: selectedWeekDay,
      startTime: formData.startTime ? formData.startTime.format("HH:mm") : null,
      endTime: formData.endTime ? formData.endTime.format("HH:mm") : null,
    };

    // Ajout de l'appel à isTimeConflict ici
    if (!isTimeConflict(newTask)) {
      const updatedWeek = currentWeek.map((task) => (task.id === selectedTask.id ? newTask : task));
      setCurrentWeek(updatedWeek);
      setSelectedTask(null);
      setTaskMode("creation");
      resetForm();
    } else {
      alert("Il y a un conflit d'horaire avec une autre tâche.");
    }
  };

  const handleCancel = () => {
    setTaskMode("creation");
    setSelectedTask(null);
    resetForm();
  };

  const handleDelete = () => {
    if (selectedTask) {
      const updatedWeek = currentWeek.filter((task) => task.id !== selectedTask.id);
      setCurrentWeek(updatedWeek);
      setSelectedTask(null);
      setTaskMode("creation");
      resetForm();
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
    // Filter tasks that occur on the same day as the new task
    const sameDayTasks = currentWeek.filter((task) => task.dayOfWeek === newTask.dayOfWeek);
    for (const task of sameDayTasks) {
      // Exclude the task being modified from the conflict check
      if (task.id !== newTask.id) {
        // Check if there is a time conflict between the new task and the existing tasks
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

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Grid container direction="column" padding={2} spacing={2}>
        <Grid item md={12} sx={{ textAlign: "center" }}>
          <Typography>Ajouter une tâche</Typography>
        </Grid>

        <Grid item md={12}>
          <Grid container direction="column" justifyContent="flex-start" paddingBottom={4}>
            <Grid item md={12} marginTop={2}>
              <Card
                sx={{
                  marginBottom: 2,

                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 10px -5px",
                }}
              >
                <Typography variant="button">
                  {taskMode === "update" ? "Modifier" : "Ajouter"}
                </Typography>{" "}
                <form
                  onSubmit={(e) => {
                    taskMode === "update" ? handleUpdate(e) : handleAddTask(e);
                  }}
                >
                  <Grid
                    container
                    direction="row"
                    alignContent={"center"}
                    spacing={2}
                    sx={{ marginTop: 1 }}
                  >
                    <Grid item md={12}>
                      <TextField
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        label="Titre"
                        variant="outlined"
                        size="small"
                        sx={{ width: "100%" }}
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
                        sx={{ width: "100%" }}
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
                          dayNames[selectedWeekDay - 1]
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
                          onChange={(value) => handleTimeChange(value, "startTime")}
                          format="HH:mm"
                          variant="outlined"
                          size="small"
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
                          value={formData.endTime}
                          onChange={(value) => handleTimeChange(value, "endTime")}
                          format="HH:mm"
                          variant="outlined"
                          size="small"
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
                        <Button type="submit" variant="contained" color="primary">
                          {taskMode === "update" ? "Modifier" : "Ajouter"}
                        </Button>
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
              </Card>
            </Grid>
            <Grid item md={12} marginBottom={2}>
              <Typography variant="button">Mes taches</Typography>
            </Grid>
            <Grid item>
              <TaskHistory />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
};

export default AddBloc;
