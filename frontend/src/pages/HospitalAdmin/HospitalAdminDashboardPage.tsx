import { useState, useMemo, useRef, useEffect } from "react";
import { useTopbarSearch } from "../../hooks/useTopbarSearch";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";

import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SendIcon from "@mui/icons-material/Send";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { HospitalYear, DashboardStats, YearInput, YearStatus } from "../../services/hospitalAdminApi";

// ── Status chip constants ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<YearStatus, string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Fermée",
  archived: "Archivée",
};

const STATUS_COLOR: Record<YearStatus, "default" | "success" | "warning" | "error"> = {
  draft: "default",
  active: "success",
  closed: "warning",
  archived: "error",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const NameTooltip = ({ names, emptyLabel }: { names: string[]; emptyLabel: string }) => (
  <>
    {names.length > 0 ? (
      <Box component="ul" sx={{ m: 0, pl: 2, py: 0.5, textAlign: "left" }}>
        {names.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </Box>
    ) : (
      emptyLabel
    )}
  </>
);

// ── Skeleton card — calqué sur la structure exacte de YearCard ───────────────

interface SkeletonCardProps {
  withLocation?: boolean;
  withToken?: boolean;
  titleWidth?: string;
}

const SkeletonCard = ({ withLocation = false, withToken = false, titleWidth = "72%" }: SkeletonCardProps) => (
  <Card variant="outlined" sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

    {/* Zone cliquable */}
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5, gap: 0 }}>

      {/* Titre + badge statut + menu ⋮ */}
      <Box display="flex" alignItems="flex-start" gap={0.5} mb={1}>
        <Box flex={1} sx={{ minHeight: "2.7em" }}>
          <Skeleton variant="text" width={titleWidth} height={22} />
          <Skeleton variant="text" width="50%" height={22} />
        </Box>
        <Skeleton variant="rounded" width={62} height={22} sx={{ borderRadius: 999, flexShrink: 0, mt: 0.25 }} />
        <Skeleton variant="circular" width={24} height={24} sx={{ flexShrink: 0, mt: 0.25 }} />
      </Box>

      <Box flex={1} minHeight={12} />

      {/* Lieu + spécialité */}
      {withLocation && (
        <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
          <Skeleton variant="circular" width={14} height={14} />
          <Skeleton variant="text" width="55%" height={16} />
        </Box>
      )}

      {/* Chips résidents + managers */}
      <Box display="flex" gap={1}>
        <Skeleton variant="rounded" width={88} height={26} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>

    {/* Paramètres */}
    <Divider />
    <Box display="flex" alignItems="center" justifyContent="flex-end" sx={{ px: 1, py: 0.5 }}>
      <Box display="flex" alignItems="center" gap={0.5}>
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width={72} height={18} />
      </Box>
    </Box>

    {/* Token (optionnel) */}
    {withToken && (
      <>
        <Divider />
        <Box display="flex" alignItems="center" sx={{ px: 1.5, py: 0.75 }}>
          <Skeleton variant="text" width="60%" height={18} sx={{ fontFamily: "monospace" }} />
          <Box flex={1} />
          <Skeleton variant="rounded" width={28} height={22} sx={{ borderRadius: 1 }} />
        </Box>
      </>
    )}
  </Card>
);

// ── Year card ─────────────────────────────────────────────────────────────────

interface YearCardProps {
  year: HospitalYear;
  searchQuery: string;
  onEdit: (year: HospitalYear) => void;
  onDelete: (year: HospitalYear) => void;
}

const YearCard = ({ year, searchQuery, onEdit, onDelete }: YearCardProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!year.token) return;
    navigator.clipboard.writeText(year.token).then(() => {
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const residentNames = (year.residents ?? []).map((r) => `${r.firstname} ${r.lastname}`);
  const managerNames = (year.managers ?? []).map((m) => `${m.firstname} ${m.lastname}`);
  const residentCount = year.residents?.length ?? year.residentCount ?? 0;
  const managerCount = managerNames.length;

  const q = searchQuery.trim().toLowerCase();
  const residentMatch = q.length > 0 && residentNames.some((n) => n.toLowerCase().includes(q));
  const managerMatch = q.length > 0 && managerNames.some((n) => n.toLowerCase().includes(q));

  const goToRealtime = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("realtime_selection") ?? "{}");
      localStorage.setItem("realtime_selection", JSON.stringify({ ...saved, currentYear: year.id }));
    } catch { /* localStorage unavailable */ }
    navigate("/manager/realtime");
  };

  const goToParams = (defaultTab?: string) =>
    navigate("/manager/year-detail", {
      state: { id: year.id, title: year.title, adminRights: true, defaultTab },
    });

  // Archived years are read-only; draft, active and closed can still be edited
  const editable = year.status !== "archived";

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        "&:hover": { boxShadow: 4, borderColor: "primary.main" },
      }}
    >
      {/* Clickable area — navigates to realtime. Plain Box instead of CardActionArea
          to avoid nesting <button> inside <button> (IconButton is inside the content). */}
      <Box
        onClick={goToRealtime}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          borderRadius: "inherit",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 2.5,
            "&:last-child": { pb: 2.5 },
          }}
        >
          {/* Title + actions menu */}
          <Box display="flex" alignItems="flex-start" gap={0.5} mb={1}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                flex: 1,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.35,
                minHeight: "2.7em",
              }}
            >
              {year.title}
            </Typography>
            <Chip label={STATUS_LABEL[year.status]} color={STATUS_COLOR[year.status]} size="small" sx={{ flexShrink: 0, mt: 0.25 }} />
            <IconButton
              size="small"
              sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(e.currentTarget);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Spacer */}
          <Box flex={1} />

          {/* Location + speciality */}
          {year.location && (
            <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
              <LocationOnOutlinedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {year.location}
                {year.speciality ? ` — ${year.speciality}` : ""}
              </Typography>
            </Box>
          )}

          {/* Stats chips */}
          <Box display="flex" gap={1} flexWrap="wrap">
            {/* Residents */}
            <Tooltip
              title={<NameTooltip names={residentNames} emptyLabel="Aucun résident" />}
              placement="top"
              arrow
            >
              <Box
                display="inline-flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  bgcolor: residentMatch ? "success.50" : "grey.100",
                  border: "1px solid",
                  borderColor: residentMatch ? "success.300" : "transparent",
                  borderRadius: 1,
                  px: 1,
                  py: 0.4,
                  cursor: "pointer",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goToParams("residents");
                }}
              >
                <PeopleOutlineIcon
                  sx={{ fontSize: 16, color: residentMatch ? "success.main" : "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={residentMatch ? "success.main" : "text.secondary"}
                >
                  {residentCount}&nbsp;résident{residentCount !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Tooltip>

            {/* Managers */}
            <Tooltip
              title={<NameTooltip names={managerNames} emptyLabel="Aucun manager" />}
              placement="top"
              arrow
            >
              <Box
                display="inline-flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  bgcolor: managerMatch ? "success.50" : "grey.100",
                  border: "1px solid",
                  borderColor: managerMatch ? "success.300" : "transparent",
                  borderRadius: 1,
                  px: 1,
                  py: 0.4,
                  cursor: "pointer",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goToParams("partners");
                }}
              >
                <PersonOutlineIcon
                  sx={{ fontSize: 16, color: managerMatch ? "success.main" : "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={managerMatch ? "success.main" : "text.secondary"}
                >
                  {managerCount}&nbsp;manager{managerCount !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </CardContent>
      </Box>

      {/* Actions menu — outside clickable Box */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onEdit(year);
          }}
        >
          {editable ? "Modifier" : "Voir / changer le statut"}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onDelete(year);
          }}
          sx={{ color: "error.main" }}
        >
          Supprimer
        </MenuItem>
      </Menu>

      {/* Paramètres button — outside CardActionArea */}
      <Divider />
      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-end"
        sx={{ px: 1, py: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="small"
          startIcon={<SettingsOutlinedIcon fontSize="small" />}
          onClick={(e) => { e.stopPropagation(); goToParams(); }}
          sx={{ fontSize: "0.75rem", color: "text.secondary" }}
        >
          Paramètres
        </Button>
      </Box>

      {/* Token — outside CardActionArea: copy without navigating */}
      {year.token && (
        <>
          <Divider />
          <Box
            display="flex"
            alignItems="center"
            sx={{ bgcolor: "action.hover", px: 1.5, py: 0.75 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                letterSpacing: "0.06em",
                color: "text.primary",
                userSelect: "all",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                mr: 0.5,
              }}
            >
              {year.token}
            </Typography>
            <Tooltip title={copied ? "Copié !" : "Copier le code"} placement="top" arrow>
              <IconButton
                size="small"
                onClick={handleCopy}
                color={copied ? "success" : "default"}
                sx={{ flexShrink: 0 }}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 16 }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Card>
  );
};

// ── Specialities ──────────────────────────────────────────────────────────────

const SPECIALITIES = [
  "Anesthésiologie",
  "Cardiologie",
  "Chirurgie digestive",
  "Chirurgie générale",
  "Chirurgie maxillo-faciale",
  "Chirurgie orthopédique",
  "Chirurgie plastique",
  "Chirurgie thoracique",
  "Chirurgie vasculaire",
  "Dermatologie",
  "Endocrinologie",
  "Gastro-entérologie",
  "Gériatrie",
  "Gynécologie et obstétrique",
  "Hématologie",
  "Maladies infectieuses",
  "Médecine interne",
  "Médecine physique et de réadaptation",
  "Néphrologie",
  "Neurochirurgie",
  "Neurologie",
  "Oncologie",
  "Ophtalmologie",
  "Oto-rhino-laryngologie",
  "Pédiatrie",
  "Pédopsychiatrie",
  "Pneumologie",
  "Psychiatrie",
  "Radiologie",
  "Rhumatologie",
  "Soins intensifs",
  "Soins palliatifs",
  "Urgences",
  "Urologie",
];

// ── Period options ────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date();
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${baseYear}-${baseYear + 1}`;
}

function buildPeriodOptions(extraPeriod?: string): string[] {
  const now = new Date();
  // Academic year starts in the second half of the calendar year (≥ July)
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const options: string[] = [];
  for (let i = -1; i <= 3; i++) {
    const y = baseYear + i;
    options.push(`${y}-${y + 1}`);
  }
  // If an existing period is not in the generated range, prepend it
  if (extraPeriod && !options.includes(extraPeriod)) {
    options.unshift(extraPeriod);
  }
  return options;
}

// ── Year form dialog ──────────────────────────────────────────────────────────

const EMPTY_FORM: YearInput = {
  title: "", location: "", period: getCurrentAcademicYear(),
  dateOfStart: "", dateOfEnd: "",
  speciality: "", comment: "", status: "active",
};

interface YearFormDialogProps {
  open: boolean;
  initial?: HospitalYear | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (data: YearInput) => void;
  /** Pré-remplit le champ "Lieu" avec le nom de l'hôpital lors de la création. */
  defaultLocation?: string;
}

const YearFormDialog = ({ open, initial, isPending, onClose, onSave, defaultLocation }: YearFormDialogProps) => {
  const emptyForm: YearInput = {
    ...EMPTY_FORM,
    location: defaultLocation ?? "",
  };

  const [form, setForm] = useState<YearInput>(() =>
    initial
      ? {
          title: initial.title,
          location: initial.location,
          period: initial.period,
          dateOfStart: initial.dateOfStart,
          dateOfEnd: initial.dateOfEnd,
          speciality: initial.speciality ?? "",
          comment: initial.comment ?? "",
          status: initial.status,
        }
      : emptyForm
  );

  const periodOptions = buildPeriodOptions(initial?.period);
  // If editing a year with a speciality not in the standard list, include it
  const specialityOptions = useMemo(() => {
    const extra = initial?.speciality;
    if (extra && !SPECIALITIES.includes(extra)) {
      return [extra, ...SPECIALITIES];
    }
    return SPECIALITIES;
  }, [initial?.speciality]);

  const set = (field: keyof YearInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.location.trim() || !form.dateOfStart || !form.dateOfEnd) {
      toast.error("Titre, lieu et dates sont obligatoires");
      return;
    }
    if (form.dateOfStart && form.dateOfEnd && form.dateOfEnd < form.dateOfStart) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? "Modifier l'année" : "Nouvelle année"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>

          {/* Titre — pleine largeur */}
          <Grid item xs={12}>
            <TextField
              label="Titre *"
              value={form.title}
              onChange={set("title")}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Lieu + Période */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Lieu *"
              value={form.location}
              onChange={set("location")}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Période *</InputLabel>
              <Select
                value={form.period}
                label="Période *"
                onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
              >
                {periodOptions.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Dates */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date de début *"
              type="date"
              value={form.dateOfStart}
              onChange={set("dateOfStart")}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date de fin *"
              type="date"
              value={form.dateOfEnd}
              onChange={set("dateOfEnd")}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Spécialité */}
          <Grid item xs={12}>
            <Autocomplete
              options={specialityOptions}
              value={form.speciality || null}
              onChange={(_, newValue) =>
                setForm((prev) => ({ ...prev, speciality: newValue ?? "" }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Spécialité" size="small" />
              )}
              fullWidth
              noOptionsText="Aucune spécialité correspondante"
            />
          </Grid>

          {/* Commentaire */}
          <Grid item xs={12}>
            <TextField
              label="Commentaire"
              value={form.comment ?? ""}
              onChange={set("comment")}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Grid>

          {/* Statut — édition uniquement */}
          {initial && (
            <Grid item xs={12}>
              <FormControl size="small" fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={form.status ?? "active"}
                  label="Statut"
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as YearStatus }))}
                >
                  <MenuItem value="draft">Brouillon</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="closed">Fermée</MenuItem>
                  <MenuItem value="archived">Archivée</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>Annuler</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>
          {isPending ? <CircularProgress size={16} /> : initial ? "Enregistrer" : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Skeleton stat card — calqué sur StatCard ─────────────────────────────────

const SkeletonStatCard = () => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5, "&:last-child": { pb: 2.5 } }}>
      {/* Icône */}
      <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2, flexShrink: 0 }} />
      {/* Texte */}
      <Box minWidth={0} flex={1}>
        <Skeleton variant="text" width="40%" height={36} sx={{ mb: 0.25 }} />
        <Skeleton variant="text" width="65%" height={18} />
        <Skeleton variant="text" width="55%" height={15} />
      </Box>
    </CardContent>
  </Card>
);

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
  onClick?: () => void;
}

const StatCard = ({ label, value, icon, color, sublabel, onClick }: StatCardProps) => (
  <Card
    variant="outlined"
    sx={{
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s, border-color 0.15s",
      ...(onClick && {
        "&:hover": { boxShadow: 3, borderColor: `${color}.main` },
        "&:active": { boxShadow: 1 },
      }),
    }}
    onClick={onClick}
  >
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5, "&:last-child": { pb: 2.5 } }}>
      <Box
        sx={{
          width: 48, height: 48, borderRadius: 2, bgcolor: `${color}.50`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
      </Box>
      <Box minWidth={0}>
        <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color={onClick ? `${color}.main` : "text.disabled"}>
            {sublabel}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ── Pending invites dialog ────────────────────────────────────────────────────

interface PendingInvitesDialogProps {
  open: boolean;
  onClose: () => void;
  onResent: () => void;
}

const PendingInvitesDialog = ({ open, onClose, onResent }: PendingInvitesDialogProps) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);          // key of the row being acted on
  const [confirmKey, setConfirmKey] = useState<string | null>(null); // inline confirm state

  // Fetch from ALL years (current + history) so the count matches dashboard stats.
  const { data: rCur = [], isLoading: rlC } = useQuery({ queryKey: ["ha-pr-c"], queryFn: () => hospitalAdminApi.listResidents("current"), enabled: open });
  const { data: rHis = [], isLoading: rlH } = useQuery({ queryKey: ["ha-pr-h"], queryFn: () => hospitalAdminApi.listResidents("history"), enabled: open });
  const { data: mCur = [], isLoading: mlC } = useQuery({ queryKey: ["ha-pm-c"], queryFn: () => hospitalAdminApi.listManagers("current"),  enabled: open });
  const { data: mHis = [], isLoading: mlH } = useQuery({ queryKey: ["ha-pm-h"], queryFn: () => hospitalAdminApi.listManagers("history"),  enabled: open });

  const isLoading = rlC || rlH || mlC || mlH;
  const pendingResidents = [...rCur, ...rHis].filter((r) => r.status === "pending");
  const pendingManagers  = [...mCur, ...mHis].filter((m) => m.status === "pending");
  const total = pendingResidents.length + pendingManagers.length;

  const invalidateAll = () => {
    (["ha-pr-c", "ha-pr-h", "ha-pm-c", "ha-pm-h"] as const).forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
    onResent();
  };

  const resendResident = async (yrId: number) => {
    setBusy(`r-${yrId}`);
    try {
      await hospitalAdminApi.resendResidentInvite(yrId);
      // MACCS pending → toujours un lien d'activation de compte
      toast.success("Lien d'activation renvoyé");
      invalidateAll();
    }
    catch { toast.error("Erreur lors de l'envoi"); }
    finally { setBusy(null); }
  };

  const resendManager = async (myId: number) => {
    setBusy(`m-${myId}`);
    // Récupère accountActivated depuis la liste locale pour afficher le bon message
    const mgr = [...mCur, ...mHis].find((m) => m.myId === myId);
    try {
      await hospitalAdminApi.resendManagerInvite(myId);
      toast.success(
        mgr?.accountActivated
          ? "Invitation à l'année renvoyée"
          : "Lien de création de compte renvoyé",
      );
      invalidateAll();
    }
    catch { toast.error("Erreur lors de l'envoi"); }
    finally { setBusy(null); }
  };

  const cancelResident = async (yrId: number) => {
    setBusy(`rc-${yrId}`);
    try { await hospitalAdminApi.retireResident(yrId); toast.success("Invitation annulée"); setConfirmKey(null); invalidateAll(); }
    catch { toast.error("Erreur lors de l'annulation"); }
    finally { setBusy(null); }
  };

  const cancelManager = async (myId: number) => {
    setBusy(`mc-${myId}`);
    try { await hospitalAdminApi.removeManagerYear(myId); toast.success("Invitation annulée"); setConfirmKey(null); invalidateAll(); }
    catch { toast.error("Erreur lors de l'annulation"); }
    finally { setBusy(null); }
  };

  const handleClose = () => { setConfirmKey(null); onClose(); };
  const isBusy = busy !== null;

  /** Chip showing why a person is pending (account never activated vs invitation not accepted) */
  const PendingReasonChip = ({ accountActivated, isManager }: { accountActivated: boolean; isManager?: boolean }) => {
    if (!accountActivated) {
      return (
        <Chip
          label="Compte non activé"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ height: 20, fontSize: "0.68rem", mr: 0.5 }}
        />
      );
    }
    // accountActivated=true + status=pending → year invitation not yet accepted
    return (
      <Chip
        label={isManager ? "Invitation non acceptée" : "En attente de rejoindre l'année"}
        size="small"
        color="info"
        variant="outlined"
        sx={{ height: 20, fontSize: "0.68rem", mr: 0.5 }}
      />
    );
  };

  /**
   * Resend button + cancel for a MACCS.
   * MACCS pending always = account never activated → always sends the activation email.
   */
  const ResidentActions = ({ yrId }: { yrId: number }) => {
    const key = `r-${yrId}`;
    if (confirmKey === key) {
      return (
        <Stack direction="row" gap={0.5} alignItems="center">
          <Button size="small" color="error" variant="contained" disabled={isBusy}
            onClick={() => cancelResident(yrId)}
            startIcon={busy === `rc-${yrId}` ? <CircularProgress size={12} sx={{ color: "inherit" }} /> : undefined}>
            Confirmer
          </Button>
          <Button size="small" disabled={isBusy} onClick={() => setConfirmKey(null)}>Non</Button>
        </Stack>
      );
    }
    return (
      <Stack direction="row" gap={0.5} alignItems="center">
        <Tooltip title="Renvoie le lien pour créer et activer son compte MED@WORK. Une fois activé, le MACCS rejoint l'année automatiquement." arrow placement="top">
          <span>
            <Button size="small" variant="outlined" disabled={isBusy}
              startIcon={busy === `r-${yrId}` ? <CircularProgress size={12} /> : <SendIcon sx={{ fontSize: 14 }} />}
              onClick={() => resendResident(yrId)}>
              Renvoyer l'invitation
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Annuler et retirer ce MACCS de l'année" arrow>
          <span>
            <IconButton size="small" color="error" disabled={isBusy} onClick={() => setConfirmKey(key)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  /**
   * Resend button + cancel for a manager.
   * Backend already sends the right email automatically:
   *   accountActivated=false → managerSetup.html.twig   (create account + refuse)
   *   accountActivated=true  → managerYearInvite.html.twig (accept year + refuse)
   * We surface this distinction in the button label.
   */
  const ManagerActions = ({ myId, accountActivated }: { myId: number; accountActivated: boolean }) => {
    const key = `m-${myId}`;
    if (confirmKey === key) {
      return (
        <Stack direction="row" gap={0.5} alignItems="center">
          <Button size="small" color="error" variant="contained" disabled={isBusy}
            onClick={() => cancelManager(myId)}
            startIcon={busy === `mc-${myId}` ? <CircularProgress size={12} sx={{ color: "inherit" }} /> : undefined}>
            Confirmer
          </Button>
          <Button size="small" disabled={isBusy} onClick={() => setConfirmKey(null)}>Non</Button>
        </Stack>
      );
    }

    const resendLabel    = accountActivated ? "Renvoyer l'invitation" : "Renvoyer l'invitation";
    const resendTooltip  = accountActivated
      ? "Renvoie le lien pour accepter ou refuser cette année de stage"
      : "Renvoie le lien de création de compte. Une fois activé, le manager rejoint l'année automatiquement.";
    const cancelTooltip  = accountActivated
      ? "Retirer ce manager de cette année"
      : "Annuler l'invitation de compte";

    return (
      <Stack direction="row" gap={0.5} alignItems="center">
        <Tooltip title={resendTooltip} arrow placement="top">
          <span>
            <Button size="small" variant="outlined" disabled={isBusy}
              startIcon={busy === `m-${myId}` ? <CircularProgress size={12} /> : <SendIcon sx={{ fontSize: 14 }} />}
              onClick={() => resendManager(myId)}>
              {resendLabel}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={cancelTooltip} arrow>
          <span>
            <IconButton size="small" color="error" disabled={isBusy} onClick={() => setConfirmKey(key)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HourglassEmptyIcon sx={{ color: "warning.main", fontSize: 22 }} />
        Invitations en attente
        {!isLoading && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            ({total})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!isLoading && total === 0 && (
          <Box px={3} py={3}>
            <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
              Aucune invitation en attente — tout le monde a activé son compte !
            </Alert>
          </Box>
        )}

        {/* MACCS */}
        <Collapse in={!isLoading && pendingResidents.length > 0}>
          <Box px={3} pt={2} pb={0.5}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              MACCS ({pendingResidents.length})
            </Typography>
          </Box>
          <List disablePadding dense>
            {pendingResidents.map((r) => (
              <ListItem key={r.yrId} divider secondaryAction={<ResidentActions yrId={r.yrId} />}
                sx={{ pr: confirmKey === `r-${r.yrId}` ? 22 : 18 }}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600} component="span">
                        {`${r.firstname ?? ""} ${r.lastname ?? ""}`.trim() || r.email}
                      </Typography>
                      <PendingReasonChip accountActivated={r.accountActivated} />
                    </Box>
                  }
                  secondary={
                    <span>
                      {r.email}
                      {r.yearTitle && (
                        <Typography component="span" variant="caption" color="text.disabled">
                          {" — "}{r.yearTitle}
                        </Typography>
                      )}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Managers */}
        <Collapse in={!isLoading && pendingManagers.length > 0}>
          <Box px={3} pt={2} pb={0.5}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Managers ({pendingManagers.length})
            </Typography>
          </Box>
          <List disablePadding dense>
            {pendingManagers.map((m) => (
              <ListItem key={m.myId} divider secondaryAction={<ManagerActions myId={m.myId} accountActivated={m.accountActivated} />}
                sx={{ pr: confirmKey === `m-${m.myId}` ? 22 : 18 }}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600} component="span">
                        {`${m.firstname ?? ""} ${m.lastname ?? ""}`.trim() || m.email}
                      </Typography>
                      <PendingReasonChip accountActivated={m.accountActivated} isManager />
                    </Box>
                  }
                  secondary={
                    <span>
                      {m.email}
                      {m.yearTitle && (
                        <Typography component="span" variant="caption" color="text.disabled">
                          {" — "}{m.yearTitle}
                        </Typography>
                      )}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Year list row (list view) ─────────────────────────────────────────────────

interface YearListRowProps {
  year: HospitalYear;
  onEdit: (year: HospitalYear) => void;
  onDelete: (year: HospitalYear) => void;
}

const YearListRow = ({ year, onEdit, onDelete }: YearListRowProps) => {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const residentCount = year.residents?.length ?? year.residentCount ?? 0;
  const managerCount  = year.managers?.length  ?? year.managerCount  ?? 0;
  const editable      = year.status !== "archived";

  const goToRealtime = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("realtime_selection") ?? "{}");
      localStorage.setItem("realtime_selection", JSON.stringify({ ...saved, currentYear: year.id }));
    } catch { /* localStorage unavailable */ }
    navigate("/manager/realtime");
  };

  const goToParams = () =>
    navigate("/manager/year-detail", { state: { id: year.id, title: year.title, adminRights: true } });

  return (
    <TableRow
      hover
      sx={{ cursor: "pointer" }}
      onClick={goToRealtime}
    >
      <TableCell>
        <Typography variant="body2" fontWeight={600}>{year.title}</Typography>
        {year.location && (
          <Typography variant="caption" color="text.secondary">
            <LocationOnOutlinedIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: "middle" }} />
            {year.location}{year.speciality ? ` — ${year.speciality}` : ""}
          </Typography>
        )}
      </TableCell>
      <TableCell>{year.period}</TableCell>
      <TableCell>
        <Chip label={STATUS_LABEL[year.status]} color={STATUS_COLOR[year.status]} size="small" />
      </TableCell>
      <TableCell>
        <Box display="flex" gap={1} alignItems="center">
          <Box display="inline-flex" alignItems="center" gap={0.5}>
            <PeopleOutlineIcon sx={{ fontSize: 15, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">{residentCount}</Typography>
          </Box>
          <Box display="inline-flex" alignItems="center" gap={0.5}>
            <PersonOutlineIcon sx={{ fontSize: 15, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">{managerCount}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Paramètres" placement="top" arrow>
          <IconButton size="small" onClick={goToParams}>
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setMenuAnchor(null); onEdit(year); }}>
            {editable ? "Modifier" : "Voir / changer le statut"}
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { setMenuAnchor(null); onDelete(year); }} sx={{ color: "error.main" }}>
            Supprimer
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
};

// ── View mode persistence ─────────────────────────────────────────────────────

const VIEW_KEY = "hospital_admin_dashboard_view";
const loadView = (): "grid" | "list" => {
  try { return (localStorage.getItem(VIEW_KEY) as "grid" | "list") ?? "grid"; }
  catch { return "grid"; }
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ALL_TAB = "__all__";

const HospitalAdminDashboardPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { authentication } = useAuth();
  const hospitalName = authentication.hospitalName ?? "";

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["hospital-admin-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["hospital-admin-dashboard-stats"],
    queryFn: hospitalAdminApi.getDashboardStats,
  });

  const search = useTopbarSearch("Titre, résident, manager…");
  const [tab, setTab] = useState(ALL_TAB);
  const [viewMode, setViewMode] = useState<"grid" | "list">(loadView);
  const [helpOpen, setHelpOpen] = useState(false);
  const tabInitialized = useRef(false);

  const handleViewMode = (_: React.MouseEvent, val: "grid" | "list" | null) => {
    if (!val) return;
    setViewMode(val);
    try { localStorage.setItem(VIEW_KEY, val); } catch { /* noop */ }
  };

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HospitalYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HospitalYear | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);

  // Unique periods sorted newest → oldest
  const periods = useMemo(() => {
    const unique = [...new Set(years.map((y) => y.period))];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [years]);

  // Auto-select current period (or most recent) on first data load
  useEffect(() => {
    if (tabInitialized.current || years.length === 0) return;
    tabInitialized.current = true;
    const today = new Date();
    const current = years.find((y) => {
      const start = new Date(y.dateOfStart);
      const end = new Date(y.dateOfEnd);
      return today >= start && today <= end;
    });
    setTab(current?.period ?? periods[0] ?? ALL_TAB);
  }, [years, periods]);

  // Filter by tab + search, sort alphabetically by title
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return years
      .filter((y) => {
        if (tab !== ALL_TAB && y.period !== tab) return false;
        if (!q) return true;
        const residentNames = (y.residents ?? [])
          .map((r) => `${r.firstname} ${r.lastname}`.toLowerCase())
          .join(" ");
        const managerNames = (y.managers ?? [])
          .map((m) => `${m.firstname} ${m.lastname}`.toLowerCase())
          .join(" ");
        return (
          y.title.toLowerCase().includes(q) ||
          (y.location ?? "").toLowerCase().includes(q) ||
          (y.speciality ?? "").toLowerCase().includes(q) ||
          residentNames.includes(q) ||
          managerNames.includes(q)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
  }, [years, tab, q]);

  const activeTab = periods.includes(tab) ? tab : ALL_TAB;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hospital-admin-years"] });
    qc.invalidateQueries({ queryKey: ["hospital-admin-dashboard-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: hospitalAdminApi.createYear,
    onSuccess: () => { toast.success("Année créée"); setAddOpen(false); invalidate(); },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<YearInput> }) =>
      hospitalAdminApi.updateYear(id, data),
    onSuccess: () => { toast.success("Année mise à jour"); setEditTarget(null); invalidate(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: hospitalAdminApi.forceDeleteYear,
    onSuccess: () => { toast.success("Année supprimée"); setDeleteTarget(null); invalidate(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? "Impossible de supprimer cette année"),
  });

  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bgcolor="background.paper"
        borderBottom={1}
        borderColor="divider"
        pt={3}
        pb={1.5}
        mb={3}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="h5" fontWeight={700}>
                  Tableau de bord
                </Typography>
                <Tooltip title="Comprendre les statuts" arrow>
                  <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: "text.disabled", mt: "-2px" }}>
                    <HelpOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Années de formation rattachées à votre hôpital
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Nouvelle année
          </Button>
        </Box>

        {/* ── Statuts help dialog ────────────────────────────────────────── */}
        <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HelpOutlineIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            Comprendre les statuts
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              {([
                {
                  chip: { label: "Compte non activé", color: "warning" as const },
                  text: "La personne a reçu un email d'invitation mais n'a pas encore créé son compte. Une fois son compte activé, elle rejoint automatiquement l'année — aucune autre action n'est requise.",
                },
                {
                  chip: { label: "Invitation non acceptée", color: "info" as const },
                  text: "La personne a déjà un compte MED@WORK (activé via un hôpital précédent ou une autre année) mais n'a pas encore accepté l'invitation à rejoindre cette année spécifique.",
                },
                {
                  chip: { label: "Actif", color: "success" as const },
                  text: "La personne a accès à l'année. Elle peut se connecter et consulter ses données.",
                },
                {
                  chip: { label: "Ajout automatique", color: "default" as const },
                  text: "Le manager appartient déjà à cet hôpital (relation directe). Il est ajouté à la nouvelle année sans invitation : si son compte est activé il peut se connecter immédiatement, sinon il reçoit un lien pour finaliser son compte.",
                },
              ] as const).map(({ chip, text }) => (
                <Box key={chip.label} display="flex" gap={2} alignItems="flex-start">
                  <Chip label={chip.label} color={chip.color} size="small" sx={{ flexShrink: 0, mt: 0.25 }} />
                  <Typography variant="body2" color="text.secondary">{text}</Typography>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHelpOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Tabs
            value={activeTab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Tab label="Toutes" value={ALL_TAB} />
            {periods.map((p) => (
              <Tab key={p} label={p} value={p} />
            ))}
          </Tabs>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewMode}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="grid" aria-label="vue carte">
              <Tooltip title="Vue carte" placement="top" arrow>
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="vue liste">
              <Tooltip title="Vue liste" placement="top" arrow>
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ── KPI Stats ────────────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} item xs={6} sm={3}>
              <SkeletonStatCard />
            </Grid>
          ))
        ) : (
          <>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="MACCS actifs"
                value={stats.maccs.active}
                icon={<CheckCircleOutlineIcon />}
                color="success"
                sublabel={`${stats.maccs.total} au total · voir la liste`}
                onClick={() => navigate("/hospital-admin/residents")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Managers actifs"
                value={stats.managers.active}
                icon={<PersonOutlineIcon />}
                color="info"
                sublabel={`${stats.managers.total} au total · voir la liste`}
                onClick={() => navigate("/hospital-admin/managers")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Invitations en attente"
                value={stats.pendingInvites}
                icon={<HourglassEmptyIcon />}
                color="warning"
                sublabel={stats.pendingInvites > 0 ? "Cliquer pour gérer" : "Tout le monde a accepté"}
                onClick={stats.pendingInvites > 0 ? () => setPendingOpen(true) : undefined}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Années de formation"
                value={stats.totalYears}
                icon={<CalendarMonthOutlinedIcon />}
                color="secondary"
                sublabel={`${stats.activeYears.length} en cours`}
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* ── Grid / List ───────────────────────────────────────────────────── */}
      {viewMode === "grid" ? (
        <Grid container spacing={2.5} alignItems="stretch">
          {isLoading
            ? ([
                { titleWidth: "75%", withLocation: true,  withToken: true  },
                { titleWidth: "60%", withLocation: false, withToken: false },
                { titleWidth: "80%", withLocation: true,  withToken: false },
                { titleWidth: "55%", withLocation: false, withToken: true  },
                { titleWidth: "70%", withLocation: true,  withToken: false },
                { titleWidth: "65%", withLocation: false, withToken: false },
              ] as const).map((props, i) => (
                <Grid key={i} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                  <SkeletonCard {...props} />
                </Grid>
              ))
            : filtered.map((year) => (
                <Grid key={year.id} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                  <YearCard
                    year={year}
                    searchQuery={search}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                  />
                </Grid>
              ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">ANNÉE</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">PÉRIODE</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">STATUT</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">MEMBRES</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.map((year) => (
                    <YearListRow
                      key={year.id}
                      year={year}
                      onEdit={setEditTarget}
                      onDelete={setDeleteTarget}
                    />
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={10}
          gap={1.5}
        >
          {years.length === 0 ? (
            <Alert severity="info" sx={{ maxWidth: 440 }}>
              Aucune année de formation enregistrée pour cet hôpital.
            </Alert>
          ) : (
            <Typography variant="h6" color="text.secondary" fontWeight={500}>
              Aucune année trouvée
            </Typography>
          )}
        </Box>
      )}

      {/* ── Pending invites dialog ───────────────────────────────────────── */}
      <PendingInvitesDialog
        open={pendingOpen}
        onClose={() => setPendingOpen(false)}
        onResent={() => qc.invalidateQueries({ queryKey: ["hospital-admin-dashboard-stats"] })}
      />

      {/* ── Create dialog ─────────────────────────────────────────────────── */}
      <YearFormDialog
        open={addOpen}
        isPending={createMutation.isPending}
        onClose={() => setAddOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
      />

      {/* ── Edit dialog ───────────────────────────────────────────────────── */}
      <YearFormDialog
        open={editTarget !== null}
        initial={editTarget}
        isPending={updateMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSave={(data) => editTarget && updateMutation.mutate({ id: editTarget.id, data })}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <Dialog open={deleteTarget !== null} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Supprimer définitivement cette année ?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Cette action est <strong>irréversible</strong>. Toutes les données associées seront effacées :
            feuilles de temps, gardes, absences, plannings, validations de période.
          </Alert>
          <Typography variant="body2" mb={1}>
            Année : <strong>{deleteTarget?.title}</strong>
          </Typography>
          {((deleteTarget?.residentCount ?? 0) > 0 || (deleteTarget?.managerCount ?? 0) > 0) && (
            <Typography variant="body2" color="text.secondary">
              {deleteTarget?.residentCount ?? 0} résident(s) et {deleteTarget?.managerCount ?? 0} manager(s) liés
              seront <strong>notifiés par email</strong>.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? <CircularProgress size={16} /> : "Supprimer tout"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HospitalAdminDashboardPage;
