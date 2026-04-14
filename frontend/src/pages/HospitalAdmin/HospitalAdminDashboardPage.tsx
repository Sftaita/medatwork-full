import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
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

import SearchIcon from "@mui/icons-material/Search";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";

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

// ── Skeleton card ─────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, p: 2.5 }}>
      <Skeleton variant="text" width="65%" height={26} />
      <Skeleton variant="text" width="45%" height={18} />
      <Box flex={1} minHeight={16} />
      <Box display="flex" gap={1}>
        <Skeleton variant="rounded" width={90} height={26} />
        <Skeleton variant="rounded" width={90} height={26} />
      </Box>
    </CardContent>
    <Divider />
    <Box sx={{ px: 1.5, py: 0.75 }}>
      <Skeleton variant="text" width="70%" height={22} />
    </Box>
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

  const goToYear = (defaultTab?: string) =>
    navigate("/manager/year-detail", {
      state: { id: year.id, title: year.title, adminRights: true, defaultTab },
    });

  // Archived years are read-only; draft, active and closed can still be edited
  const editable = year.status !== "archived";
  const canDelete = (year.residentCount ?? 0) === 0 && (year.managerCount ?? 0) === 0;

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
      {/* Clickable area — navigates to year detail */}
      <CardActionArea
        onClick={() => goToYear()}
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
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
                  goToYear("residents");
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
                  goToYear("partners");
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
      </CardActionArea>

      {/* Actions menu — outside CardActionArea */}
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
          disabled={!canDelete}
        >
          Supprimer
        </MenuItem>
      </Menu>

      {/* Token — outside CardActionArea: copy without navigating */}
      {year.token && (
        <>
          <Divider />
          <Box
            display="flex"
            alignItems="center"
            sx={{ bgcolor: "grey.50", px: 1.5, py: 0.75 }}
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
}

const YearFormDialog = ({ open, initial, isPending, onClose, onSave }: YearFormDialogProps) => {
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
      : EMPTY_FORM
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
    setForm(EMPTY_FORM);
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

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
}

const StatCard = ({ label, value, icon, color, sublabel }: StatCardProps) => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5, "&:last-child": { pb: 2.5 } }}>
      <Box
        sx={{
          width: 48, height: 48, borderRadius: 2, bgcolor: `${color}.50`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color="text.disabled">
            {sublabel}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const ALL_TAB = "__all__";

const HospitalAdminDashboardPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["hospital-admin-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["hospital-admin-dashboard-stats"],
    queryFn: hospitalAdminApi.getDashboardStats,
  });

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(ALL_TAB);
  const tabInitialized = useRef(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HospitalYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HospitalYear | null>(null);

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
    mutationFn: hospitalAdminApi.deleteYear,
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
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Tableau de bord
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Années de formation rattachées à votre hôpital
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Nouvelle année
          </Button>
        </Box>

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
          <TextField
            size="small"
            placeholder="Titre, résident, manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ── KPI Stats ────────────────────────────────────────────────────── */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="MACCS actifs"
              value={stats.maccs.active}
              icon={<CheckCircleOutlineIcon />}
              color="success"
              sublabel={`${stats.maccs.total} au total`}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="En attente"
              value={stats.maccs.pending + stats.managers.pending}
              icon={<HourglassEmptyIcon />}
              color="warning"
              sublabel="MACCS + managers"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Incomplets"
              value={stats.maccs.incomplete + stats.managers.incomplete}
              icon={<WarningAmberIcon />}
              color="error"
              sublabel="Compte non activé"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label="Invitations en cours"
              value={stats.pendingInvites}
              icon={<NotificationsActiveIcon />}
              color="info"
              sublabel={`${stats.managers.active} managers actifs`}
            />
          </Grid>
        </Grid>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} alignItems="stretch">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                <Box width="100%">
                  <SkeletonCard />
                </Box>
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
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer cette année ?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.title}</strong> sera supprimée définitivement. Cette action est{" "}
            <strong>irréversible</strong>.
          </Typography>
          {((deleteTarget?.residentCount ?? 0) > 0 || (deleteTarget?.managerCount ?? 0) > 0) && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Impossible : des résidents ou managers sont encore liés à cette année.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={
              deleteMutation.isPending ||
              (deleteTarget?.residentCount ?? 0) > 0 ||
              (deleteTarget?.managerCount ?? 0) > 0
            }
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? <CircularProgress size={16} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HospitalAdminDashboardPage;
