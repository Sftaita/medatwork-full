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
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import managerSetupApi, { ManagerSetupContext } from "../../services/managerSetupApi";
import { jobList } from "../../doc/lists";

type Status = "loading" | "ready" | "expired" | "done" | "error";

type Form = {
  password: string;
  confirm: string;
  sexe: "male" | "female" | "";
  job: string;
};

const EMPTY_FORM: Form = { password: "", confirm: "", sexe: "", job: "" };

const ManagerSetupPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [context, setContext] = useState<ManagerSetupContext | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    managerSetupApi
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

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
    if (!form.sexe) {
      setFieldError("Veuillez sélectionner votre genre");
      return;
    }
    if (!form.job.trim()) {
      setFieldError("Veuillez indiquer votre titre / fonction");
      return;
    }

    setSubmitting(true);
    try {
      await managerSetupApi.completeProfile(token, {
        password: form.password,
        sexe: form.sexe,
        job: form.job,
      });
      setStatus("done");
    } catch (err: any) {
      setFieldError(err?.response?.data?.message ?? "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" p={2}>
      <Card sx={{ maxWidth: 520, width: "100%" }}>
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
                  ? "Ce lien d'invitation a expiré (validité 48 heures). Contactez votre responsable pour recevoir un nouvel email."
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
                Votre compte manager est prêt. Vous pouvez maintenant vous connecter à MED@WORK.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </>
          )}

          {status === "ready" && context && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Compléter votre profil manager
              </Typography>
              <Typography color="text.secondary" mb={3}>
                {context.hospitalName && (
                  <>
                    <strong>{context.hospitalName}</strong> —{" "}
                  </>
                )}
                {context.yearTitle && (
                  <>
                    Année : <strong>{context.yearTitle}</strong>
                    <br />
                  </>
                )}
                Compte :{" "}
                <strong>
                  {context.firstname} {context.lastname}
                </strong>{" "}
                ({context.email})
              </Typography>

              <Box
                component="form"
                onSubmit={handleSubmit}
                display="flex"
                flexDirection="column"
                gap={2}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Mot de passe
                </Typography>
                <TextField
                  label="Mot de passe"
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  fullWidth
                  helperText="Minimum 8 caractères"
                />
                <TextField
                  label="Confirmer le mot de passe"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  required
                  fullWidth
                />

                <Divider />

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Informations personnelles
                </Typography>
                <TextField
                  select
                  label="Genre"
                  value={form.sexe}
                  onChange={(e) => set("sexe", e.target.value)}
                  required
                  fullWidth
                >
                  <MenuItem value="male">Homme</MenuItem>
                  <MenuItem value="female">Femme</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Fonction"
                  value={form.job}
                  onChange={(e) => set("job", e.target.value)}
                  required
                  fullWidth
                >
                  {Object.entries(jobList).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                {fieldError && <Alert severity="error">{fieldError}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  size="large"
                  sx={{ mt: 1 }}
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

export default ManagerSetupPage;
