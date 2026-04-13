import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import authApi from "../../../services/authApi";
import { useFormik } from "formik";
import * as yup from "yup";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";
import { CircularProgress } from "@mui/material";

const validationSchema = yup.object({
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

const Form = ({ token, validToken }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const initialValues = {
    password: "",
    passwordConfirm: "",
  };

  const onSubmit = async (values) => {
    if (validToken) {
      setLoading(true);
      try {
        await authApi.resetPassword({
          token: token,
          password: values.password,
        });
        navigate("/login");
      } catch (error) {
        if (error.response.data.message === "invalid token") {
          toast.error("Erreur d'authentification", {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
          });
        }

        if (error.response.data.message === "expired token") {
          toast.error("Temps de réactivation expiré", {
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Erreur d'authentification.", {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    }
  };

  // Show password
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const handleClickShowPassword1 = () => {
    setShowPassword1(!showPassword1);
  };

  const handleClickShowPassword2 = () => {
    setShowPassword2(!showPassword2);
  };
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  // Formik
  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema,
    onSubmit,
  });

  return (
    <Grid container direction="column" justifyContent="flex-start" alignItems="center">
      <Grid item md={6} marginBottom={4} width={"100%"}>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
          }}
          gutterBottom
          color={"text.secondary"}
        >
          Récupération de compte
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
          }}
        >
          Modification du mot de passe.
        </Typography>
        <Typography color="text.secondary">
          Saisissez votre nouveau mot de passe afin de le réinitialiser.
        </Typography>
      </Grid>
      <Grid item md={6} width={"100%"}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container>
            {!loading && (
              <>
                <FormControl
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  variant="outlined"
                  fullWidth
                  sx={{ marginBottom: 2 }}
                >
                  <InputLabel htmlFor="outlined-adornment-password">
                    Nouveau mot de passe *
                  </InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-password"
                    name="password"
                    type={showPassword1 ? "text" : "password"}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    error={formik.touched.password && Boolean(formik.errors.password)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword1}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword1 ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Nouveau mot de passe *"
                  />
                  <FormHelperText id="component-error-text">
                    {formik.touched.password && formik.errors.password}
                  </FormHelperText>
                </FormControl>
                <FormControl
                  error={formik.touched.passwordConfirm && Boolean(formik.errors.passwordConfirm)}
                  variant="outlined"
                  fullWidth
                  sx={{ marginBottom: 2 }}
                >
                  <InputLabel htmlFor="outlined-adornment-password-confirm">
                    Confirmer votre mot de passe *
                  </InputLabel>
                  <OutlinedInput
                    id="outlined-adornment-password-confirm"
                    name="passwordConfirm"
                    type={showPassword2 ? "text" : "password"}
                    value={formik.values.passwordConfirm}
                    onChange={formik.handleChange}
                    error={formik.touched.passwordConfirm && Boolean(formik.errors.passwordConfirm)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword2}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword2 ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Confirmer votre mot de passe *"
                  />
                  <FormHelperText id="component-error-text">
                    {formik.touched.passwordConfirm && formik.errors.passwordConfirm}
                  </FormHelperText>
                </FormControl>
              </>
            )}
            {loading && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent={"center"}
                width={"100%"}
                minHeight={100}
              >
                <CircularProgress />
              </Box>
            )}
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
                  <Button
                    size={"large"}
                    variant={"outlined"}
                    fullWidth
                    onClick={() => navigate("/login")}
                  >
                    Retour
                  </Button>
                </Box>
                <Button
                  size={"large"}
                  variant={"contained"}
                  type={"submit"}
                  disabled={loading || !validToken}
                >
                  Réinitialiser
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Grid>
    </Grid>
  );
};

export default Form;
