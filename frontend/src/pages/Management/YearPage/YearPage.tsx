import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useNavigate, useLocation } from "react-router";
import * as yup from "yup";
import { specialityLinks } from "../../../doc/lists";
import yearsApi from "../../../services/yearsApi";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { toast } from "react-toastify";
import { toastSuccess } from "../../../doc/ToastParams";
import dayjs from "dayjs";

// Material UI
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

// Material UI
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import IconButton from "@mui/material/IconButton";

// General components
import DateHandler from "../../../components/medium/DateHandler";
import CustomDiaglog from "../../../components/medium/CustomDialog";
import { Stack } from "@mui/material";
import { handleApiError } from "@/services/apiError";

const validationSchema = yup.object({
  location: yup
    .string()
    .required("Veuillez renseigner l'hôpital de formation")
    .min(2, "Trop court"),
  speciality: yup
    .string()
    .required("Veuillez renseigner la spécialité de formation")
    .min(2, "Trop court"),
  title: yup.string().required("Veuillez nommer cette année de formation").min(2, "Trop court"),
  period: yup.string().required("Veuillez indiquer la période de formation"),
  dateOfStart: yup.mixed().required("La date de début est requise"),

  dateOfEnd: yup.mixed().required("La date de fin est requise"),
});

const dialogInfo = {
  title: {
    period: "Période de stage",
    maccs: "Equipe MACCS",
  },
  text: {
    period:
      "La période de stage doit couvrir l'année académique de tous les MACCS du groupe. Attention, la date de début et de fin de stage varie selon les réseaux.",
    maccs:
      " Ensemble des MACCS lié à une année. Cette dernière est supervisée par le maître de stage. Une fois l'année crée, partagez le code d'identification de l'année à vos MACCS pour qu'ils puissent s'y enregsiter.",
  },
};

const YearPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);

  const currentYear = new Date().getFullYear();

  const periods = {
    currentPeriod: currentYear + "-" + (currentYear + 1),
    previousPeriod: currentYear - 1 + "-" + currentYear,
  };

  const [dates, setDates] = useState({
    dateOfStart: null,
    dateOfEnd: null,
  });

  const initialValues = {
    location: "",
    speciality: "",
    title: "",
    period: "",
    dateOfStart: null,
    dateOfEnd: null,
  };

  const [LoadedValues, setLaodedValue] = useState({
    location: "",
    speciality: "",
    title: "",
    period: "",
  });

  const [isMaster, setIsMaster] = useState(true);

  const fetchYear = async (yearId) => {
    setLoading(true);
    try {
      const { method, url } = yearsApi.getYearById();
      const request = await axiosPrivate[method](url + yearId);
      const year = request.data;

      periods.push({ period: year.period });

      setLaodedValue({
        ...LoadedValues,
        location: year.location,
        speciality: year.speciality,
        title: year.title,
        period: year.period,
      });
      setDates({
        dates,
        dateOfStart: year.dateOfStart,
        dateOfEnd: year.dateOfEnd,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state?.yearId) {
      setEditing(true);
      fetchYear(state?.yearId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: initialize from route state once on mount

  const onSubmit = async ({ location, speciality, title, period, dateOfStart, dateOfEnd }) => {
    setLoading(true);

    const data = {
      title,
      dateOfStart: dayjs(dateOfStart).format("YYYY-MM-DD"),
      dateOfEnd: dayjs(dateOfEnd).format("YYYY-MM-DD"),
      period,
      location,
      comment: "",
      speciality,
      isMaster: isMaster,
    };

    try {
      const { method, url } = yearsApi.create();
      await axiosPrivate[method](url, data);
      toast.success("Année enregistrée!", toastSuccess);
      navigate("/manager/years");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: editing ? LoadedValues : initialValues,
    validationSchema: validationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [title, setTitle] = useState({});
  const [text, setText] = useState({});

  const handleClickOpen = (reference) => {
    setTitle(dialogInfo.title[reference]);
    setText(dialogInfo.text[reference]);
    setOpenDialog(true);
  };
  const handleClose = () => {
    setOpenDialog(false);
  };

  return (
    <Container
      sx={{
        paddingTop: { xs: theme.spacing(3), md: theme.spacing(2) },
        marginBottom: theme.spacing(4),
      }}
    >
      <Grid item container xs={12}>
        <Card sx={{ boxShadow: 3, padding: 4 }}>
          <Box>
            <Box
              display={"flex"}
              flexDirection={{ xs: "column", md: "row" }}
              justifyContent={"space-between"}
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Typography variant="h6" fontWeight={700}>
                Ajouter une année
              </Typography>
            </Box>
            <Box paddingY={4}>
              <Divider />
            </Box>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                    Date de début de stage
                  </Typography>

                  <DateHandler
                    value={formik.values.dateOfStart}
                    onChange={(newValue) => {
                      formik.handleChange({
                        target: {
                          name: "dateOfStart",
                          value: dayjs(newValue),
                        },
                      });
                    }}
                    label="Date de début"
                    error={formik.touched.dateOfStart && Boolean(formik.errors.dateOfStart)}
                    helperText={
                      formik.touched.dateOfStart && formik.errors.dateOfStart
                        ? formik.errors.dateOfStart
                        : ""
                    }
                  />
                  <IconButton onClick={() => handleClickOpen("period")}>
                    <HelpOutlineIcon color="primary" fontSize="small" />
                  </IconButton>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                    Date de fin de stage
                  </Typography>
                  <DateHandler
                    value={formik.values.dateOfEnd}
                    onChange={(newValue) => {
                      formik.handleChange({
                        target: {
                          name: "dateOfEnd",
                          value: newValue,
                        },
                      });
                    }}
                    label="Date de fin"
                    error={formik.touched.dateOfEnd && Boolean(formik.errors.dateOfEnd)}
                    helperText={
                      formik.touched.dateOfEnd && formik.errors.dateOfEnd
                        ? formik.errors.dateOfEnd
                        : ""
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl
                    fullWidth
                    error={formik.touched.period && Boolean(formik.errors.period)}
                  >
                    <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                      Période
                    </Typography>
                    <Select
                      variant="outlined"
                      name={"period"}
                      type={"text"}
                      value={formik.values.period}
                      onChange={formik.handleChange}
                    >
                      <MenuItem key={1} value={periods.currentPeriod}>
                        {periods.currentPeriod}
                      </MenuItem>
                      <MenuItem key={2} value={periods.previousPeriod}>
                        {periods.previousPeriod}
                      </MenuItem>
                    </Select>
                    <FormHelperText>{formik.touched.period && formik.errors.period}</FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl
                    fullWidth
                    error={formik.touched.speciality && Boolean(formik.errors.speciality)}
                  >
                    <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                      Spécialité
                    </Typography>
                    <Select
                      variant="outlined"
                      name={"speciality"}
                      type={"text"}
                      value={formik.values.speciality}
                      onChange={formik.handleChange}
                    >
                      {specialityLinks.map((speciality) => (
                        <MenuItem key={speciality.value} value={speciality.value}>
                          {speciality.title}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {formik.touched.speciality && formik.errors.speciality}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                    Lieu de stage
                  </Typography>
                  <TextField
                    variant="outlined"
                    name={"location"}
                    type={"text"}
                    fullWidth
                    value={formik.values.location}
                    onChange={formik.handleChange}
                    error={formik.touched.location && Boolean(formik.errors.location)}
                    helperText={formik.touched.location && formik.errors.location}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
                    Titre
                  </Typography>
                  <TextField
                    variant="outlined"
                    name={"title"}
                    type={"text"}
                    fullWidth
                    value={formik.values.title}
                    onChange={formik.handleChange}
                    error={formik.touched.title && Boolean(formik.errors.title)}
                    helperText={formik.touched.title && formik.errors.title}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isMaster}
                        onChange={(e) => setIsMaster(e.target.checked)}
                        name="master"
                      />
                    }
                    label="Je suis le maître de stage"
                  />
                </Grid>

                <Grid item container xs={12}>
                  <Box
                    display="flex"
                    flexDirection={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "stretched", sm: "center" }}
                    justifyContent={"space-between"}
                    width={1}
                    margin={"0 auto"}
                  >
                    <Box marginBottom={{ xs: 1, sm: 0 }}>
                      <Stack direction="row" alignItems="center">
                        <Typography colovariant={"subtitle2"}>
                          Enregistrez l'année pour ajouter des membres de l'
                        </Typography>
                        <Typography
                          color="primary"
                          colovariant={"subtitle2"}
                          sx={{ cursor: "pointer" }}
                          onClick={() => handleClickOpen("maccs")}
                        >
                          équipe MACCS.
                        </Typography>
                      </Stack>
                    </Box>
                    <Button
                      size={"large"}
                      variant={"contained"}
                      type={"submit"}
                      disabled={loading ? true : false}
                    >
                      Save
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Box>
        </Card>
      </Grid>
      <CustomDiaglog handleClose={handleClose} open={openDialog} title={title} text={text} />
    </Container>
  );
};

export default YearPage;
