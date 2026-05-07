import { useState, useMemo } from "react";
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

  const [search, setSearch] = useState("");
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

  // ── Filter + sort by last name ─────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .filter(
          (g) =>
            (g.firstname ?? "").toLowerCase().includes(q) ||
            (g.lastname ?? "").toLowerCase().includes(q) ||
            (g.email ?? "").toLowerCase().includes(q) ||
            (g.job ?? "").toLowerCase().includes(q) ||
            translateJob(g.job).toLowerCase().includes(q),
        )
        .sort((a, b) =>
          (a.lastname ?? "").localeCompare(b.lastname ?? "", "fr", { sensitivity: "base" }),
        ),
    [groups, q],
  );

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
    onSuccess: (data) => { toast.success(data.canCreateYear ? "Droit accordé." : "Droit révoqué."); invalidate(); },
    onError: () => toast.error("Erreur lors de la mise à jour du droit."),
  });

  const openDrawer = (g: ManagerGroup) =>
    setDrawerManagerId(g.managerId !== null ? g.managerId : "anon");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gestion des managers</Typography>
          <Typography variant="body2" color="text.secondary">
            Responsables de stage rattachés à votre hôpital — classés par nom
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddManagerOpen(true)}>
          Ajouter un manager
        </Button>
      </Box>

      {/* Search */}
      <Box mb={2}>
        <TextField
          size="small"
          placeholder="Rechercher par nom, email ou fonction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", sm: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          {groups.length === 0 ? "Aucun manager pour cet hôpital." : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">NOM</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">EMAIL</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">FONCTION</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption" fontWeight={700} color="text.secondary">ANNÉES</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">STATUT</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700} color="text.secondary">GESTION</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((g) => {
                const key = g.managerId !== null ? String(g.managerId) : `anon:${g.email}`;
                return (
                  <TableRow
                    key={key}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => openDrawer(g)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          src={g.avatarUrl ?? undefined}
                          alt={fullName(g)}
                          sx={{ width: 30, height: 30, fontSize: "0.75rem" }}
                        >
                          {!g.avatarUrl && (g.firstname?.[0] ?? "?").toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{fullName(g)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{g.email ?? "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{translateJob(g.job)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={g.years.length}
                        size="small"
                        color={g.years.length > 0 ? "primary" : "default"}
                        variant={g.years.length > 0 ? "filled" : "outlined"}
                        sx={{ minWidth: 32, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={STATUS_TOOLTIP[g.status]} arrow>
                        <Chip label={STATUS_LABEL[g.status]} color={STATUS_COLOR[g.status]} size="small" />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button size="small" variant="outlined" onClick={() => openDrawer(g)}>
                        Gérer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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
