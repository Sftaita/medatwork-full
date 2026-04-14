import { useState, useEffect } from "react";
import absencesApi from "../../../../services/absencesApi";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

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
import FormHelperText from "@mui/material/FormHelperText";

// general components
import DateHandler from "../../../../components/medium/DateHandler";
import CustomSwitch from "../../../../components/small/CustomSwitch";
import CustomDialog from "../../../../components/medium/CustomDialog";
import { handleApiError } from "@/services/apiError";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const dialogInfo = {
  title: {
    sickLeave: "Certificat médical",
    paternityLeave: "Certificat de naissance",
    maternityLeave: "Certificat de naissance",
  },
  text: {
    sickLeave:
      "Un congé maladie doit être couvert par un certificat médical qui doit être envoyé au resource humaine. Vous pouvez l'envoyer à l'adresse suivante:",
    paternityLeave:
      " Un congé de paternité doit être justifié par un certificat de naissance afin d'être validé. Vous pouvez l'envoyer à l'adresse suivante:",
    maternityLeave:
      " Un congé de maternité doit être justifié par un certificat de naissance afin d'être validé. Vous pouvez l'envoyer à l'adresse suivante:",
  },
};

const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", type: "" };

const Absence = ({ years, yearsLoading, onHelpOpen }: { years: any[]; yearsLoading: boolean; onHelpOpen?: () => void }) => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const [absence, setAbsence] = useState({
    year: "",
    dateOfStart: null,
    dateOfEnd: null,
    type: "",
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [multidate, setMultidate] = useState(false);

  useEffect(() => {
    if (years.length !== 0) {
      setAbsence((prev) => ({ ...prev, year: years[0].id }));
    }
  }, [years]);

  const handleChange = ({ target }: { target: { name: string; value: string } }) => {
    setAbsence((prev) => ({ ...prev, [target.name]: target.value }));
    setErrors((prev) => ({ ...prev, [target.name]: "" }));
  };

  const handleDateChange1 = (date) => {
    setAbsence((prev) => ({ ...prev, dateOfStart: date }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const handleDateChange2 = (date) => {
    setAbsence((prev) => ({ ...prev, dateOfEnd: date }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (absence.year === "") {
      errs.year = "Vous n'avez pas renseigné l'année";
    }
    if (absence.type === "") {
      errs.type = "Vous n'avez pas renseigné le type d'absence";
    }
    if (absence.dateOfStart === null) {
      errs.dateOfStart = "Vous n'avez pas renseigné la date de début d'absence";
    }
    if (multidate) {
      if (absence.dateOfEnd === null) {
        errs.dateOfEnd = "Vous n'avez pas renseigné la date de fin d'absence";
      } else if (
        dayjs(absence.dateOfEnd).isBefore(dayjs(absence.dateOfStart)) ||
        dayjs(absence.dateOfEnd).isSame(dayjs(absence.dateOfStart))
      ) {
        errs.dateOfEnd = "La date de fin ne peut pas être avant ou le même jour que la date de début";
      }
    }

    const hasErrors = Object.keys(errs).length > 0;
    if (hasErrors) setErrors((prev) => ({ ...prev, ...errs }));
    return hasErrors;
  };

  const resetForm = () => {
    setAbsence((prev) => ({ ...prev, dateOfStart: null, dateOfEnd: null, type: "" }));
    setMultidate(false);
    setErrors(EMPTY_ERRORS);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (validate()) return;

    setLoading(true);
    try {
      const { method, url } = absencesApi.create();
      await axiosPrivate[method](url, {
        ...absence,
        dateOfStart: dayjs(absence.dateOfStart).format("YYYY-MM-DD"),
        dateOfEnd: absence.dateOfEnd ? dayjs(absence.dateOfEnd).format("YYYY-MM-DD") : null,
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

  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const handleClickOpen = (reference: string) => {
    setTitle(dialogInfo.title[reference]);
    setText(dialogInfo.text[reference]);
    setOpenDialog(true);
  };
  const handleClose = () => {
    setOpenDialog(false);
  };

  useEffect(() => {
    if (
      absence.type === "sickLeave" ||
      absence.type === "paternityLeave" ||
      absence.type === "maternityLeave"
    ) {
      handleClickOpen(absence.type);
    }
  }, [absence.type]);

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
                value={absence.year}
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

            <Grid item xs={12} md={12}>
              <CustomSwitch
                label="Dates multiples"
                checked={multidate}
                handleCheck={(event) => setMultidate(event.target.checked)}
              />
            </Grid>

            <Grid item xs={12} md={multidate ? 6 : 12}>
              <DateHandler
                label={"Début de l'absence"}
                value={absence.dateOfStart}
                onChange={handleDateChange1}
                error={!!errors.dateOfStart}
                helperText={errors.dateOfStart}
              />
            </Grid>

            {multidate && (
              <Grid item xs={12}>
                <DateHandler
                  label={"Fin de l'absence"}
                  value={absence.dateOfEnd}
                  onChange={handleDateChange2}
                  error={!!errors.dateOfEnd}
                  helperText={errors.dateOfEnd}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel id="absence-type-label">Type d'absence</InputLabel>
                <Select
                  labelId="absence-type-label"
                  id="absence-type-select"
                  name="type"
                  value={absence.type}
                  label="Type d'absence"
                  onChange={(event) => handleChange(event)}
                >
                  <MenuItem value={"annualLeave"} key={1}>
                    Congé annuel
                  </MenuItem>
                  <MenuItem value={"paidLeave"} key={2}>
                    Congé férié
                  </MenuItem>
                  <MenuItem value={"sickLeave"} key={3}>
                    Congé maladie
                  </MenuItem>
                  <MenuItem value={"paternityLeave"} key={4}>
                    Congé paternité
                  </MenuItem>
                  <MenuItem value={"maternityLeave"} key={5}>
                    Congé maternité
                  </MenuItem>
                  <MenuItem value={"scientificLeave"} key={6}>
                    Congé scientifique
                  </MenuItem>
                  <MenuItem value={"casualLeave"} key={7}>
                    Congé de circonstance
                  </MenuItem>
                  <MenuItem value={"unpaidLeave"} key={8}>
                    Congé non rémunéré
                  </MenuItem>
                  <MenuItem value={"compensatoryHolidayLeave"} key={9}>
                    Récupération de jour férié
                  </MenuItem>
                  <MenuItem value={"recovery"} key={10}>
                    Récupération
                  </MenuItem>
                </Select>
                <FormHelperText>{errors.type}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                sx={{ height: 54 }}
                variant="contained"
                color="primary"
                size="medium"
                type="submit"
                fullWidth
                onClick={handleSubmit}
                disabled={yearsLoading || loading}
              >
                {loading ? <CircularProgress color="inherit" size={24} /> : "Enregistrer"}
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

            <Grid item container justifyContent={"center"} xs={12}>
              <Box>
                <Typography component="p" variant="body2" align="left">
                  En cliquant sur "enregistrer", votre{" "}
                  <Box component="span" color={theme.palette.text.primary} fontWeight={"700"}>
                    maître de stage
                  </Box>{" "}
                  aura accès à votre{" "}
                  <Box component="span" color={theme.palette.text.primary} fontWeight={"700"}>
                    encodage
                  </Box>{" "}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>
      <CustomDialog handleClose={handleClose} open={openDialog} title={title} text={text} />
    </Box>
  );
};

export default Absence;
