import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import hospitalAdminSetupApi from "../../services/hospitalAdminSetupApi";

type Status = "loading" | "ready" | "expired" | "done" | "error";

const HospitalAdminSetupPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("loading");
  const [context, setContext] = useState<{ email: string; hospitalName: string } | null>(null);
  const [form, setForm] = useState({ password: "", confirm: "", firstname: "", lastname: "" });
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    hospitalAdminSetupApi
      .checkToken(token)
      .then((data) => {
        setContext(data);
        setStatus("ready");
      })
      .catch((err) => {
        const code = err?.response?.status;
        setStatus(code === 410 ? "expired" : "error");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (form.password.length < 8) {
      setFieldError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (form.password !== form.confirm) {
      setFieldError("Les mots de passe ne correspondent pas");
      return;
    }

    setSubmitting(true);
    try {
      await hospitalAdminSetupApi.activate(token, {
        password: form.password,
        firstname: form.firstname,
        lastname: form.lastname,
      });
      setStatus("done");
    } catch {
      setFieldError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" p={2}>
      <Card sx={{ maxWidth: 480, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          {status === "loading" && (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )}

          {(status === "expired" || status === "error") && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Lien invalide
              </Typography>
              <Alert severity="error">
                {status === "expired"
                  ? "Ce lien d'activation a expiré (validité 7 jours). Contactez votre administrateur pour recevoir un nouvel email."
                  : "Ce lien est invalide ou a déjà été utilisé."}
              </Alert>
            </>
          )}

          {status === "done" && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Compte activé !
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                Votre compte administrateur pour <strong>{context?.hospitalName}</strong> est prêt.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </>
          )}

          {status === "ready" && context && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Activation de votre compte
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Hôpital : <strong>{context.hospitalName}</strong>
                <br />
                Email : <strong>{context.email}</strong>
              </Typography>

              <Box
                component="form"
                onSubmit={handleSubmit}
                display="flex"
                flexDirection="column"
                gap={2}
              >
                <TextField
                  label="Prénom"
                  value={form.firstname}
                  onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="Nom"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="Mot de passe"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  fullWidth
                  helperText="Minimum 8 caractères"
                />
                <TextField
                  label="Confirmer le mot de passe"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                  fullWidth
                />
                {fieldError && <Alert severity="error">{fieldError}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  size="large"
                >
                  {submitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    "Activer mon compte"
                  )}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HospitalAdminSetupPage;
