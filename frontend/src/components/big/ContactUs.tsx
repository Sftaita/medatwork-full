import publicApi from "../../services/publicApi";
import { useFormik } from "formik";
import * as yup from "yup";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useState } from "react";
import { Stack } from "@mui/system";
import { handleApiError } from "@/services/apiError";

const ContactUs = () => {
  const { t } = useTranslation();
  const initialValues = {
    firstname: "",
    lastname: "",
    email: "",
    message: "",
  };
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validationSchema = yup.object({
    firstname: yup
      .string()
      .trim()
      .min(2, t("validation.firstnameMin"))
      .max(50, t("validation.firstnameMax"))
      .required(t("validation.firstnameRequired")),
    lastname: yup
      .string()
      .trim()
      .min(2, t("validation.lastnameMin"))
      .max(50, t("validation.lastnameMax"))
      .required(t("validation.lastnameRequired")),
    email: yup
      .string()
      .trim()
      .email(t("validation.emailInvalid"))
      .required(t("validation.emailRequired")),
    message: yup
      .string()
      .trim()
      .min(10, t("validation.messageMin"))
      .max(5000, t("validation.messageMax"))
      .required(t("validation.messageRequired")),
  });

  const onSubmit = async (values: typeof initialValues, { resetForm }: { resetForm: () => void }) => {
    setLoading(true);

    try {
      await publicApi.contactUs(values);
      resetForm();
      toast.success(t("contact.success"), {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
    } catch (error) {
      handleApiError(error);
      toast.error(t("contact.error"), {
          position: "bottom-center",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });
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
    <Box maxWidth={600} margin={"0 auto"}>
      <Box marginBottom={4}>
        <Typography variant={"h3"} sx={{ fontWeight: 700 }} align={"center"} gutterBottom>
          {t("contact.title")}
        </Typography>
        <Typography color="text.secondary" align={"center"}>
          {t("contact.subtitle")}
        </Typography>
      </Box>
      <Box>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <TextField
                sx={{ height: 54 }}
                label={t("contact.firstname")}
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
                label={t("contact.lastname")}
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
                label={t("contact.email")}
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
                label={t("contact.message")}
                multiline
                rows={6}
                variant="outlined"
                color="primary"
                size="medium"
                name="message"
                fullWidth
                inputProps={{ maxLength: 5000 }}
                value={formik.values.message}
                onChange={formik.handleChange}
                error={formik.touched.message && Boolean(formik.errors.message)}
                helperText={
                  (formik.touched.message && formik.errors.message) ||
                  `${formik.values.message.length}/5000`
                }
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
                  disabled={loading}
                >
                  {loading ? t("common.sending") : t("contact.send")}
                </Button>
                <Button
                  sx={{ height: 54, minWidth: 150 }}
                  variant="outlined"
                  color="primary"
                  size="medium"
                  disabled={loading}
                  onClick={() => navigate(-1)}
                >
                  {t("contact.back")}
                </Button>
              </Stack>
            </Grid>
            <Grid item container justifyContent={"center"} xs={12}>
              <Typography color="text.secondary">
                {t("contact.responseTime")}
              </Typography>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Box>
  );
};

export default ContactUs;
