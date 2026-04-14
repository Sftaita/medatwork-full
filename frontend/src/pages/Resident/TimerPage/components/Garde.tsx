import { useState, useEffect } from "react";
import gardesApi from "../../../../services/gardesApi";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import dayjs from "dayjs";

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
import AddCommentIcon from "@mui/icons-material/AddComment";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// general components
import CustomDateTimeHandler from "../../../../components/medium/CustomDateTimeHandler";
import { handleApiError } from "@/services/apiError";

const getDefaultDates = () => {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);

  const end = new Date();
  end.setHours(8, 0, 0, 0);

  return { dateOfStart: start, dateOfEnd: end };
};

const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", type: "", comment: "" };

const Garde = ({ years, yearsLoading, onHelpOpen }: { years: any[]; yearsLoading: boolean; onHelpOpen?: () => void }) => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);

  const [garde, setGarde] = useState({
    year: "",
    type: "",
    ...getDefaultDates(),
    comment: "",
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [addComment, setAddComment] = useState(false);

  useEffect(() => {
    if (years.length !== 0) {
      setGarde((prev) => ({ ...prev, year: years[0].id }));
    }
  }, [years]);

  const handleChange = ({ target }) => {
    setGarde((prev) => ({ ...prev, [target.name]: target.value }));
    setErrors((prev) => ({ ...prev, [target.name]: "" }));
  };

  const handleDateChange1 = (date) => {
    setGarde((prev) => ({ ...prev, dateOfStart: date }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const handleDateChange2 = (date) => {
    setGarde((prev) => ({ ...prev, dateOfEnd: date }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  const validate = () => {
    const errs: Record<string, any> = { status: false };
    if (garde.year === "") {
      errs.year = "Vous n'avez pas renseigné l'année";
      errs.status = true;
    }
    if (!garde.dateOfStart) {
      errs.dateOfStart = "Vous n'avez pas renseigné la date de début de garde";
      errs.status = true;
    }
    if (!garde.dateOfEnd) {
      errs.dateOfEnd = "Vous n'avez pas renseigné la date de fin de garde";
      errs.status = true;
    }
    if (garde.type === "") {
      errs.type = "Vous n'avez pas renseigné le type de garde";
      errs.status = true;
    }
    if (errs.status) setErrors(errs);
    return errs.status;
  };

  const resetForm = () => {
    setGarde((prev) => ({ ...prev, ...getDefaultDates(), type: "", comment: "" }));
    setErrors(EMPTY_ERRORS);
    setAddComment(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (validate()) return;

    setLoading(true);
    try {
      const { method, url } = gardesApi.create();
      await axiosPrivate[method](url, {
        ...garde,
        dateOfStart: dayjs(garde.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd: dayjs(garde.dateOfEnd).format("YYYY-MM-DD HH:mm"),
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
                value={garde.year}
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

            <Grid item xs={12}>
              <CustomDateTimeHandler
                label={"Début de la garde"}
                value={garde.dateOfStart}
                onChange={handleDateChange1}
                error={!!errors.dateOfStart}
                helperText={errors.dateOfStart}
              />
            </Grid>

            <Grid item xs={12}>
              <CustomDateTimeHandler
                label={"Fin de la garde"}
                value={garde.dateOfEnd}
                minDateTime={garde.dateOfStart}
                onChange={handleDateChange2}
                error={!!errors.dateOfEnd}
                helperText={errors.dateOfEnd}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel id="garde-type-label">Type de garde</InputLabel>
                <Select
                  labelId="garde-type-label"
                  name="type"
                  value={garde.type}
                  label="Type de garde"
                  onChange={(event) => handleChange(event)}
                >
                  <MenuItem value={"callable"}>Garde appelable</MenuItem>
                  <MenuItem value={"hospital"}>Garde sur place</MenuItem>
                </Select>
                <FormHelperText>{errors.type}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Tooltip title={addComment ? "Supprimer le commentaire" : "Ajouter un commentaire"}>
                <Button
                  onClick={() => setAddComment((prev) => !prev)}
                  aria-label={addComment ? "Supprimer le commentaire" : "Ajouter un commentaire"}
                  startIcon={addComment ? <CloseIcon /> : <AddCommentIcon />}
                  size="small"
                >
                  {addComment ? "Supprimer le commentaire" : "Ajouter un commentaire"}
                </Button>
              </Tooltip>
            </Grid>

            {addComment && (
              <Grid item xs={12}>
                <TextField
                  label="Commentaire"
                  multiline
                  fullWidth
                  rows={2}
                  name="comment"
                  value={garde.comment}
                  onChange={(event) => handleChange(event)}
                  inputProps={{ maxLength: 250 }}
                />
              </Grid>
            )}

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

            <Grid item xs={12}>
              <Typography component="p" variant="body2" align="left">
                En cliquant sur "enregistrer", votre{" "}
                <Box component="span" color={theme.palette.text.primary} fontWeight={700}>
                  maître de stage
                </Box>{" "}
                aura accès à votre{" "}
                <Box component="span" color={theme.palette.text.primary} fontWeight={700}>
                  encodage
                </Box>
              </Typography>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Box>
  );
};

export default Garde;
