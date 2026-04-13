import { useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import residentsApi from "../../../../services/residentsApi";
import { useNavigate } from "react-router";
import { specialityLinks, belgianMedicalUniversities } from "../../../../doc/lists";
import dayjs from "dayjs";

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
import DateHandler from "../../../../components/medium/DateHandler";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { handleApiError } from "@/services/apiError";

const validationSchema = yup.object({
  firstname: yup
    .string()
    .trim()
    .min(2, "Prénom trop court")
    .max(50, "Prénom trop long")
    .required("Le prénom doit être renseigné"),
  lastname: yup
    .string()
    .trim()
    .min(2, "Nom de famille trop court")
    .max(50, "Nom de famille trop long")
    .required("Le nom de famille doit être renseigné"),
  sexe: yup.string().trim().required("Le genre doit être renseigné"),
  email: yup
    .string()
    .trim()
    .email("Merci d'entrer une adresse email valide")
    .required("Adresse email requise"),
  speciality: yup.string().trim().required("Spécialité requise"),
  university: yup.string().trim().required("Université requise"),
  password: yup
    .string()
    .required("Merci d'entrer un mot de passe")
    .min(8, "Le mot de passe doit contenir au minimum 8 caractères"),
  passwordConfirm: yup
    .string()
    .label("Confirmer le mot de passe")
    .required("Merci de confirmer votre mot de passe")
    .oneOf([yup.ref("password")], "Les mots de passe de correspondent pas"),
});

const Form = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const initialValues = {
    firstname: "",
    lastname: "",
    sexe: "",
    email: "",
    password: "",
    speciality: "",
    university: "",
    role: "resident",
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error] = useState();
  const [date, setDate] = useState(null);

  const onSubmit = async (values) => {
    const data = {
      firstname: values.firstname.charAt(0).toUpperCase() + values.firstname.slice(1).toLowerCase(),
      lastname: values.lastname.charAt(0).toUpperCase() + values.lastname.slice(1).toLowerCase(),

      sexe: values.sexe,
      email: values.email.toLowerCase(),
      password: values.password,
      speciality: values.speciality,
      university: values.university,
      role: "resident",
      dateOfMaster: dayjs(date).format("YYYY-MM-DD"),
    };

    setIsLoading(true);
    try {
      await residentsApi.create(data);
      setIsLoading(false);
      navigate("/success", { state: { email: data.email } });
    } catch (error) {
      handleApiError(error);
      setIsLoading(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema,
    onSubmit,
  });

  const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Show password
  const [values, setValues] = useState({
    showPassword: false,
  });

  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box>
      <Box marginBottom={3}>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
          }}
          gutterBottom
          color={"text.secondary"}
        >
          S'enregistrer
        </Typography>
        <Typography
          variant="h4"
          color="text.primary"
          sx={{
            fontWeight: 700,
          }}
        >
          Créer un compte{" "}
          <Typography
            color={"primary"}
            component={"span"}
            variant={"inherit"}
            sx={{
              background: `linear-gradient(180deg, transparent 82%, ${alpha(
                theme.palette.secondary.main,
                0.3
              )} 0%)`,
            }}
          >
            MACCS
          </Typography>
        </Typography>
        <Typography color="text.secondary">Complétez le formulaire pour commencer.</Typography>
      </Box>
      {!isLoading && (
        <form onSubmit={formik.handleSubmit} id={"ResidentSignUp"}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Entrez votre prénom
              </Typography>
              <TextField
                label="Prénom *"
                variant="outlined"
                name={"firstname"}
                fullWidth
                value={capitalize(formik.values.firstname)}
                onChange={formik.handleChange}
                error={formik.touched.firstname && Boolean(formik.errors.firstname)}
                helperText={formik.touched.firstname && formik.errors.firstname}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Entrez votre nom de famille
              </Typography>
              <TextField
                label="Nom de famille *"
                variant="outlined"
                name={"lastname"}
                fullWidth
                value={capitalize(formik.values.lastname)}
                onChange={formik.handleChange}
                error={formik.touched.lastname && Boolean(formik.errors.lastname)}
                helperText={formik.touched.lastname && formik.errors.lastname}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Renseignez votre genre
              </Typography>
              <FormControl fullWidth error={formik.touched.sexe && Boolean(formik.errors.sexe)}>
                <InputLabel id="sexe">Genre</InputLabel>
                <Select
                  labelId="sexe"
                  name={"sexe"}
                  value={formik.values.sexe}
                  label="Genre *"
                  onChange={formik.handleChange}
                >
                  <MenuItem value={"male"} key={1}>
                    {"Je suis un homme"}
                  </MenuItem>
                  <MenuItem value={"female"} key={2}>
                    {"Je suis une femme"}
                  </MenuItem>
                </Select>
                <FormHelperText>{formik.touched.sexe && formik.errors.sexe}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Renseignez votre email
              </Typography>
              <TextField
                label="Email"
                variant="outlined"
                name={"email"}
                fullWidth
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Date de début du master complémentaire
              </Typography>
              <DateHandler
                value={date}
                label={"Début du stage *"}
                onChange={(value) => setDate(value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Renseignez votre spécialité
              </Typography>
              <FormControl
                fullWidth
                error={formik.touched.speciality && Boolean(formik.errors.speciality)}
              >
                <InputLabel id="job">Spécialité *</InputLabel>
                <Select
                  labelId="speciality"
                  name={"speciality"}
                  value={formik.values.speciality}
                  onChange={formik.handleChange}
                  label="Spécialité *"
                >
                  {specialityLinks.map((element) => (
                    <MenuItem value={element.value} key={element.value}>
                      {element.title}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.speciality && formik.errors.speciality}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Renseignez votre université
              </Typography>
              <FormControl
                fullWidth
                error={formik.touched.university && Boolean(formik.errors.university)}
              >
                <InputLabel id="university">Université *</InputLabel>
                <Select
                  labelId="university"
                  name={"university"}
                  value={formik.values.university}
                  onChange={formik.handleChange}
                  label="Université *"
                >
                  {belgianMedicalUniversities.map((element) => (
                    <MenuItem value={element.value} key={element.value}>
                      {element.title}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.university && formik.errors.university}
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Entrez un mot de passe
              </Typography>
              <TextField
                label="Mot de passe *"
                variant="outlined"
                name={"password"}
                type={values.showPassword ? "text" : "password"}
                fullWidth
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                inputProps={{
                  autoComplete: "new-password",
                  form: {
                    autoComplete: "off",
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {values.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant={"subtitle2"} sx={{ marginBottom: 1 }}>
                Confirmer votre mot de passe
              </Typography>
              <TextField
                label="Mot de passe*"
                variant="outlined"
                name={"passwordConfirm"}
                type={values.showPassword ? "text" : "password"}
                fullWidth
                value={formik.values.passwordConfirm}
                onChange={formik.handleChange}
                error={formik.touched.passwordConfirm && Boolean(formik.errors.passwordConfirm)}
                helperText={formik.touched.passwordConfirm && formik.errors.passwordConfirm}
                inputProps={{
                  autoComplete: "new-password",
                  form: {
                    autoComplete: "off",
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {values.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item container xs={12}>
              <Box
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretched", sm: "center" }}
                justifyContent={"space-between"}
                width={1}
                maxWidth={600}
                margin={"0 auto"}
              >
                <Box marginBottom={{ xs: 1, sm: 0 }}>
                  <Typography variant={"subtitle2"}>
                    Déjà un compte?{" "}
                    <Link component={"a"} color={"primary"} href={"/login"} underline={"none"}>
                      Se connecter.
                    </Link>
                  </Typography>
                </Box>
                <Button
                  size={"large"}
                  variant={"contained"}
                  type={"submit"}
                  disabled={isLoading ? true : false}
                >
                  S'enregistrer
                </Button>
                {error && <p>{error}</p>}
              </Box>
            </Grid>
            <Grid item container xs={12} justifyContent={"center"} alignItems={"center"}>
              <Typography variant={"subtitle2"} color={"text.secondary"} align={"center"}>
                En cliquant sur "S'enregistrer" vous acceptez nos{" "}
                <Link component={"a"} color={"primary"} href={"/company-terms"} underline={"none"}>
                  termes et conditions d'utilisation.
                </Link>
              </Typography>
            </Grid>
          </Grid>
        </form>
      )}
      {isLoading && (
        <Box
          position={"relative"}
          minHeight={"calc(100vh - 247px)"}
          display={"flex"}
          justifyContent={"center"}
          height={0.8}
        >
          <Box display="flex" alignItems="center">
            <CircularProgress />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Form;
