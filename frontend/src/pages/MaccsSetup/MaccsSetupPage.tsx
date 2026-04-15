import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AvatarPickerField from "../../components/AvatarPickerField";
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
import maccsSetupApi, { MaccsSetupContext } from "../../services/maccsSetupApi";
import { specialityLinks, belgianMedicalUniversities } from "../../doc/lists";

type Status = "loading" | "ready" | "expired" | "done" | "error";

type Form = {
  password: string;
  confirm: string;
  sexe: "male" | "female" | "";
  dateOfMaster: string;
  dateOfBirth: string;
  speciality: string;
  university: string;
};

const EMPTY_FORM: Form = {
  password: "",
  confirm: "",
  sexe: "",
  dateOfMaster: "",
  dateOfBirth: "",
  speciality: "",
  university: "",
};

const MaccsSetupPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("loading");
  const [context, setContext] = useState<MaccsSetupContext | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  useEffect(() => {
    maccsSetupApi
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
      setFieldError("Veuillez sélectionner votre sexe");
      return;
    }
    if (!form.dateOfMaster) {
      setFieldError("Veuillez indiquer votre date d'obtention du master");
      return;
    }
    if (!form.dateOfBirth) {
      setFieldError("Veuillez indiquer votre date de naissance");
      return;
    }
    if (!form.speciality.trim()) {
      setFieldError("Veuillez indiquer votre spécialité médicale");
      return;
    }
    if (!form.university.trim()) {
      setFieldError("Veuillez indiquer votre université");
      return;
    }

    setSubmitting(true);
    try {
      await maccsSetupApi.completeProfile(
        token,
        {
          password: form.password,
          sexe: form.sexe,
          dateOfMaster: form.dateOfMaster,
          dateOfBirth: form.dateOfBirth,
          speciality: form.speciality,
          university: form.university,
        },
        avatarBlob,
      );
      setStatus("done");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setFieldError(msg ?? "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" p={2}>
      <Card sx={{ maxWidth: 560, width: "100%" }}>
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
                  ? "Ce lien d'invitation a expiré (validité 24 heures). Contactez votre responsable de stage pour recevoir un nouvel email."
                  : "Ce lien est invalide ou a déjà été utilisé."}
              </Alert>
            </>
          )}

          {status === "done" && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Profil complété !
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                Votre compte est prêt. Vous pouvez maintenant vous connecter à MED@WORK.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </>
          )}

          {status === "ready" && context && (
            <>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Compléter votre profil
              </Typography>

              <Box mb={3} display="flex" justifyContent="center">
                <AvatarPickerField onChange={setAvatarBlob} />
              </Box>

              <Typography color="text.secondary" mb={3}>
                {context.hospitalName && (
                  <>
                    Hôpital : <strong>{context.hospitalName}</strong>
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
                {/* ── Mot de passe ── */}
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

                {/* ── Informations personnelles ── */}
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
                  label="Sexe"
                  value={form.sexe}
                  onChange={(e) => set("sexe", e.target.value)}
                  required
                  fullWidth
                >
                  <MenuItem value="male">Homme</MenuItem>
                  <MenuItem value="female">Femme</MenuItem>
                </TextField>

                <TextField
                  label="Date de naissance"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  required
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <Divider />

                {/* ── Informations académiques ── */}
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Informations académiques
                </Typography>

                <TextField
                  label="Date d'obtention du master"
                  type="date"
                  value={form.dateOfMaster}
                  onChange={(e) => set("dateOfMaster", e.target.value)}
                  required
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Date à laquelle vous avez obtenu votre diplôme de master"
                />

                <TextField
                  select
                  label="Spécialité médicale"
                  value={form.speciality}
                  onChange={(e) => set("speciality", e.target.value)}
                  required
                  fullWidth
                >
                  {specialityLinks.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.title}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Université"
                  value={form.university}
                  onChange={(e) => set("university", e.target.value)}
                  required
                  fullWidth
                >
                  {belgianMedicalUniversities.map((u) => (
                    <MenuItem key={u.value} value={u.value}>
                      {u.title}
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
                    "Compléter mon profil"
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

export default MaccsSetupPage;
