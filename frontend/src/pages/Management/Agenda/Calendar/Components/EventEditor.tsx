import React, { useState, useEffect } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import { toast } from "react-toastify";
import logger from "../../../../../services/logger";
import dayjs from "@/lib/dayjs";
import { useFormik } from "formik";
import * as yup from "yup";

// Material UI
import DeleteIcon from "@mui/icons-material/Delete";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import FormHelperText from "@mui/material/FormHelperText";

// Material UI
import {
  Grid,
  Typography,
  TextField,
  FormControlLabel,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Switch,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import useManagersCalendarContext from "../../../../../hooks/useManagersCalendarContext";

// General components
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import CustomDateTimePicker from "../../../../../components/medium/CustomDateTimeHandler";
import { handleApiError } from "@/services/apiError";

const validationSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(2, "Le titre est trop court")
    .max(50, "Le titre est trop long")
    .required("Le titre doit être renseigné"),
  description: yup.string().trim().max(50, "Description trop longue"),
  currentResident: yup
    .number()
    .typeError("Le MACCS doit être renseigné")
    .integer()
    .required("Le MACCS doit être renseigné"),
});

const EventEditor = ({ handleDrawerClose, selectedEventId, selectedDate }) => {
  const axiosPrivate = useAxiosPrivate();

  const [isLoading, setIsLoading] = useState(false);

  const [isAllDay, setIsAllDay] = useState(false); // Initialiser l'état isAllDay

  const {
    yearResidents,
    setSchedules,
    schedules,
    selectedSchedules,
    setSelectedSchedules,
    currentYear,
  } = useManagersCalendarContext();

  const handleSwitchChange = (event) => {
    setIsAllDay(event.target.checked); // Mettre à jour l'état isAllDay lors du changement du switch
  };

  const onSubmit = (values) => {
    const event = {
      yearId: currentYear?.yearId,
      currentResident: values.currentResident,
      title: values.title,
      dateOfStart: dayjs(values.dateOfStart).format("YYYY-MM-DD HH:mm"),
      dateOfEnd: dayjs(values.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      description: values.description,
    };

    selectedEventId ? handleUpdate(event) : handleAdd(event);
  };

  const handleAdd = async (event) => {
    setIsLoading(true);

    const newEvent = {
      yearId: currentYear?.yearId,
      residentId: event.currentResident,
      title: event.title,
      dateOfStart: dayjs(event.dateOfStart).format("YYYY-MM-DD HH:mm"),
      dateOfEnd: dayjs(event.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      description: event.description,
    };

    try {
      const { method, url } = calendarApi.addEvent();
      const response = await axiosPrivate[method](url, newEvent);

      if (response?.status === 200) {
        const addedEvent = response.data.event;

        // Trouvez le résident correspondant dans l'array yearResidents
        const resident = yearResidents.find((r) => r.residentId === addedEvent.classNames);

        if (resident) {
          const residentColor = resident ? resident.residentColor : null;
          // Transformons l'événement en un format approprié pour le calendrier
          const formattedEvent = {
            residentYearCalendarId: addedEvent.residentYearCalendarId,
            title: addedEvent.title,
            start: addedEvent.start, // changed this line
            end: addedEvent.end, // and this line
            classNames: addedEvent.classNames,
            residentName: addedEvent.residentName,
            residentFirstname: addedEvent.residentFirstname, // added this line
            residentLastname: addedEvent.residentLastname, // and this line
            residentColor: residentColor, // and this line
            description: addedEvent.description, // assuming description is also returned in the response
          };

          setSchedules((prevSchedules) => [...prevSchedules, formattedEvent]);
          setSelectedSchedules((prevSelectedSchedules) => [
            ...prevSelectedSchedules,
            formattedEvent,
          ]);
          toast.success(response?.data?.message, toastSuccess);
        } else {
          logger.warn(`Resident with ID ${addedEvent.classNames} not found`);
        }
      }
    } catch (error) {
      handleApiError(error);
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, toastError);
      } else {
        toast.error("Oups! Une erreur s'est produite.", toastError);
      }
    } finally {
      setIsLoading(false);
      drawerClose();
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const { method, url } = calendarApi.deleteEvent(selectedEventId);
      const response = await axiosPrivate[method](url);

      // Si la requête est réussie, supprimez l'événement des listes locales
      if (response.status === 200) {
        setSelectedSchedules(
          selectedSchedules.filter((e) => e.residentYearCalendarId !== selectedEventId)
        );
        setSchedules(schedules.filter((e) => e.residentYearCalendarId !== selectedEventId));
      }
      toast.success(response?.data?.message, toastSuccess);
    } catch (error) {
      handleApiError(error);
      toast.error(error?.data?.message, toastError);
    } finally {
      setIsLoading(false);
      drawerClose();
    }
  };

  const handleUpdate = async (event) => {
    setIsLoading(true);

    const updatedEvent = {
      residentYearCalendarId: selectedEventId,
      residentId: event.currentResident,
      title: event.title,
      dateOfStart: dayjs(event.dateOfStart).format("YYYY-MM-DD HH:mm"),
      dateOfEnd: dayjs(event.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      description: event.description,
    };

    try {
      const { method, url } = calendarApi.updateEvent();
      const response = await axiosPrivate[method](url, updatedEvent);

      if (response?.status === 200) {
        const resident = yearResidents.find(
          (resident) => resident.residentId === updatedEvent.residentId
        );
        const residentColor = resident ? resident.residentColor : null;

        const formattedUpdatedEvent = {
          residentYearCalendarId: updatedEvent.residentYearCalendarId,
          title: updatedEvent.title,
          start: dayjs(updatedEvent.dateOfStart).format("YYYY-MM-DD HH:mm"),
          end: dayjs(updatedEvent.dateOfEnd).format("YYYY-MM-DD HH:mm"),
          residentId: updatedEvent.residentId,
          residentName: resident.residentFirstname + " " + resident.residentLastname,
          residentColor: residentColor,
          residentFirstname: resident.residentFirstname,
          residentLastname: resident.residentLastname,
          description: updatedEvent.description,
          classNames: updatedEvent.residentId,
        };

        setSchedules((prevSchedules) => {
          return prevSchedules.map((schedule) =>
            schedule.residentYearCalendarId === selectedEventId ? formattedUpdatedEvent : schedule
          );
        });

        setSelectedSchedules((prevSelectedSchedules) => {
          return prevSelectedSchedules.map((schedule) =>
            schedule.residentYearCalendarId === selectedEventId ? formattedUpdatedEvent : schedule
          );
        });

        toast.success(response?.data?.message, toastSuccess);
      }
    } catch (error) {
      handleApiError(error);
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, toastError);
      } else {
        toast.error("Oups! Une erreur s'est produite.", toastError);
      }
    } finally {
      setIsLoading(false);
      drawerClose();
    }
  };

  // Thing to do depending if the user is in creation or in update mode
  useEffect(() => {
    if (selectedEventId) {
      const event = selectedSchedules.find((e) => e.residentYearCalendarId === selectedEventId);
      if (event.start) {
        formik.setValues({
          title: event.title,
          description: event.description,
          currentResident: event.classNames,
          dateOfStart: dayjs.utc(event.start),
          dateOfEnd: dayjs.utc(event.end),
        });
      }
    } else {
      formik.setValues({
        title: "",
        description: "",
        currentResident: null,
        dateOfStart: null,
        dateOfEnd: null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]); // intentional: formik and selectedSchedules excluded to avoid infinite loop

  useEffect(() => {
    if (!selectedEventId) {
      formik.setValues({
        title: "",
        description: "",
        currentResident: null,
        dateOfStart: dayjs.utc(selectedDate).hour(8).minute(0),
        dateOfEnd: dayjs.utc(selectedDate).hour(18).minute(0),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, selectedDate]); // intentional: formik excluded to avoid infinite loop

  // isAllDayController
  useEffect(() => {
    if (isAllDay) {
      formik.setValues({
        ...formik.values,
        dateOfStart: dayjs.utc(formik.values.dateOfStart).hour(8).minute(0),
        dateOfEnd: dayjs.utc(formik.values.dateOfStart).hour(17).minute(0),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllDay]); // intentional: formik excluded to avoid infinite loop

  // Effect that monitors formik.values.dateOfStart

  // Drawer controller
  const drawerClose = () => {
    handleDrawerClose();
  };

  // Formik
  const initialValues = {
    title: "",
    description: "",
    currentResident: null,
    dateOfStart: null,
    dateOfEnd: null,
  };

  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema,
    onSubmit,
  });

  // Effect that monitors formik.values.dateOfStart
  const checkDateOfEnd = (value) => {
    const startDate = dayjs.utc(value);
    const endDate = dayjs.utc(formik.values.dateOfEnd);

    if (startDate.isAfter(endDate)) {
      // If the start date is after the end date
      const newEndDate = startDate.clone().add(2, "hours"); // Start date + 2 hours

      if (newEndDate.date() !== startDate.date()) {
        // If the new end date is the next day, set it to the same time as the start date
        formik.setValues({
          ...formik.values,
          dateOfEnd: startDate,
        });
      } else {
        // Otherwise, set to the new end date
        formik.setValues({
          ...formik.values,
          dateOfEnd: newEndDate,
        });
      }
    }
  };

  const checkDateOfStart = (value) => {
    const endDate = dayjs.utc(value);
    const startDate = dayjs.utc(formik.values.dateOfStart);

    if (endDate.format("YYYY-MM-DD") !== startDate.format("YYYY-MM-DD")) {
      // If the end date is different from the start date
      const newStartDate = endDate.clone().subtract(2, "hours"); // End date - 2 hours

      if (newStartDate.date() !== endDate.date()) {
        // If the new start date is the previous day, set it to the same time as the end date
        formik.setValues({
          ...formik.values,
          dateOfStart: endDate,
        });
      } else {
        // Otherwise, set to the new start date
        formik.setValues({
          ...formik.values,
          dateOfStart: newStartDate,
        });
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2} direction="column">
          <Grid item>
            <Box bgcolor="grey.100" height={"4vh"} padding={2}>
              <Typography variant="h5" align="left" color={"primary"}>
                {selectedEventId ? "Modifier un évènement" : "Ajouter un évènement"}
              </Typography>
            </Box>
          </Grid>
          <Grid item>
            <Box p={4} spacing={2}>
              <TextField
                label="Titre*"
                name="title"
                value={formik.values.title}
                onChange={(e) => {
                  formik.setFieldValue(
                    "title",
                    e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                  );
                }}
                fullWidth
                sx={{ marginBottom: 3 }}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title}
              />
              <FormControl
                fullWidth
                sx={{ marginBottom: 3 }}
                error={formik.touched.currentResident && Boolean(formik.errors.currentResident)}
              >
                <InputLabel id="demo-simple-select-label">MACCS*</InputLabel>
                <Select
                  value={formik.values.currentResident || ""}
                  onChange={(e) => formik.setFieldValue("currentResident", e.target.value)}
                  label="MACCS*"
                  name="currentResident"
                >
                  {yearResidents.map((res) => (
                    <MenuItem key={res.residentId} value={res.residentId}>
                      {res.residentFirstname} {res.residentLastname}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.currentResident && formik.errors.currentResident}
                </FormHelperText>
              </FormControl>

              <FormControl fullWidth sx={{ marginBottom: 3 }}>
                {" "}
                <CustomDateTimePicker
                  label={"Début*"}
                  name="dateOfStart"
                  value={formik.values.dateOfStart}
                  views={
                    isAllDay
                      ? ["year", "month", "day"]
                      : ["year", "month", "day", "hours", "minutes"]
                  }
                  onChange={(value) => {
                    checkDateOfEnd(value);
                    formik.handleChange({
                      target: {
                        name: "dateOfStart",
                        value,
                      },
                    });
                  }}
                  helperText={null}
                  disableFuture={false}
                />
              </FormControl>

              <FormControl fullWidth sx={{ marginBottom: 3 }}>
                <CustomDateTimePicker
                  label={"Fin"}
                  name="dateOfEnd"
                  value={formik.values.dateOfEnd}
                  views={
                    isAllDay
                      ? ["year", "month", "day"]
                      : ["year", "month", "day", "hours", "minutes"]
                  }
                  minDateTime={formik.values.dateOfStart}
                  maxDate={formik.values.dateOfStart}
                  onChange={(value) => {
                    checkDateOfStart(value);
                    formik.handleChange({
                      target: {
                        name: "dateOfEnd",
                        value,
                      },
                    });
                  }}
                  helperText={null}
                  disableFuture={false}
                />
              </FormControl>

              <FormControlLabel
                control={<Switch checked={isAllDay} onChange={handleSwitchChange} />}
                label="Toute la journée"
                sx={{ marginBottom: 3 }}
              />

              <TextField
                name="description"
                label="Description"
                rows={3}
                multiline
                value={formik.values.description}
                onChange={(e) => {
                  formik.setFieldValue(
                    "description",
                    e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                  );
                }}
                fullWidth
                sx={{ marginBottom: 3 }}
              />
              <Grid item container spacing={2}>
                <Grid item>
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    disabled={isLoading ? true : false}
                    loading={isLoading}
                    //onClick={selectedEventId ? handleUpdate : handleAdd}
                  >
                    {selectedEventId ? "Modifier" : "Enregistrer"}
                  </LoadingButton>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    onClick={handleDrawerClose}
                    disabled={isLoading ? true : false}
                  >
                    Annuler
                  </Button>
                </Grid>
                {selectedEventId && (
                  <Grid item>
                    <IconButton onClick={handleDelete} disabled={isLoading ? true : false}>
                      <DeleteIcon sx={{ color: !isLoading && "red" }} />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </form>
    </LocalizationProvider>
  );
};

export default EventEditor;
