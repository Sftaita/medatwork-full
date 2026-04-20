import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

import { useFormik } from "formik";
import * as yup from "yup";
import authApi from "../../services/authApi";
import logger from "../../services/logger";
import { toast } from "react-toastify";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";

const validationSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email("Entrez une adresse email valide")
    .required("Adresse email obligatoire."),
  password: yup
    .string()
    .required("Renseignez votre mot de passe")
    .min(8, "Le mot de passe doit contenir au minimum 8 caractères"),
});
const Form = ({ status }) => {
  const { setAuthentication } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "";

  const initialValues = {
    email: "",
    password: "",
  };

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const onSubmit = async (values) => {
    const credentials = {
      username: values.email.toLowerCase(),
      password: values.password,
    };
    status(true);

    try {
      const user = await authApi.authenticate(credentials);

      const AccessToken = user?.token;
      const firstname = user?.firstname;
      const lastname = user?.lastname;
      const role = user?.role;
      const gender = user?.gender;
      const hospitalId = user?.hospitalId ?? null;
      const hospitalName = user?.hospitalName ?? null;
      const avatarUrl = user?.avatarUrl ?? null;
      const canCreateYear = user?.canCreateYear ?? false;
      setAuthentication({
        isAuthenticated: true,
        AccessToken,
        firstname,
        lastname,
        role,
        gender,
        hospitalId,
        hospitalName,
        avatarUrl,
        canCreateYear,
      });
      logger.setUser({ id: user?.id ?? "unknown", role });

      if (role === "resident") {
        from ? navigate(from, { replace: true }) : navigate("/maccs/timer");
      } else if (role === "manager") {
        from ? navigate(from, { replace: true }) : navigate("/manager/realtime");
      } else if (role === "super_admin") {
        navigate("/admin");
      } else if (role === "hospital_admin") {
        navigate("/hospital-admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      let message;
      if (error?.response?.data?.code === 400) {
        message = "Oups, le serveur ne répond pas";
      } else if (error?.response?.data?.code === 401) {
        message =
          "Les informations ne correspondent pas ou vous n'avez pas encore validé votre email";
      } else {
        message = "Oups, une erreur est survenue";
      }
      toast.error(message, {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } finally {
      status(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema,
    onSubmit,
  });

  return (
    <Box maxWidth="100%">
      <Box marginBottom={4}>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
          }}
          gutterBottom
          color={"text.secondary"}
        >
          Se connecter
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
          }}
        >
          Ravi de vous revoir
        </Typography>
        <Typography color="text.secondary">
          Authentifiez-vous pour accéder à votre compte.
        </Typography>
      </Box>

      <form
        name="login-form-medatwork"
        className="login-form-medatwork"
        method="post"
        onSubmit={formik.handleSubmit}
        id={"LoginForm"}
        noValidate
      >
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }}>
              Renseignez votre adresse email
            </Typography>
            <TextField
              label="Email *"
              variant="outlined"
              name="email"
              type="email"
              fullWidth
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              id={"username"}
            />
          </Grid>
          <Grid item xs={12}>
            <Box
              display="flex"
              flexDirection={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretched", sm: "center" }}
              justifyContent={"space-between"}
              width={1}
              marginBottom={2}
            >
              <Box marginBottom={{ xs: 1, sm: 0 }}>
                <Typography variant={"subtitle2"}>Entrez votre mot de passe</Typography>
              </Box>
              <Typography variant={"subtitle2"}>
                <Typography
                  component={"a"}
                  color={"primary"}
                  href={"/passwordReset"}
                  underline={"none"}
                  sx={{ textDecoration: "none" }}
                >
                  Mot de passe oublié?
                </Typography>
              </Typography>
            </Box>

            <FormControl
              error={formik.touched.password && Boolean(formik.errors.password)}
              variant="outlined"
              fullWidth
            >
              <InputLabel htmlFor="outlined-adornment-password">Mot de passe *</InputLabel>
              <OutlinedInput
                id="outlined-adornment-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Mot de passe *"
              />
              <FormHelperText id="component-error-text">
                {formik.touched.password && formik.errors.password}
              </FormHelperText>
            </FormControl>
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
                  Pas encore de compte?{" "}
                  <Typography
                    component={"a"}
                    color={"primary"}
                    href={"/connecting"}
                    underline={"none"}
                    sx={{ textDecoration: "none" }}
                  >
                    S'enregistrer.
                  </Typography>
                </Typography>
              </Box>
              <Button size={"large"} variant={"contained"} type={"submit"} disabled={false}>
                Se connecter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default Form;
