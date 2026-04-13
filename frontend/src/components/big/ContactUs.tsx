import publicApi from "../../services/publicApi";
import { useFormik } from "formik";
import * as yup from "yup";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useState } from "react";
import { Stack } from "@mui/system";
import { handleApiError } from "@/services/apiError";

const validationSchema = yup.object({
  firstname: yup
    .string()
    .trim()
    .min(2, "Veuillez saisir un prénom valide")
    .max(50, "Veuillez saisir un prénom valide")
    .required("Veuillez spécifier votre prénom"),
  lastname: yup
    .string()
    .trim()
    .min(2, "Veuillez saisir un nom valide")
    .max(50, "Veuillez saisir un nom valide")
    .required("Veuillez spécifier votre nom"),
  email: yup
    .string()
    .trim()
    .email("Veuillez saisir une adresse e-mail valide")
    .required("L'adresse e-mail est obligatoire."),
  message: yup.string().trim().required("Veuillez spécifier votre message"),
});

interface ContactUsProps {
  title: string;
  subtitle: string;
}

const ContactUs = ({ title, subtitle }: ContactUsProps) => {
  const initialValues = {
    firstname: "",
    lastname: "",
    email: "",
    message: "",
  };
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (values: typeof initialValues, { resetForm }: { resetForm: () => void }) => {
    setLoading(true);

    try {
      publicApi.contactUs(values);
      resetForm();
      toast.success("Message envoyé!", {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } catch (error) {
      handleApiError(error);
      toast.error(
        "Le message n'a pas pus être envoyé. Veulliez réessayer plus tard ou nous contacter par email.",
        {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
          progress: undefined,
        }
      );
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
    <Box maxWidth={600} margin={"0 auto"} paddingRight={2} paddingLeft={2}>
      <Box marginBottom={4}>
        <Typography variant={"h3"} sx={{ fontWeight: 700 }} align={"center"} gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary" align={"center"}>
          {subtitle}
        </Typography>
      </Box>
      <Box>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <TextField
                sx={{ height: 54 }}
                label="Prénom"
                variant="outlined"
                color="primary"
                size="medium"
                name="firstname"
                fullWidth
                value={formik.values.firstname}
                onChange={formik.handleChange}
                error={formik.touched.firstname && Boolean(formik.errors.firstname)}
                helperText={formik.touched.firstname && formik.errors.firstname}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                sx={{ height: 54 }}
                label="Nom"
                variant="outlined"
                color="primary"
                size="medium"
                name="lastname"
                fullWidth
                value={formik.values.lastname}
                onChange={formik.handleChange}
                error={formik.touched.lastname && Boolean(formik.errors.lastname)}
                helperText={formik.touched.lastname && formik.errors.lastname}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                sx={{ height: 54 }}
                label="Email"
                type="email"
                variant="outlined"
                color="primary"
                size="medium"
                name="email"
                fullWidth
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Message"
                multiline
                rows={6}
                variant="outlined"
                color="primary"
                size="medium"
                name="message"
                fullWidth
                value={formik.values.message}
                onChange={formik.handleChange}
                error={formik.touched.message && Boolean(formik.errors.message)}
                helperText={formik.touched.message && formik.errors.message}
              />
            </Grid>
            <Grid item container justifyContent={"center"} xs={12}>
              <Stack direction="row" spacing={2}>
                <Button
                  sx={{ height: 54, minWidth: 150 }}
                  variant="contained"
                  color="primary"
                  size="medium"
                  type="submit"
                  disabled={loading ? true : false}
                >
                  Envoyer
                </Button>
                <Button
                  sx={{ height: 54, minWidth: 150 }}
                  variant="outlined"
                  color="primary"
                  size="medium"
                  disabled={loading ? true : false}
                  onClick={() => navigate(-1)}
                >
                  Retour
                </Button>
              </Stack>
            </Grid>
            <Grid item container justifyContent={"center"} xs={12}>
              <Typography color="text.secondary">
                Nous vous répondrons dans un délai de 1 à 2 jours ouvrables.
              </Typography>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Box>
  );
};

export default ContactUs;
