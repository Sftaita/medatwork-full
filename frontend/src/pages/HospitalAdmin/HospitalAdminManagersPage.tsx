import { useState, useMemo } from "react";
import { T, C, statusBadgeSx, yearPillSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Drawer from "@mui/material/Drawer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { ManagerRow, ManagerStatus, HospitalYear } from "../../services/hospitalAdminApi";
import YearSelect from "../../components/YearSelect";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One manager, aggregating all their ManagerYears entries. */
export type ManagerGroup = {
  managerId: number | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  avatarUrl: string | null;
  job: string | null;
  status: ManagerStatus;
  canCreateYear: boolean;
  accountActivated: boolean;
  years: ManagerRow[];
};

// ── Utilities ────────────────────────────────────────────────────────────────

/** Group flat ManagerRow[] (1 row per ManagerYears) into 1 group per manager. */
export function groupManagerRows(rows: ManagerRow[]): ManagerGroup[] {
  const byKey = new Map<string, ManagerGroup>();

  for (const row of rows) {
    const key =
      row.managerId != null ? String(row.managerId) : `email:${row.email ?? ""}`;

    if (!byKey.has(key)) {
      byKey.set(key, {
        managerId: row.managerId,
        firstname: row.firstname,
        lastname: row.lastname,
        email: row.email,
        avatarUrl: row.avatarUrl,
        job: row.job,
        status: row.status,
        canCreateYear: row.canCreateYear,
        accountActivated: row.accountActivated,
        years: [],
      });
    }
    byKey.get(key)!.years.push(row);
  }

  return Array.from(byKey.values());
}

function fullName(g: ManagerGroup | ManagerRow | null): string {
  if (!g) return "—";
  return `${g.lastname ?? ""} ${g.firstname ?? ""}`.trim() || "—";
}

/**
 * Translate common job titles (English or shorthand) to French.
 * Falls back to the original string if no match found.
 */
const JOB_TRANSLATIONS: Record<string, string> = {
  // English → French
  "doctor":                    "Médecin",
  "physician":                 "Médecin",
  "surgeon":                   "Chirurgien",
  "nurse":                     "Infirmier(ère)",
  "head nurse":                "Infirmier(ère) en chef",
  "medical director":          "Directeur médical",
  "medical supervisor":        "Maître de stage",
  "department head":           "Chef de département",
  "chief of service":          "Chef de service",
  "resident":                  "Résident",
  "intern":                    "Interne",
  "specialist":                "Spécialiste",
  "cardiologist":              "Cardiologue",
  "neurologist":               "Neurologue",
  "pediatrician":              "Pédiatre",
  "anesthesiologist":          "Anesthésiste",
  "radiologist":               "Radiologue",
  "psychiatrist":              "Psychiatre",
  "oncologist":                "Oncologue",
  "gynecologist":              "Gynécologue",
  "urologist":                 "Urologue",
  "dermatologist":             "Dermatologue",
  "orthopedist":               "Orthopédiste",
  "general practitioner":      "Médecin généraliste",
  "gp":                        "Médecin généraliste",
  "coordinator":               "Coordinateur(rice)",
  "administrative coordinator": "Coordinateur(rice) administratif(ve)",
  "human resources":           "Ressources humaines",
  "hr":                        "Ressources humaines",
  "manager":                   "Responsable",
  "supervisor":                "Superviseur(e)",
  "director":                  "Directeur(rice)",
  "assistant":                 "Assistant(e)",
  "secretary":                 "Secrétaire",
  "clinical supervisor":       "Superviseur clinique",
  "training supervisor":       "Responsable de formation",
  "internship supervisor":     "Maître de stage",
  "stage supervisor":          "Maître de stage",
  "maitre de stage":           "Maître de stage",
};

export function translateJob(job: string | null): string {
  if (!job) return "—";
  const lower = job.trim().toLowerCase();
  return JOB_TRANSLATIONS[lower] ?? job;
}

// ── Status constants ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ManagerStatus, string> = {
  active:         "Actif",
  pending:        "En attente",
  not_registered: "Sans compte",
};
const STATUS_COLOR: Record<ManagerStatus, "success" | "warning" | "error"> = {
  active:         "success",
  pending:        "warning",
  not_registered: "error",
};
const STATUS_TOOLTIP: Record<ManagerStatus, string> = {
  active:         "Le manager a un compte actif et peut se connecter",
  pending:        "Invitation envoyée — le manager n'a pas encore défini son mot de passe",
  not_registered: "Aucun compte lié — l'invitation n'a jamais été envoyée",
};

/** Label shown per ManagerYears entry in the drawer. */
function yearAttributionLabel(row: ManagerRow): { label: string; color: "success" | "info" | "warning" } {
  if (!row.yearPending && row.status === "active")
    return { label: "Actif", color: "success" };
  if (row.yearPending && row.accountActivated)
    return { label: "Invitation non acceptée", color: "info" };
  return { label: "Compte non activé", color: "warning" };
}

// ── Row actions menu (3-dot) ──────────────────────────────────────────────────

interface ManagerActionsMenuProps {
  group: ManagerGroup;
  onOpenDrawer: () => void;
  onAddYear: () => void;
  onResend: (myId: number) => void;
  onDelete: () => void;
}

const ManagerActionsMenu = ({ group, onOpenDrawer, onAddYear, onResend, onDelete }: ManagerActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const firstPendingYear = group.years.find(
    (r) => r.status !== "active" || r.yearPending,
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
        sx={{ color: C.ink3, "&:hover": { bgcolor: C.surface2 } }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 190, borderRadius: "10px", boxShadow: C.shadow, border: `1px solid ${C.line}` } }}
      >
        <MenuItem onClick={() => { close(); onOpenDrawer(); }} sx={{ fontSize: 13 }}>
          Voir le détail
        </MenuItem>
        <MenuItem onClick={() => { close(); onAddYear(); }} sx={{ fontSize: 13 }}>
          Ajouter à une année
        </MenuItem>
        {firstPendingYear && (
          <MenuItem onClick={() => { close(); onResend(firstPendingYear.myId); }} sx={{ fontSize: 13 }}>
            Renvoyer l'invitation
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => { close(); onDelete(); }}
          disabled={group.managerId === null}
          sx={{ fontSize: 13, color: "error.main" }}
        >
          Supprimer de l'hôpital
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Add manager dialog (header button) ───────────────────────────────────────

interface AddManagerDialogProps {
  open: boolean;
  years: HospitalYear[];
  onClose: () => void;
  onSave: (data: { firstname: string; lastname: string; email: string; yearId: number }) => void;
  isPending: boolean;
}

const AddManagerDialog = ({ open, years, onClose, onSave, isPending }: AddManagerDialogProps) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [yearId, setYearId] = useState<number | "">("");

  const reset = () => { setFirstname(""); setLastname(""); setEmail(""); setYearId(""); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = () => {
    if (!firstname.trim() || !lastname.trim() || !email.trim() || yearId === "") return;
    onSave({ firstname: firstname.trim(), lastname: lastname.trim(), email: email.trim().toLowerCase(), yearId: yearId as number });
  };
  const valid = firstname.trim() !== "" && lastname.trim() !== "" && email.trim() !== "" && yearId !== "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter un manager</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <Box display="flex" gap={2}>
            <TextField label="Prénom" value={firstname} onChange={(e) => setFirstname(e.target.value)} fullWidth required />
            <TextField label="Nom" value={lastname} onChange={(e) => setLastname(e.target.value)} fullWidth required />
          </Box>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
          <YearSelect
            years={years}
            value={yearId}
            onChange={(id) => setYearId(id)}
            label="Année académique"
            required
          />
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
            Si le manager n'a pas encore de compte, il recevra un email pour créer son profil.
            S'il a déjà un compte, il recevra une invitation ou sera ajouté automatiquement.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>Annuler</Button>
        <Button variant="contained" disabled={isPending || !valid} onClick={handleSave}>
          {isPending ? <CircularProgress size={16} /> : "Inviter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Add year to existing manager modal ───────────────────────────────────────

interface AddYearModalProps {
  open: boolean;
  manager: ManagerGroup | null;
  allYears: HospitalYear[];
  onClose: () => void;
  onAdd: (yearId: number) => void;
  isAdding: boolean;
}

const AddYearModal = ({ open, manager, allYears, onClose, onAdd, isAdding }: AddYearModalProps) => {
  const [search, setSearch] = useState("");

  const assignedYearIds = new Set((manager?.years ?? []).map((r) => r.yearId).filter(Boolean) as number[]);

  const filtered = allYears.filter((y) =>
    y.title.toLowerCase().includes(search.toLowerCase()) ||
    y.period?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Attribuer une année à {fullName(manager)}
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box px={2} pt={2} pb={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="Rechercher une année…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        {filtered.length === 0 && (
          <Box px={2} py={2}><Typography color="text.secondary" variant="body2">Aucune année trouvée.</Typography></Box>
        )}
        <List disablePadding>
          {filtered.map((y) => {
            const already = assignedYearIds.has(y.id);
            return (
              <ListItem
                key={y.id}
                divider
                secondaryAction={
                  already
                    ? <Chip label="Déjà attribué" size="small" variant="outlined" color="default" />
                    : (
                      <Button size="small" variant="outlined" startIcon={<AddIcon />}
                        disabled={isAdding} onClick={() => onAdd(y.id)}>
                        Ajouter
                      </Button>
                    )
                }
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>{y.title}</Typography>
                  {y.period && <Typography variant="caption" color="text.secondary">{y.period}</Typography>}
                </Box>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Remove from year confirm ──────────────────────────────────────────────────

interface RemoveYearConfirmProps {
  year: ManagerRow | null;
  onClose: () => void;
  onConfirm: () => void;
  isRemoving: boolean;
}

const RemoveYearConfirm = ({ year, onClose, onConfirm, isRemoving }: RemoveYearConfirmProps) => (
  <Dialog open={year !== null} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Retirer de cette année ?</DialogTitle>
    <DialogContent>
      <Typography>
        Le lien entre ce manager et l'année <strong>{year?.yearTitle ?? "—"}</strong> sera supprimé.
        Le manager reste dans l'hôpital et conserve ses autres attributions.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={isRemoving}>Annuler</Button>
      <Button color="error" variant="contained" disabled={isRemoving} onClick={onConfirm}>
        {isRemoving ? <CircularProgress size={16} /> : "Retirer"}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Delete from hospital modal ────────────────────────────────────────────────

interface DeleteManagerModalProps {
  open: boolean;
  manager: ManagerGroup | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteManagerModal = ({ open, manager, onClose, onConfirm, isDeleting }: DeleteManagerModalProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ color: "error.main" }}>Supprimer ce manager de l'hôpital</DialogTitle>
    <DialogContent>
      <Typography gutterBottom fontWeight={600}>{fullName(manager)}</Typography>
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">Ce manager sera retiré de cet hôpital.</Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <li><Typography variant="body2">il perdra l'accès à toutes les années de cet hôpital ;</Typography></li>
          <li><Typography variant="body2">ses attributions à ces années seront supprimées ;</Typography></li>
          <li><Typography variant="body2">son compte manager ne sera pas supprimé s'il est lié à d'autres hôpitaux.</Typography></li>
        </Box>
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Cette action est <strong>irréversible</strong> pour cet hôpital.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={isDeleting}>Annuler</Button>
      <Button color="error" variant="contained" disabled={isDeleting || manager?.managerId == null} onClick={onConfirm}>
        {isDeleting ? <CircularProgress size={16} /> : "Supprimer"}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Manager drawer ────────────────────────────────────────────────────────────

interface ManagerDrawerProps {
  manager: ManagerGroup | null;
  onClose: () => void;
  onResend: (myId: number) => void;
  onRemoveYear: (row: ManagerRow) => void;
  onOpenAddYear: () => void;
  onOpenDelete: () => void;
  onToggleCreateYear: (managerId: number, value: boolean) => void;
  isResending: boolean;
  isToggling: boolean;
}

const ManagerDrawer = ({
  manager, onClose, onResend, onRemoveYear,
  onOpenAddYear, onOpenDelete, onToggleCreateYear,
  isResending, isToggling,
}: ManagerDrawerProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  // Reset tab when a different manager opens
  const prevId = useMemo(() => manager?.managerId, [manager?.managerId]);
  if (prevId !== manager?.managerId) setTab(0);

  return (
    <Drawer
      anchor="right"
      open={manager !== null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 600 } } }}
    >
      {manager && (
        <Box display="flex" flexDirection="column" height="100%">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <Box
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
            px={3}
            pt={3}
            pb={2}
            borderBottom={1}
            borderColor="divider"
          >
            <Box display="flex" gap={2} alignItems="center" minWidth={0}>
              <Avatar
                src={manager.avatarUrl ?? undefined}
                alt={fullName(manager)}
                sx={{ width: 52, height: 52, fontSize: "1.2rem", flexShrink: 0 }}
              >
                {!manager.avatarUrl && (manager.firstname?.[0] ?? "?").toUpperCase()}
              </Avatar>
              <Box minWidth={0}>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2} noWrap>
                  {fullName(manager)}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{manager.email ?? "—"}</Typography>
                {manager.job && (
                  <Typography variant="caption" color="text.disabled" noWrap display="block">
                    {translateJob(manager.job)}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={1.5} flexShrink={0} ml={1}>
              <Badge badgeContent={manager.years.length} color="primary" showZero>
                <CalendarMonthIcon color="action" />
              </Badge>
              <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            </Box>
          </Box>

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <Box borderBottom={1} borderColor="divider" bgcolor="grey.50">
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ px: 2 }}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                label={`Années (${manager.years.length})`}
                icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                sx={{ minHeight: 48, fontSize: "0.85rem" }}
              />
              <Tab
                label="Compte & Hôpital"
                icon={<ManageAccountsIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                sx={{ minHeight: 48, fontSize: "0.85rem" }}
              />
            </Tabs>
          </Box>

          {/* ── Tab 0 — Années attribuées ───────────────────────────────── */}
          {tab === 0 && (
            <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
              {manager.years.length === 0 ? (
                <Box p={3}>
                  <Alert severity="info">Aucune année attribuée.</Alert>
                </Box>
              ) : (
                <Box flex={1} overflow="auto">
                  <List disablePadding>
                    {manager.years.map((row) => {
                      const { label, color } = yearAttributionLabel(row);
                      const showResend = row.status !== "active" || row.yearPending;
                      return (
                        <ListItem
                          key={row.myId}
                          divider
                          alignItems="flex-start"
                          sx={{ px: 3, py: 2, flexDirection: "column", gap: 0.5 }}
                        >
                          <Box display="flex" justifyContent="space-between" width="100%" alignItems="flex-start">
                            <Box minWidth={0} flex={1} mr={1}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {row.yearTitle ?? "—"}
                              </Typography>
                              <Chip
                                label={label}
                                color={color}
                                size="small"
                                variant="outlined"
                                sx={{ mt: 0.5, height: 20, fontSize: "0.68rem" }}
                              />
                            </Box>
                            <Stack direction="row" spacing={0.5} flexShrink={0}>
                              {row.yearId != null && (
                                <Tooltip title="Voir les résidents de cette année" arrow>
                                  <IconButton size="small" onClick={() => navigate(`/hospital-admin/years/${row.yearId}/residents`)}>
                                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {showResend && (
                                <Tooltip title="Renvoyer l'invitation" arrow>
                                  <span>
                                    <IconButton size="small" disabled={isResending} onClick={() => onResend(row.myId)}>
                                      {isResending ? <CircularProgress size={14} /> : <SendIcon sx={{ fontSize: 16 }} />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              <Tooltip title="Retirer de cette année" arrow>
                                <IconButton size="small" color="error" onClick={() => onRemoveYear(row)}>
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
              <Box px={3} py={2} borderTop={1} borderColor="divider" bgcolor="grey.50" flexShrink={0}>
                <Button variant="outlined" startIcon={<AddIcon />} fullWidth onClick={onOpenAddYear}>
                  Ajouter à une année
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Tab 1 — Compte & Hôpital ────────────────────────────────── */}
          {tab === 1 && (
            <Box flex={1} overflow="auto" p={3}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Statut du compte
                  </Typography>
                  <Tooltip title={STATUS_TOOLTIP[manager.status]} arrow>
                    <Chip label={STATUS_LABEL[manager.status]} color={STATUS_COLOR[manager.status]} size="small" />
                  </Tooltip>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Permissions
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={manager.canCreateYear}
                        disabled={isToggling || manager.managerId === null}
                        onChange={(e) =>
                          manager.managerId !== null && onToggleCreateYear(manager.managerId, e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Peut créer une année</Typography>}
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Zone dangereuse
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<PersonRemoveIcon />}
                    fullWidth
                    onClick={onOpenDelete}
                    disabled={manager.managerId == null}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    Supprimer de l'hôpital
                  </Button>
                  <Typography variant="caption" color="text.disabled" display="block" mt={0.75}>
                    Supprime le lien avec l'hôpital et toutes les attributions d'années associées.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Drawer>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminManagersPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [sortCol, setSortCol] = useState<"nom" | "email" | "fonction" | "annees" | "statut" | null>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [drawerManagerId, setDrawerManagerId] = useState<number | "anon" | null>(null);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [addYearOpen, setAddYearOpen] = useState(false);
  const [removeYearTarget, setRemoveYearTarget] = useState<ManagerRow | null>(null);
  const [deleteManagerOpen, setDeleteManagerOpen] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: rowsCurrent = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ["hospital-managers", "current"],
    queryFn: () => hospitalAdminApi.listManagers("current"),
  });
  const { data: rowsHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["hospital-managers", "history"],
    queryFn: () => hospitalAdminApi.listManagers("history"),
  });
  const { data: allYears = [] } = useQuery({
    queryKey: ["hospital-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const isLoading = loadingCurrent || loadingHistory;

  const allRows = useMemo(() => {
    const seen = new Set<number>();
    const merged: ManagerRow[] = [];
    for (const row of [...rowsCurrent, ...rowsHistory]) {
      if (!seen.has(row.myId)) { seen.add(row.myId); merged.push(row); }
    }
    return merged;
  }, [rowsCurrent, rowsHistory]);

  const groups = useMemo(() => groupManagerRows(allRows), [allRows]);

  const drawerManager = useMemo(
    () =>
      drawerManagerId === null
        ? null
        : groups.find((g) =>
            drawerManagerId === "anon" ? g.managerId === null : g.managerId === drawerManagerId,
          ) ?? null,
    [drawerManagerId, groups],
  );

  // ── Fonction options (valeurs uniques dans les données) ───────────────────
  const jobOptions = useMemo(() => {
    const seen = new Set<string>();
    groups.forEach((g) => { if (g.job) seen.add(g.job); });
    return Array.from(seen).sort((a, b) =>
      translateJob(a).localeCompare(translateJob(b), "fr", { sensitivity: "base" })
    );
  }, [groups]);

  // ── Sort handler ───────────────────────────────────────────────────────────
  type SortCol = "nom" | "email" | "fonction" | "annees" | "statut";
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = groups.filter((g) => {
      if (jobFilter && g.job !== jobFilter) return false;
      return (
        (g.firstname ?? "").toLowerCase().includes(q) ||
        (g.lastname ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        (g.job ?? "").toLowerCase().includes(q) ||
        translateJob(g.job).toLowerCase().includes(q)
      );
    });

    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "nom":
          cmp = (a.lastname ?? "").localeCompare(b.lastname ?? "", "fr", { sensitivity: "base" });
          if (cmp === 0) cmp = (a.firstname ?? "").localeCompare(b.firstname ?? "", "fr");
          break;
        case "email":
          cmp = (a.email ?? "").localeCompare(b.email ?? "");
          break;
        case "fonction":
          cmp = translateJob(a.job).localeCompare(translateJob(b.job), "fr", { sensitivity: "base" });
          break;
        case "annees":
          cmp = a.years.length - b.years.length;
          break;
        case "statut":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        default:
          cmp = (a.lastname ?? "").localeCompare(b.lastname ?? "", "fr", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [groups, q, jobFilter, sortCol, sortDir]);

  // ── Invalidate ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hospital-managers"] });
    qc.invalidateQueries({ queryKey: ["hospital-admin-dashboard-stats"] });
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addManagerMutation = useMutation({
    mutationFn: hospitalAdminApi.addManager,
    onSuccess: () => { toast.success("Manager invité."); setAddManagerOpen(false); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'ajout."),
  });

  const addYearMutation = useMutation({
    mutationFn: ({ yearId }: { yearId: number }) => {
      if (!drawerManager) return Promise.reject();
      return hospitalAdminApi.addManager({
        firstname: drawerManager.firstname ?? "",
        lastname: drawerManager.lastname ?? "",
        email: drawerManager.email ?? "",
        yearId,
      });
    },
    onSuccess: () => { toast.success("Manager ajouté à l'année."); setAddYearOpen(false); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'ajout."),
  });

  const resendMutation = useMutation({
    mutationFn: (myId: number) => hospitalAdminApi.resendManagerInvite(myId),
    onSuccess: () => toast.success("Invitation renvoyée."),
    onError: () => toast.error("Erreur lors du renvoi."),
  });

  const removeMutation = useMutation({
    mutationFn: (myId: number) => hospitalAdminApi.removeManagerYear(myId),
    onSuccess: () => { toast.success("Manager retiré de l'année."); setRemoveYearTarget(null); invalidate(); },
    onError: () => toast.error("Erreur lors du retrait."),
  });

  const deleteMutation = useMutation({
    mutationFn: (managerId: number) => hospitalAdminApi.deleteManager(managerId),
    onSuccess: () => {
      toast.success("Manager supprimé de l'hôpital.");
      setDeleteManagerOpen(false);
      setDrawerManagerId(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la suppression."),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ managerId, value }: { managerId: number; value: boolean }) =>
      hospitalAdminApi.setManagerCanCreateYear(managerId, value),
    onMutate: async ({ managerId, value }) => {
      await qc.cancelQueries({ queryKey: ["hospital-managers"] });
      const prevCurrent = qc.getQueryData<ManagerRow[]>(["hospital-managers", "current"]);
      const prevHistory = qc.getQueryData<ManagerRow[]>(["hospital-managers", "history"]);
      const apply = (rows: ManagerRow[] | undefined) =>
        rows?.map((r) => r.managerId === managerId ? { ...r, canCreateYear: value } : r);
      qc.setQueryData(["hospital-managers", "current"], apply(prevCurrent));
      qc.setQueryData(["hospital-managers", "history"], apply(prevHistory));
      return { prevCurrent, prevHistory };
    },
    onSuccess: (data) => {
      toast.success(data.canCreateYear ? "Droit accordé." : "Droit révoqué.");
    },
    onError: (_err, _vars, context) => {
      if (context?.prevCurrent !== undefined)
        qc.setQueryData(["hospital-managers", "current"], context.prevCurrent);
      if (context?.prevHistory !== undefined)
        qc.setQueryData(["hospital-managers", "history"], context.prevHistory);
      toast.error("Erreur lors de la mise à jour du droit.");
    },
    onSettled: () => invalidate(),
  });

  const openDrawer = (g: ManagerGroup) =>
    setDrawerManagerId(g.managerId !== null ? g.managerId : "anon");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>Gestion des managers</Typography>
          <Typography sx={T.pageSub}>
            Responsables de stage rattachés à votre hôpital
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddManagerOpen(true)}
          sx={{ bgcolor: C.brand600, "&:hover": { bgcolor: C.brand700 }, borderRadius: "8px", height: 36, fontSize: 13 }}>
          Ajouter un manager
        </Button>
      </Box>

      {/* Toolbar */}
      <Box sx={T.toolbar}>
        <TextField
          size="small"
          placeholder="Rechercher par nom, email ou fonction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ...T.search }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: C.ink4 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Filtre fonction */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ fontSize: 13 }}>Fonction</InputLabel>
          <Select
            value={jobFilter}
            label="Fonction"
            onChange={(e) => setJobFilter(e.target.value)}
            sx={{ fontSize: 13, height: 38, borderRadius: "8px" }}
          >
            <MenuItem value="" sx={{ fontSize: 13 }}>Toutes</MenuItem>
            {jobOptions.map((job) => (
              <MenuItem key={job} value={job} sx={{ fontSize: 13 }}>
                {translateJob(job)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DensityToggleButton density={density} onCycle={cycleDensity} />

        <Typography variant="caption" sx={{ color: C.ink3, ml: "auto" }}>
          {filtered.length} manager{filtered.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress sx={{ color: C.brand600 }} /></Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {groups.length === 0 ? "Aucun manager pour cet hôpital." : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  {(["nom", "email", "fonction"] as const).map((col) => {
                    const labels: Record<string, string> = { nom: "Nom", email: "Email", fonction: "Fonction" };
                    const active = sortCol === col;
                    return (
                      <TableCell
                        key={col}
                        onClick={() => handleSort(col)}
                        sx={{ cursor: "pointer", "&:hover": { color: C.ink } }}
                      >
                        <Box display="inline-flex" alignItems="center" gap="4px">
                          {labels[col]}
                          {active
                            ? sortDir === "asc"
                              ? <ArrowUpwardIcon sx={{ fontSize: 11 }} />
                              : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                            : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                          }
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell
                    align="center"
                    onClick={() => handleSort("annees")}
                    sx={{ width: 90, cursor: "pointer", "&:hover": { color: C.ink } }}
                  >
                    <Box display="inline-flex" alignItems="center" gap="4px">
                      Années
                      {sortCol === "annees"
                        ? sortDir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 11 }} /> : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                        : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                      }
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSort("statut")}
                    sx={{ width: 120, cursor: "pointer", "&:hover": { color: C.ink } }}
                  >
                    <Box display="inline-flex" alignItems="center" gap="4px">
                      Statut
                      {sortCol === "statut"
                        ? sortDir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 11 }} /> : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                        : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                      }
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((g) => {
                  const key = g.managerId !== null ? String(g.managerId) : `anon:${g.email}`;
                  const initials = ((g.firstname?.[0] ?? "") + (g.lastname?.[0] ?? "")).toUpperCase() || "?";
                  const badgeVariant =
                    g.status === "active"  ? "active"  :
                    g.status === "pending" ? "pending" : "default";
                  return (
                    <TableRow key={key} sx={bodyRowSx(density)} onClick={() => openDrawer(g)}>

                      {/* Nom */}
                      <TableCell>
                        <Box sx={T.person}>
                          <Avatar src={g.avatarUrl ?? undefined} alt={fullName(g)} sx={T.avatar}>
                            {!g.avatarUrl && initials}
                          </Avatar>
                          <Box>
                            <Box sx={T.name}>{fullName(g)}</Box>
                            <Box sx={T.sub}>@{(g.email ?? "").split("@")[0]}</Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TableCell sx={{ color: C.ink2 }}>{g.email ?? "—"}</TableCell>

                      {/* Fonction */}
                      <TableCell>
                        <Box display="flex" alignItems="center" gap="7px">
                          <Box sx={{
                            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                            bgcolor: g.job === "human resources" ? "#2c8475" :
                                     g.job === "doctor"          ? "#623e87" : "#a16207",
                          }} />
                          <Typography sx={{ fontSize: 13, color: C.ink2 }}>
                            {translateJob(g.job)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Années */}
                      <TableCell align="center">
                        <Box component="span" sx={yearPillSx(g.years.length)}>
                          {g.years.length}
                        </Box>
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Tooltip title={STATUS_TOOLTIP[g.status]} arrow>
                          <Box component="span" sx={statusBadgeSx(badgeVariant)}>
                            {STATUS_LABEL[g.status]}
                          </Box>
                        </Tooltip>
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <ManagerActionsMenu
                          group={g}
                          onOpenDrawer={() => openDrawer(g)}
                          onAddYear={() => { openDrawer(g); setAddYearOpen(true); }}
                          onResend={(myId) => resendMutation.mutate(myId)}
                          onDelete={() => { openDrawer(g); setDeleteManagerOpen(true); }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Footer */}
          <Box sx={T.footer}>
            <Typography variant="caption">
              {filtered.length} sur {groups.length} manager{groups.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Manager drawer */}
      <ManagerDrawer
        manager={drawerManager}
        onClose={() => setDrawerManagerId(null)}
        onResend={(myId) => resendMutation.mutate(myId)}
        onRemoveYear={(row) => setRemoveYearTarget(row)}
        onOpenAddYear={() => setAddYearOpen(true)}
        onOpenDelete={() => setDeleteManagerOpen(true)}
        onToggleCreateYear={(managerId, value) => toggleMutation.mutate({ managerId, value })}
        isResending={resendMutation.isPending}
        isToggling={toggleMutation.isPending}
      />

      {/* Dialogs */}
      <AddManagerDialog
        open={addManagerOpen}
        years={allYears}
        onClose={() => setAddManagerOpen(false)}
        onSave={(data) => addManagerMutation.mutate(data)}
        isPending={addManagerMutation.isPending}
      />
      <AddYearModal
        open={addYearOpen}
        manager={drawerManager}
        allYears={allYears}
        onClose={() => setAddYearOpen(false)}
        onAdd={(yearId) => addYearMutation.mutate({ yearId })}
        isAdding={addYearMutation.isPending}
      />
      <RemoveYearConfirm
        year={removeYearTarget}
        onClose={() => setRemoveYearTarget(null)}
        onConfirm={() => removeYearTarget && removeMutation.mutate(removeYearTarget.myId)}
        isRemoving={removeMutation.isPending}
      />
      <DeleteManagerModal
        open={deleteManagerOpen}
        manager={drawerManager}
        onClose={() => setDeleteManagerOpen(false)}
        onConfirm={() =>
          drawerManager?.managerId != null && deleteMutation.mutate(drawerManager.managerId)
        }
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
};

export default HospitalAdminManagersPage;
