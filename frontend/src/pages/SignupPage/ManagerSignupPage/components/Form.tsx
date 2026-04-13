import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import managersApi from "../../../../services/managersApi";
import { useNavigate } from "react-router";
import { API_URL } from "../../../../config";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { alpha, useTheme } from "@mui/material/styles";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Divider from "@mui/material/Divider";
import { handleApiError } from "@/services/apiError";

const OTHER_HOSPITAL = "__other__";

const validationSchema = yup.object({
  firstname: yup.string().trim().min(2, "Prénom trop court").max(50).required("Prénom requis"),
  lastname: yup.string().trim().min(2, "Nom trop court").max(50).required("Nom requis"),
  sexe: yup.string().trim().required("Genre requis"),
  email: yup.string().trim().email("Email invalide").required("Email requis"),
  job: yup.string().required("Rôle requis"),
  hospitalId: yup.string().required("Hôpital requis"),
  hospitalName: yup.string().when("hospitalId", {
    is: OTHER_HOSPITAL,
    then: (s) =>
      s.trim().min(2, "Trop court").max(150, "Trop long").required("Nom de l'hôpital requis"),
    otherwise: (s) => s.notRequired(),
  }),
  password: yup.string().required("Mot de passe requis").min(8, "Minimum 8 caractères"),
  passwordConfirm: yup
    .string()
    .label("Confirmation")
    .required()
    .oneOf([yup.ref("password")], "Les mots de passe ne correspondent pas"),
});

type Hospital = { id: number; name: string };

const Form = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    axios
      .get<Hospital[]>(`${API_URL}hospitals`, { withCredentials: true })
      .then((r) => setHospitals(r.data))
      .catch(() => setHospitals([]));
  }, []);

  const capitalize = (s: string) =>
    s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

  const onSubmit = async (values: typeof initialValues) => {
    setIsLoading(true);
    const payload: Record<string, unknown> = {
      email: values.email.toLowerCase(),
      password: values.password,
      firstname: capitalize(values.firstname),
      lastname: capitalize(values.lastname),
      sexe: values.sexe,
      job: values.job,
      role: "manager",
    };

    if (values.hospitalId === OTHER_HOSPITAL) {
      payload.hospitalName = values.hospitalName.trim();
    } else {
      payload.hospitalId = Number(values.hospitalId);
    }

    try {
      await managersApi.create(payload);
      navigate("/success", { state: { email: payload.email } });
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const initialValues = {
    firstname: "",
    lastname: "",
    sexe: "",
    email: "",
    password: "",
    passwordConfirm: "",
    job: "",
    hospitalId: "",
    hospitalName: "",
  };

  const formik = useFormik({ initialValues, validationSchema, onSubmit });
  const isOther = formik.values.hospitalId === OTHER_HOSPITAL;

  return (
    <Box>
      <Box marginBottom={4}>
        <Typography
          sx={{ textTransform: "uppercase", fontWeight: "medium" }}
          gutterBottom
          color="text.secondary"
        >
          S'enregistrer
        </Typography>
        <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700 }}>
          Créer un compte{" "}
          <Typography
            color="primary"
            component="span"
            variant="inherit"
            sx={{
              background: `linear-gradient(180deg, transparent 82%, ${alpha(theme.palette.secondary.main, 0.3)} 0%)`,
            }}
          >
            manager
          </Typography>
        </Typography>
        <Typography color="text.secondary">Complétez le formulaire pour commencer.</Typography>
      </Box>

      {!isLoading && (
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={4}>
            {/* Prénom */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Prénom
              </Typography>
              <TextField
                label="Prénom *"
                name="firstname"
                fullWidth
                value={capitalize(formik.values.firstname)}
                onChange={formik.handleChange}
                error={formik.touched.firstname && Boolean(formik.errors.firstname)}
                helperText={formik.touched.firstname && formik.errors.firstname}
              />
            </Grid>

            {/* Nom */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Nom de famille
              </Typography>
              <TextField
                label="Nom de famille *"
                name="lastname"
                fullWidth
                value={capitalize(formik.values.lastname)}
                onChange={formik.handleChange}
                error={formik.touched.lastname && Boolean(formik.errors.lastname)}
                helperText={formik.touched.lastname && formik.errors.lastname}
              />
            </Grid>

            {/* Genre */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Genre
              </Typography>
              <FormControl fullWidth error={formik.touched.sexe && Boolean(formik.errors.sexe)}>
                <InputLabel>Genre *</InputLabel>
                <Select
                  name="sexe"
                  value={formik.values.sexe}
                  label="Genre *"
                  onChange={formik.handleChange}
                >
                  <MenuItem value="male">Je suis un homme</MenuItem>
                  <MenuItem value="female">Je suis une femme</MenuItem>
                </Select>
                <FormHelperText>{formik.touched.sexe && formik.errors.sexe}</FormHelperText>
              </FormControl>
            </Grid>

            {/* Email */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Email
              </Typography>
              <TextField
                label="Email *"
                name="email"
                fullWidth
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>

            {/* Hôpital — dropdown */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Hôpital
              </Typography>
              <FormControl
                fullWidth
                error={formik.touched.hospitalId && Boolean(formik.errors.hospitalId)}
              >
                <InputLabel>Hôpital *</InputLabel>
                <Select
                  name="hospitalId"
                  value={formik.values.hospitalId}
                  label="Hôpital *"
                  onChange={formik.handleChange}
                >
                  {hospitals.map((h) => (
                    <MenuItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </MenuItem>
                  ))}
                  {hospitals.length > 0 && <Divider />}
                  <MenuItem value={OTHER_HOSPITAL}>
                    <em>Mon hôpital n'est pas dans la liste</em>
                  </MenuItem>
                </Select>
                <FormHelperText>
                  {formik.touched.hospitalId && formik.errors.hospitalId}
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Champ libre si "Autre" */}
            {isOther && (
              <Grid item xs={12}>
                <TextField
                  label="Nom de votre hôpital *"
                  name="hospitalName"
                  fullWidth
                  value={formik.values.hospitalName}
                  onChange={formik.handleChange}
                  error={formik.touched.hospitalName && Boolean(formik.errors.hospitalName)}
                  helperText={
                    (formik.touched.hospitalName && formik.errors.hospitalName) ||
                    "Une demande de rattachement sera envoyée à l'administrateur"
                  }
                  placeholder="Ex : CHU de Liège"
                />
              </Grid>
            )}

            {/* Rôle */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Rôle
              </Typography>
              <FormControl fullWidth error={formik.touched.job && Boolean(formik.errors.job)}>
                <InputLabel>Rôle *</InputLabel>
                <Select
                  name="job"
                  value={formik.values.job}
                  onChange={formik.handleChange}
                  label="Rôle *"
                >
                  <MenuItem value="medical supervisor">Maître de stage</MenuItem>
                  <MenuItem value="doctor">Médecin</MenuItem>
                  <MenuItem value="human resources">Ressources humaines</MenuItem>
                </Select>
                <FormHelperText>{formik.touched.job && formik.errors.job}</FormHelperText>
              </FormControl>
            </Grid>

            {/* Mot de passe */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Mot de passe
              </Typography>
              <TextField
                label="Mot de passe *"
                name="password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Confirmation */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ marginBottom: 2 }}>
                Confirmer le mot de passe
              </Typography>
              <TextField
                label="Confirmation *"
                name="passwordConfirm"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={formik.values.passwordConfirm}
                onChange={formik.handleChange}
                error={formik.touched.passwordConfirm && Boolean(formik.errors.passwordConfirm)}
                helperText={formik.touched.passwordConfirm && formik.errors.passwordConfirm}
              />
            </Grid>

            {/* Submit */}
            <Grid item container xs={12}>
              <Box
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretched", sm: "center" }}
                justifyContent="space-between"
                width={1}
                maxWidth={600}
                margin="0 auto"
              >
                <Box marginBottom={{ xs: 1, sm: 0 }}>
                  <Typography variant="subtitle2">
                    Déjà un compte?{" "}
                    <Link component="a" color="primary" href="/login" underline="none">
                      Se connecter.
                    </Link>
                  </Typography>
                </Box>
                <Button size="large" variant="contained" type="submit" disabled={isLoading}>
                  S'enregistrer
                </Button>
              </Box>
            </Grid>

            <Grid item container xs={12} justifyContent="center">
              <Typography variant="subtitle2" color="text.secondary" align="center">
                En cliquant sur "S'enregistrer" vous acceptez nos{" "}
                <Link component="a" color="primary" href="/terms" underline="none">
                  termes et conditions d'utilisation.
                </Link>
              </Typography>
            </Grid>
          </Grid>
        </form>
      )}

      {isLoading && (
        <Box
          minHeight="calc(100vh - 247px)"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default Form;
