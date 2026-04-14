import { useState, useEffect } from "react";
import timesheetsApi from "../../../../services/timesheetsApi";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router";
import useAuth from "../../../../hooks/useAuth";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import CustomSelect from "../../../../components/medium/CustomSelect";
import CircularProgress from "@mui/material/CircularProgress";

// general components
import CustomDateTimeHandler from "../../../../components/medium/CustomDateTimeHandler";
import CustomSwitch from "../../../../components/small/CustomSwitch";
import { handleApiError } from "@/services/apiError";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const time = [
  { value: 0, label: "Pas aujourd'hui" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 heure" },
  { value: 75, label: "1 heure 15 minutes" },
  { value: 90, label: "1 heure 30 minutes" },
  { value: 105, label: "1 heure 45 minutes" },
  { value: 120, label: "2 heures" },
];

const getDefaultDates = () => ({
  dateOfStart: dayjs()
    .set("hour", 8)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0)
    .toDate(),
  dateOfEnd: dayjs()
    .set("hour", 18)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0)
    .toDate(),
});


const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", pause: "", scientific: "" };

const Timer = ({
  years,
  yearsLoading,
  onHelpOpen,
}: {
  years: any[];
  yearsLoading: boolean;
  onHelpOpen?: () => void;
}) => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const { setSelectedMenuItem } = useAuth();

  const { id, type } = useParams();
  const [updateMode, setUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [timesheet, setTimesheet] = useState({
    year: "",
    ...getDefaultDates(),
    pause: 0,
    scientific: 0,
    called: false,
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);

  useEffect(() => {
    if (id && type === "timer") {
      setUpdateMode(true);
      handleFindTimesheet(id);
    } else {
      setUpdateMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  useEffect(() => {
    if (years.length !== 0 && updateMode === false) {
      setTimesheet((prev) => ({ ...prev, year: years[0].id }));
    }
  }, [years, updateMode]);

  const handleFindTimesheet = async (id) => {
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.findTimesheetById();
      const request = await axiosPrivate[method](url + id);
      setTimesheet({
        year: request.data.yearId,
        dateOfStart: dayjs(request.data.dateOfStart),
        dateOfEnd: dayjs(request.data.dateOfEnd),
        pause: request.data.pause,
        scientific: request.data.scientific,
        called: request.data.called,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = ({ target }) => {
    setTimesheet((prev) => ({ ...prev, [target.name]: target.value }));
    setErrors((prev) => ({ ...prev, [target.name]: "" }));
  };

  const handleDateChange1 = (date) => {
    setTimesheet((prev) => ({ ...prev, dateOfStart: date }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const handleDateChange2 = (date) => {
    setTimesheet((prev) => ({ ...prev, dateOfEnd: date }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  const validate = () => {
    const errs: Record<string, any> = { status: false };
    if (timesheet.year === "") {
      errs.year = "Vous n'avez pas renseigné l'année";
      errs.status = true;
    }
    if (!timesheet.dateOfStart) {
      errs.dateOfStart = "Vous n'avez pas renseigné l'heure de début";
      errs.status = true;
    }
    if (!timesheet.dateOfEnd) {
      errs.dateOfEnd = "Vous n'avez pas renseigné l'heure de fin";
      errs.status = true;
    }
    if (errs.status) setErrors(errs);
    return errs.status;
  };

  const resetForm = () => {
    setTimesheet((prev) => ({
      ...prev,
      ...getDefaultDates(),
      pause: 0,
      scientific: 0,
      called: false,
    }));
    setErrors(EMPTY_ERRORS);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (validate()) return;

    setLoading(true);
    try {
      const { method, url } = timesheetsApi.create();
      await axiosPrivate[method](url, {
        ...timesheet,
        dateOfStart: dayjs(timesheet.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd: dayjs(timesheet.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      });
      toast.success("Enregistrement validé!", {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
      resetForm();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (validate()) return;

    setLoading(true);
    try {
      const { method, url } = timesheetsApi.updateTimesheet();
      await axiosPrivate[method](url + id, {
        ...timesheet,
        dateOfStart: dayjs(timesheet.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd: dayjs(timesheet.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      });
      toast.success("Enregistrement validé!", {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
      setSelectedMenuItem("Mes encodages");
      navigate("/maccs/data-management");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box padding={{ xs: 3, sm: 6 }} component={Card} boxShadow={1} marginBottom={4}>
        <form noValidate autoComplete="off">
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <CustomSelect
                label="Année(s)"
                name="year"
                error={!!errors.year}
                value={timesheet.year}
                onChange={(event) => handleChange(event)}
                item={years.map((e) => (
                  <MenuItem value={e.id} key={e.id}>
                    {e.title}
                  </MenuItem>
                ))}
                loading={yearsLoading}
                helperText={errors.year}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <CustomDateTimeHandler
                label={"Début"}
                value={timesheet.dateOfStart}
                onChange={handleDateChange1}
                error={!!errors.dateOfStart}
                helperText={errors.dateOfStart}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <CustomDateTimeHandler
                label={"Fin"}
                value={timesheet.dateOfEnd}
                minDateTime={timesheet.dateOfStart}
                onChange={handleDateChange2}
                error={!!errors.dateOfEnd}
                helperText={errors.dateOfEnd}
              />
            </Grid>

            <Grid item xs={12}>
              <CustomSwitch
                label="Retour en garde"
                checked={timesheet.called}
                handleCheck={(event) =>
                  setTimesheet((prev) => ({
                    ...prev,
                    called: event.target.checked,
                    scientific: 0,
                    pause: 0,
                  }))
                }
              />
              {timesheet.called && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                  Garde appelable — vous avez été rappelé et êtes revenu à l'hôpital.
                </Typography>
              )}
            </Grid>

            {!timesheet.called && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="pause-label">Pause</InputLabel>
                    <Select
                      labelId="pause-label"
                      name="pause"
                      value={timesheet.pause}
                      label="Pause"
                      onChange={(event) => handleChange(event)}
                    >
                      {time.map(({ value, label }) => (
                        <MenuItem value={value} key={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="scientific-label">Scientifique</InputLabel>
                    <Select
                      labelId="scientific-label"
                      name="scientific"
                      value={timesheet.scientific}
                      label="Scientifique"
                      onChange={(event) => handleChange(event)}
                    >
                      {time.map(({ value, label }) => (
                        <MenuItem value={value} key={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Button
                sx={{ height: 54 }}
                variant="contained"
                color="primary"
                size="medium"
                type="submit"
                fullWidth
                onClick={updateMode ? handleUpdate : handleSubmit}
                disabled={yearsLoading || loading}
              >
                {loading ? (
                  <CircularProgress color="inherit" size={24} />
                ) : updateMode ? (
                  "Modifier"
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </Grid>

            {onHelpOpen && (
              <Grid item xs={12} display="flex" justifyContent="center">
                <Button
                  size="small"
                  color="primary"
                  startIcon={<HelpOutlineIcon fontSize="small" />}
                  onClick={onHelpOpen}
                  sx={{ textTransform: "none", fontSize: "0.8rem" }}
                >
                  Comment ça fonctionne ?
                </Button>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography component="p" variant="body2" align="left">
                En cliquant sur "enregistrer", vous donnez accès{" "}
                <Box component="span" color={theme.palette.text.primary} fontWeight={700}>
                  aux informations
                </Box>{" "}
                à votre{" "}
                <Box component="span" color={theme.palette.text.primary} fontWeight={700}>
                  maître de stage.
                </Box>
              </Typography>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Box>
  );
};

export default Timer;
