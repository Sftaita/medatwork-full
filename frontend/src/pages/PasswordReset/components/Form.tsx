import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import publicApi from "../../../services/publicApi";
import { useFormik } from "formik";
import * as yup from "yup";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

const validationSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email("Entrez une adresse email valide")
    .required("Adresse email obligatoire."),
});

const Form = () => {
  const navigate = useNavigate();
  const initialValues = {
    email: "",
  };

  const [emailSent, sentEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (value) => {
    setLoading(true);
    try {
      await publicApi.sendEmailForResetPassword(value.email);
      sentEmailSent(true);
    } catch (error) {
      if (error.response.data.message === "UnregisteredEmail") {
        toast.error("Aucun compte n'est lié à cette adresse email", {
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
  };

  const formik = useFormik({
    initialValues,
    validationSchema: validationSchema,
    onSubmit,
  });

  return (
    <Grid container direction="column" justifyContent="flex-start" alignItems="center">
      <Grid item xs={12} width={1}>
        <Box marginBottom={4}>
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
            Vous avez oublié votre mot de passe?
          </Typography>
          <Typography color="text.secondary">
            Saisissez votre adresse électronique ci-dessous afin de le réinitialiser.
          </Typography>
          {emailSent && (
            <Grid item xs={12} marginTop={4}>
              <Typography color="text.secondary">
                Enregistrement réussi. Vous allez recevoir un email de vérification dans les
                prochaines minutes.
                <br />
                En cas de problème, <Link href={""}>contactez-nous.</Link>
              </Typography>
            </Grid>
          )}
        </Box>
      </Grid>

      <Grid item xs={12} width={1}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={4}>
            {!emailSent && (
              <Grid item xs={12}>
                <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }}>
                  Entrez votre adresse email
                </Typography>
                <TextField
                  label="Email *"
                  variant="outlined"
                  name={"email"}
                  fullWidth
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
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
                  disabled={(emailSent || loading) && true}
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
