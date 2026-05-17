import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useProfileAccount, useUpdateProfileAccount, useChangePassword } from "../../hooks/useProfileAccount";
import SpecialitySelect from "../../components/SpecialitySelect";
import UniversitySelect from "../../components/UniversitySelect";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

// ── Constants ─────────────────────────────────────────────────────────────────

const JOB_OPTIONS = [
  { value: "medical supervisor", label: "Maître de stage" },
  { value: "human resources",    label: "Ressources humaines" },
  { value: "doctor",             label: "Médecin" },
];

const SEXE_OPTIONS = [
  { value: "male",   label: "Homme" },
  { value: "female", label: "Femme" },
];

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
    <Box display="flex" alignItems="center" gap={1.5} px={3} py={2} sx={{ bgcolor: "action.hover" }}>
      {icon}
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
    </Box>
    <Divider />
    <Box px={3} py={3}>{children}</Box>
  </Paper>
);

// ── Password field ────────────────────────────────────────────────────────────

const PwdField = ({
  label, value, onChange, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      helperText={error}
      fullWidth
      size="small"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer" : "Afficher"}>
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const ProfileAccountPage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError } = useProfileAccount();
  const { mutate: saveInfo, isPending: savingInfo }         = useUpdateProfileAccount();
  const { mutate: changePassword, isPending: savingPassword } = useChangePassword();

  // ── Infos personnelles form state ─────────────────────────────────────────
  const [firstname,    setFirstname]    = useState("");
  const [lastname,     setLastname]     = useState("");
  const [sexe,         setSexe]         = useState<"male" | "female" | "">("");
  const [job,          setJob]          = useState<string>("");
  const [speciality,   setSpeciality]   = useState("");
  const [university,   setUniversity]   = useState("");
  const [dateOfMaster, setDateOfMaster] = useState("");
  const [infoSaved,    setInfoSaved]    = useState(false);
  const [infoError,    setInfoError]    = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstname(profile.firstname ?? "");
    setLastname(profile.lastname  ?? "");
    setSexe((profile.sexe as "male" | "female" | "") ?? "");
    setJob(profile.job ?? "");
    setSpeciality(profile.speciality ?? "");
    setUniversity(profile.university ?? "");
    setDateOfMaster(profile.dateOfMaster ?? "");
  }, [profile]);

  const handleSaveInfo = () => {
    setInfoError(null);
    if (firstname.trim().length < 2) { setInfoError("Le prénom doit contenir au minimum 2 caractères."); return; }
    if (lastname.trim().length  < 2) { setInfoError("Le nom doit contenir au minimum 2 caractères."); return; }

    const patch: Parameters<typeof saveInfo>[0] = { firstname: firstname.trim(), lastname: lastname.trim() };
    if (sexe) patch.sexe = sexe;
    if (profile?.role === "manager") {
      patch.job = job || null;
    }
    if (profile?.role === "resident") {
      patch.speciality   = speciality.trim() || null;
      patch.university   = university.trim() || null;
      patch.dateOfMaster = dateOfMaster || null;
    }

    saveInfo(patch, {
      onSuccess: () => {
        setInfoSaved(true);
        setTimeout(() => setInfoSaved(false), 3000);
      },
      onError: (err: any) => {
        setInfoError(err?.response?.data?.message ?? "Erreur lors de la sauvegarde.");
      },
    });
  };

  // ── Mot de passe form state ───────────────────────────────────────────────
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [pwdErrors,   setPwdErrors]   = useState<Record<string, string>>({});
  const [pwdSuccess,  setPwdSuccess]  = useState(false);

  const handleChangePassword = () => {
    const errs: Record<string, string> = {};
    if (!currentPwd) errs.current = "Ce champ est requis.";
    if (newPwd.length < 8) errs.new = "Minimum 8 caractères.";
    if (newPwd !== confirmPwd) errs.confirm = "Les mots de passe ne correspondent pas.";
    if (Object.keys(errs).length > 0) { setPwdErrors(errs); return; }

    setPwdErrors({});
    changePassword(
      { currentPassword: currentPwd, newPassword: newPwd, confirmPassword: confirmPwd },
      {
        onSuccess: () => {
          setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
          setPwdSuccess(true);
          setTimeout(() => setPwdSuccess(false), 4000);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Erreur inconnue.";
          if (msg.includes("actuel")) {
            setPwdErrors({ current: "Mot de passe actuel incorrect." });
          } else {
            toast.error(msg);
          }
        },
      },
    );
  };

  const isResident     = profile?.role === "resident";
  const isManager      = profile?.role === "manager";
  const isHospitalAdmin = profile?.role === "hospital_admin";

  return (
    <Box p={3} maxWidth={760} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Tooltip title="Retour" arrow>
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h5" fontWeight={700}>Mon compte</Typography>
          <Typography variant="body2" color="text.secondary">
            Identité, coordonnées et sécurité
          </Typography>
        </Box>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Impossible de charger vos informations. Réessayez plus tard.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* ── Informations personnelles ──────────────────────────────────── */}
        <Section icon={<PersonIcon color="action" />} title="Informations personnelles">
          {isLoading ? (
            <Stack spacing={2}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              {/* Photo de profil */}
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar
                  src={profile?.avatarUrl ?? undefined}
                  sx={{ width: 56, height: 56 }}
                  alt={`${profile?.firstname ?? ""} ${profile?.lastname ?? ""}`}
                />
                <Box>
                  <Typography variant="body2" fontWeight={500}>Photo de profil</Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => navigate("/profile")}
                    sx={{ px: 0, textTransform: "none", fontSize: "0.8rem" }}
                  >
                    Modifier la photo →
                  </Button>
                </Box>
              </Box>

              <Divider />

              {/* Email — read-only */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Adresse email (non modifiable)
                </Typography>
                <Chip
                  label={profile?.email}
                  variant="outlined"
                  size="small"
                  sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                />
              </Box>

              {/* Hôpital — read-only pour hospital_admin */}
              {isHospitalAdmin && profile?.hospitalName && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                    Hôpital
                  </Typography>
                  <Chip label={profile.hospitalName} variant="outlined" size="small" />
                </Box>
              )}

              <Divider />

              {/* Prénom / Nom */}
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                <TextField
                  label="Prénom"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="Nom"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  size="small"
                  fullWidth
                  required
                />
              </Box>

              {/* Sexe (manager + resident) */}
              {(isManager || isResident) && (
                <FormControl size="small" sx={{ maxWidth: 200 }}>
                  <InputLabel id="sexe-label">Genre</InputLabel>
                  <Select
                    labelId="sexe-label"
                    label="Genre"
                    value={sexe}
                    onChange={(e) => setSexe(e.target.value as "male" | "female")}
                  >
                    {SEXE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Fonction (manager) */}
              {isManager && (
                <FormControl size="small" sx={{ maxWidth: 280 }}>
                  <InputLabel id="job-label">Fonction</InputLabel>
                  <Select
                    labelId="job-label"
                    label="Fonction"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value=""><em>Non défini</em></MenuItem>
                    {JOB_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Resident-specific fields */}
              {isResident && (
                <>
                  <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                    <SpecialitySelect
                      value={speciality}
                      onChange={setSpeciality}
                      disabled={savingInfo}
                    />
                    <UniversitySelect
                      value={university}
                      onChange={setUniversity}
                      disabled={savingInfo}
                    />
                  </Box>
                  <TextField
                    label="Date de maîtrise"
                    type="date"
                    value={dateOfMaster}
                    onChange={(e) => setDateOfMaster(e.target.value)}
                    size="small"
                    sx={{ maxWidth: 220 }}
                    InputLabelProps={{ shrink: true }}
                    helperText="Date d'obtention du master"
                  />
                </>
              )}

              {/* Error / success */}
              {infoError && <Alert severity="error">{infoError}</Alert>}
              {infoSaved && <Alert severity="success">Informations enregistrées.</Alert>}

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleSaveInfo}
                  disabled={savingInfo}
                  sx={{ minWidth: 160 }}
                >
                  {savingInfo ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </Box>
            </Stack>
          )}
        </Section>

        {/* ── Mot de passe ───────────────────────────────────────────────── */}
        <Section icon={<LockIcon color="action" />} title="Mot de passe">
          <Stack spacing={2.5}>
            <PwdField
              label="Mot de passe actuel"
              value={currentPwd}
              onChange={setCurrentPwd}
              error={pwdErrors.current}
            />
            <PwdField
              label="Nouveau mot de passe"
              value={newPwd}
              onChange={setNewPwd}
              error={pwdErrors.new}
            />
            <PwdField
              label="Confirmer le nouveau mot de passe"
              value={confirmPwd}
              onChange={setConfirmPwd}
              error={pwdErrors.confirm}
            />

            {pwdSuccess && <Alert severity="success">Mot de passe modifié avec succès.</Alert>}

            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={savingPassword}
                sx={{ minWidth: 200 }}
              >
                {savingPassword ? "Modification…" : "Modifier le mot de passe"}
              </Button>
            </Box>
          </Stack>
        </Section>
      </Stack>
    </Box>
  );
};

export default ProfileAccountPage;
