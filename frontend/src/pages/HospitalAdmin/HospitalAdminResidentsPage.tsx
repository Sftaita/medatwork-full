import { useState, useRef, useEffect } from "react";
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
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
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
import Checkbox from "@mui/material/Checkbox";
import DownloadIcon from "@mui/icons-material/Download";
import Drawer from "@mui/material/Drawer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import LinearProgress from "@mui/material/LinearProgress";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type {
  MaccsRow,
  MaccsStatus,
  HospitalYear,
  CsvImportResult,
} from "../../services/hospitalAdminApi";

// ── Status helpers ────────────────────────────────────────────────────────────

type ChipColor = "success" | "warning" | "error" | "default";

const STATUS_LABEL: Record<MaccsStatus, string> = {
  active: "Actif",
  pending: "En attente",
  incomplete: "Incomplet",
  retired: "Retiré",
};

const STATUS_TOOLTIP: Record<MaccsStatus, string> = {
  active: "Le MACCS a activé son compte et peut se connecter",
  pending: "Invitation envoyée — le MACCS n'a pas encore défini son mot de passe",
  incomplete: "Compte créé mais jamais activé — aucun accès à la plateforme",
  retired: "Le MACCS a été retiré de cette année académique",
};

const STATUS_COLOR: Record<MaccsStatus, ChipColor> = {
  active: "success",
  pending: "warning",
  incomplete: "error",
  retired: "default",
};

// ── Actions menu ──────────────────────────────────────────────────────────────

interface ActionsMenuProps {
  row: MaccsRow;
  years: HospitalYear[];
  isPending: boolean;
  onView: () => void;
  onEdit: () => void;
  onRetire: () => void;
  onChangeYear: () => void;
  onResend: () => void;
  onDelete: () => void;
}

const ActionsMenu = ({
  row,
  isPending,
  onView,
  onEdit,
  onRetire,
  onChangeYear,
  onResend,
  onDelete,
}: ActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={isPending}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            onView();
          }}
        >
          Voir le détail
        </MenuItem>
        {row.status !== "retired" && (
          <MenuItem
            onClick={() => {
              close();
              onEdit();
            }}
          >
            Modifier (opting-out)
          </MenuItem>
        )}
        <Divider />
        {row.status === "pending" && (
          <MenuItem
            onClick={() => {
              close();
              onResend();
            }}
          >
            Renvoyer l'invitation
          </MenuItem>
        )}
        {row.status !== "retired" && (
          <MenuItem
            onClick={() => {
              close();
              onChangeYear();
            }}
          >
            Changer d'année
          </MenuItem>
        )}
        {row.status !== "retired" && (
          <MenuItem
            onClick={() => {
              close();
              onRetire();
            }}
            sx={{ color: "error.main" }}
          >
            Retirer
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            onDelete();
          }}
          sx={{ color: "error.main", fontWeight: 600 }}
        >
          Supprimer définitivement
        </MenuItem>
      </Menu>
    </>
  );
};

// ── View drawer ───────────────────────────────────────────────────────────────

const ViewDrawer = ({ row, onClose }: { row: MaccsRow | null; onClose: () => void }) => (
  <Drawer
    anchor="right"
    open={row !== null}
    onClose={onClose}
    PaperProps={{ sx: { width: 360, p: 3 } }}
  >
    {row && (
      <>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight={700}>
            Détail MACCS
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Nom complet
            </Typography>
            <Typography>
              {row.firstname} {row.lastname}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography>{row.email ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Année académique
            </Typography>
            <Typography>{row.yearTitle ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Opting-out
            </Typography>
            <Box mt={0.5}>
              {row.optingOut ? (
                <Chip label="Oui — exclu des statistiques" size="small" color="warning" />
              ) : (
                <Typography variant="body2">Non</Typography>
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Statut
            </Typography>
            <Box mt={0.5}>
              <Tooltip title={STATUS_TOOLTIP[row.status]} arrow>
                <Chip
                  label={STATUS_LABEL[row.status]}
                  color={STATUS_COLOR[row.status]}
                  size="small"
                />
              </Tooltip>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Ajouté le
            </Typography>
            <Typography>{new Date(row.createdAt).toLocaleDateString("fr-BE")}</Typography>
          </Box>
        </Stack>
      </>
    )}
  </Drawer>
);

// ── Edit dialog (optingOut) ───────────────────────────────────────────────────

interface EditDialogProps {
  row: MaccsRow | null;
  onClose: () => void;
  onSave: (yrId: number, optingOut: boolean) => void;
  isPending: boolean;
}

const EditDialog = ({ row, onClose, onSave, isPending }: EditDialogProps) => {
  const [optingOut, setOptingOut] = useState(false);

  // Sync when row changes
  useState(() => {
    if (row) setOptingOut(row.optingOut ?? false);
  });

  if (!row) return null;

  const handleOpen = () => setOptingOut(row.optingOut ?? false);

  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        Modifier — {row.firstname} {row.lastname}
      </DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={<Switch checked={optingOut} onChange={(e) => setOptingOut(e.target.checked)} />}
          label="Opting-out (exclusion statistiques)"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={isPending}
          onClick={() => onSave(row.yrId, optingOut)}
        >
          {isPending ? <CircularProgress size={16} /> : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Change year dialog ────────────────────────────────────────────────────────

interface ChangeYearDialogProps {
  row: MaccsRow | null;
  years: HospitalYear[];
  onClose: () => void;
  onSave: (yrId: number, newYearId: number) => void;
  isPending: boolean;
}

const ChangeYearDialog = ({ row, years, onClose, onSave, isPending }: ChangeYearDialogProps) => {
  const [newYearId, setNewYearId] = useState<number | "">("");

  if (!row) return null;

  const availableYears = years.filter((y) => y.id !== row.yearId);

  return (
    <Dialog open={row !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Changer d'année — {row.firstname} {row.lastname}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Nouvelle année</InputLabel>
          <Select
            value={newYearId}
            label="Nouvelle année"
            onChange={(e) => setNewYearId(e.target.value as number)}
          >
            {availableYears.map((y) => (
              <MenuItem key={y.id} value={y.id}>
                {y.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={isPending || newYearId === ""}
          onClick={() => newYearId !== "" && onSave(row.yrId, newYearId)}
        >
          {isPending ? <CircularProgress size={16} /> : "Déplacer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Add MACCS dialog ──────────────────────────────────────────────────────────

interface AddDialogProps {
  open: boolean;
  years: HospitalYear[];
  onClose: () => void;
  onSave: (data: {
    firstname: string;
    lastname: string;
    email: string;
    optingOut: boolean;
    yearId: number;
  }) => void;
  isPending: boolean;
}

type AddForm = {
  firstname: string;
  lastname: string;
  email: string;
  optingOut: boolean;
  yearId: number | "";
};
const EMPTY_FORM: AddForm = {
  firstname: "",
  lastname: "",
  email: "",
  optingOut: false,
  yearId: "",
};

const AddDialog = ({ open, years, onClose, onSave, isPending }: AddDialogProps) => {
  const [form, setForm] = useState(EMPTY_FORM);

  // Reset form whenever the dialog closes (success or cancel)
  useEffect(() => {
    if (!open) setForm(EMPTY_FORM);
  }, [open]);

  const set = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => onClose();

  const valid =
    form.firstname.trim() && form.lastname.trim() && form.email.trim() && form.yearId !== "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter un MACCS</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
            Si le résident existe déjà (même email), il sera rattaché à l'année sélectionnée sans
            créer de compte.
          </Alert>
          <TextField
            label="Prénom"
            value={form.firstname}
            onChange={(e) => set("firstname", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Nom"
            value={form.lastname}
            onChange={(e) => set("lastname", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>Année académique</InputLabel>
            <Select
              value={form.yearId}
              label="Année académique"
              onChange={(e) => set("yearId", Number(e.target.value))}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={form.optingOut}
                onChange={(e) => set("optingOut", e.target.checked)}
              />
            }
            label="Opting-out (exclusion statistiques)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={isPending || !valid}
          onClick={() =>
            valid &&
            onSave({
              firstname: form.firstname.trim(),
              lastname: form.lastname.trim(),
              email: form.email.trim(),
              optingOut: form.optingOut,
              yearId: Number(form.yearId),
            })
          }
        >
          {isPending ? <CircularProgress size={16} /> : "Ajouter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── CSV import dialog ─────────────────────────────────────────────────────────

interface CsvDialogProps {
  open: boolean;
  onClose: () => void;
}

const CsvDialog = ({ open, onClose }: CsvDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setConfirmed(false);
    onClose();
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await hospitalAdminApi.previewCsvImport(file);
      setPreview(result);
    } catch {
      toast.error("Erreur lors de l'analyse du CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await hospitalAdminApi.confirmCsvImport(file);
      setConfirmed(true);
      setPreview(result);
      toast.success(
        `Import terminé : ${result.created.length} créés, ${result.attached.length} rattachés.`
      );
    } catch {
      toast.error("Erreur lors de l'import.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!preview?.errors.length) return;
    const rows = [
      ["Ligne", "Email", "Raison"],
      ...preview.errors.map((e) => [String(e.line), e.email ?? "", e.reason]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Importer des MACCS via CSV</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
            Format CSV attendu : <strong>prénom,nom,email,année,opting-out</strong>
            <br />
            La première ligne est ignorée (en-têtes). L'opting-out peut être "oui"/"1"/"true".
          </Alert>

          {!confirmed && (
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => inputRef.current?.click()}
              >
                {file ? file.name : "Choisir un fichier CSV"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setPreview(null);
                  }
                }}
              />
              {file && !preview && (
                <Button variant="contained" onClick={handlePreview} disabled={loading}>
                  {loading ? <CircularProgress size={16} /> : "Analyser"}
                </Button>
              )}
            </Box>
          )}

          {preview && (
            <Box>
              {preview.errors.length > 0 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadErrors}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Exporter erreurs
                    </Button>
                  }
                >
                  <Typography variant="body2" fontWeight={600} mb={0.5}>
                    {preview.errors.length} erreur(s) détectée(s) :
                  </Typography>
                  {preview.errors.slice(0, 5).map((e, i) => (
                    <Typography key={i} variant="caption" display="block">
                      Ligne {e.line}
                      {e.email ? ` (${e.email})` : ""} — {e.reason}
                    </Typography>
                  ))}
                  {preview.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      … et {preview.errors.length - 5} autre(s). Exportez pour voir tout.
                    </Typography>
                  )}
                </Alert>
              )}

              <Typography variant="body2" mb={1}>
                <strong>{preview.created.length}</strong> nouveau(x) résident(s) à créer,{" "}
                <strong>{preview.attached.length}</strong> à rattacher à une année.
              </Typography>

              {[
                { title: "À créer", items: preview.created },
                { title: "À rattacher", items: preview.attached },
              ].map(({ title, items }) =>
                items.length > 0 ? (
                  <Box key={title} mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      {title}
                    </Typography>
                    {items.map((item, i) => (
                      <Typography key={i} variant="body2">
                        {item.firstname} {item.lastname} — {item.email} ({item.yearTitle})
                      </Typography>
                    ))}
                  </Box>
                ) : null
              )}
            </Box>
          )}

          {confirmed && <Alert severity="success">Import confirmé avec succès.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{confirmed ? "Fermer" : "Annuler"}</Button>
        {preview && !confirmed && (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading || preview.created.length + preview.attached.length === 0}
          >
            {loading ? <CircularProgress size={16} /> : "Confirmer l'import"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminResidentsPage = () => {
  useAxiosPrivate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"current" | "history">("current");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaccsStatus | "">("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [selected, setSelected] = useState<number[]>([]);

  // Dialogs / drawers
  const [viewRow, setViewRow] = useState<MaccsRow | null>(null);
  const [editRow, setEditRow] = useState<MaccsRow | null>(null);
  const [changeYearRow, setChangeYearRow] = useState<MaccsRow | null>(null);
  const [retireTarget, setRetireTarget] = useState<MaccsRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaccsRow | null>(null);

  // Data
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["hospital-maccs", mode],
    queryFn: () => hospitalAdminApi.listResidents(mode),
  });

  const { data: years = [] } = useQuery({
    queryKey: ["hospital-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hospital-maccs"] });
  };

  // Mutations — meta.suppressErrorToast prevents the global handler from also showing a toast
  const editMutation = useMutation({
    mutationFn: ({ yrId, optingOut }: { yrId: number; optingOut: boolean }) =>
      hospitalAdminApi.editYearsResident(yrId, { optingOut }),
    onSuccess: () => {
      toast.success("Modifié.");
      setEditRow(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la modification."),
    meta: { suppressErrorToast: true },
  });

  const retireMutation = useMutation({
    mutationFn: (yrId: number) => hospitalAdminApi.retireResident(yrId),
    onSuccess: () => {
      toast.success("Résident retiré.");
      setRetireTarget(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors du retrait."),
    meta: { suppressErrorToast: true },
  });

  const changeYearMutation = useMutation({
    mutationFn: ({ yrId, newYearId }: { yrId: number; newYearId: number }) =>
      hospitalAdminApi.changeResidentYear(yrId, newYearId),
    onSuccess: () => {
      toast.success("Année modifiée.");
      setChangeYearRow(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors du changement d'année."),
    meta: { suppressErrorToast: true },
  });

  const addMutation = useMutation({
    mutationFn: hospitalAdminApi.addResident,
    onSuccess: () => {
      toast.success("MACCS ajouté.");
      setAddOpen(false);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de l'ajout."),
    meta: { suppressErrorToast: true },
  });

  const resendMutation = useMutation({
    mutationFn: (yrId: number) => hospitalAdminApi.resendResidentInvite(yrId),
    onSuccess: () => toast.success("Invitation renvoyée."),
    onError: () => toast.error("Erreur lors du renvoi."),
    meta: { suppressErrorToast: true },
  });

  const deleteMutation = useMutation({
    mutationFn: (residentId: number) => hospitalAdminApi.deleteResident(residentId),
    onSuccess: () => {
      toast.success("MACCS supprimé définitivement.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la suppression."),
    meta: { suppressErrorToast: true },
  });

  const bulkEditMutation = useMutation({
    mutationFn: ({ yrIds, changes }: { yrIds: number[]; changes: { optingOut?: boolean } }) =>
      hospitalAdminApi.bulkEditResidents(yrIds, changes),
    onSuccess: (data) => {
      toast.success(`${data.updated} MACCS modifié(s)`);
      setSelected([]);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la modification en masse"),
    meta: { suppressErrorToast: true },
  });

  const handleExport = async () => {
    try {
      const blob = await hospitalAdminApi.exportResidentsCsv(mode, yearFilter !== "" ? yearFilter : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maccs-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  // Filter
  const q = search.toLowerCase();
  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (yearFilter !== "" && r.yearId !== yearFilter) return false;
    return (
      (r.firstname ?? "").toLowerCase().includes(q) ||
      (r.lastname ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.yearTitle ?? "").toLowerCase().includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.yrId));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((r) => r.yrId));
  const toggleOne = (yrId: number) =>
    setSelected((prev) => prev.includes(yrId) ? prev.filter((id) => id !== yrId) : [...prev, yrId]);

  const anyMutationPending =
    editMutation.isPending ||
    retireMutation.isPending ||
    changeYearMutation.isPending ||
    addMutation.isPending ||
    resendMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Gestion des MACCS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Médecins en formation clinique et scientifique de votre hôpital
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setCsvOpen(true)}
          >
            Importer CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Ajouter un MACCS
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" mb={2}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) { setMode(v); setSelected([]); } }}
          size="small"
        >
          <ToggleButton value="current">En cours</ToggleButton>
          <ToggleButton value="history">Historique</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          size="small"
          placeholder="Nom, email, année…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statusFilter}
            label="Statut"
            onChange={(e) => setStatusFilter(e.target.value as MaccsStatus | "")}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="active">Actif</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="incomplete">Incomplet</MenuItem>
            <MenuItem value="retired">Retiré</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Année</InputLabel>
          <Select
            value={yearFilter}
            label="Année"
            onChange={(e) => setYearFilter(e.target.value as number | "")}
          >
            <MenuItem value="">Toutes</MenuItem>
            {years.map((y) => (
              <MenuItem key={y.id} value={y.id}>{y.title}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box flex={1} />

        {selected.length > 0 && (
          <Box display="flex" gap={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">{selected.length} sélectionné(s)</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => bulkEditMutation.mutate({ yrIds: selected, changes: { optingOut: true } })}
              disabled={bulkEditMutation.isPending}
            >
              Opting-out ON
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => bulkEditMutation.mutate({ yrIds: selected, changes: { optingOut: false } })}
              disabled={bulkEditMutation.isPending}
            >
              Opting-out OFF
            </Button>
          </Box>
        )}

        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
          Exporter CSV
        </Button>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          {rows.length === 0
            ? "Aucun MACCS pour cette période."
            : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selected.length > 0 && !allSelected}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell>
                  <strong>Nom Prénom</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Année académique</strong>
                </TableCell>
                <TableCell>
                  <strong>Opting-out</strong>
                </TableCell>
                <TableCell>
                  <strong>Statut</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.yrId}
                  hover
                  selected={selected.includes(row.yrId)}
                  onClick={() => toggleOne(row.yrId)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.includes(row.yrId)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleOne(row.yrId)}
                    />
                  </TableCell>
                  <TableCell>
                    {row.lastname ?? "—"} {row.firstname ?? ""}
                  </TableCell>
                  <TableCell>{row.email ?? "—"}</TableCell>
                  <TableCell>{row.yearTitle ?? "—"}</TableCell>
                  <TableCell>
                    {row.optingOut ? (
                      <Chip label="Oui" size="small" color="warning" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={STATUS_TOOLTIP[row.status]} arrow>
                      <Chip
                        label={STATUS_LABEL[row.status]}
                        color={STATUS_COLOR[row.status]}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <ActionsMenu
                      row={row}
                      years={years}
                      isPending={anyMutationPending}
                      onView={() => setViewRow(row)}
                      onEdit={() => setEditRow(row)}
                      onRetire={() => setRetireTarget(row)}
                      onChangeYear={() => setChangeYearRow(row)}
                      onResend={() => resendMutation.mutate(row.yrId)}
                      onDelete={() => setDeleteTarget(row)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View drawer */}
      <ViewDrawer row={viewRow} onClose={() => setViewRow(null)} />

      {/* Edit dialog */}
      <EditDialog
        row={editRow}
        onClose={() => setEditRow(null)}
        onSave={(yrId, optingOut) => editMutation.mutate({ yrId, optingOut })}
        isPending={editMutation.isPending}
      />

      {/* Change year dialog */}
      <ChangeYearDialog
        row={changeYearRow}
        years={years}
        onClose={() => setChangeYearRow(null)}
        onSave={(yrId, newYearId) => changeYearMutation.mutate({ yrId, newYearId })}
        isPending={changeYearMutation.isPending}
      />

      {/* Retire confirm dialog */}
      <Dialog
        open={retireTarget !== null}
        onClose={() => setRetireTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Retirer ce MACCS ?</DialogTitle>
        <DialogContent>
          <Typography>
            {retireTarget?.firstname} {retireTarget?.lastname} sera marqué comme retiré et n'aura
            plus accès à cette année académique.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetireTarget(null)} disabled={retireMutation.isPending}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={retireMutation.isPending}
            onClick={() => retireTarget && retireMutation.mutate(retireTarget.yrId)}
          >
            {retireMutation.isPending ? <CircularProgress size={16} /> : "Retirer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add dialog */}
      <AddDialog
        open={addOpen}
        years={years}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addMutation.mutate(data)}
        isPending={addMutation.isPending}
      />

      {/* CSV import dialog */}
      <CsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} />

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Supprimer définitivement ce MACCS ?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <strong>
              {deleteTarget?.firstname} {deleteTarget?.lastname}
            </strong>{" "}
            sera supprimé de toutes les années académiques de cet hôpital. Cette action est{" "}
            <strong>irréversible</strong>.
          </Typography>
          {deleteTarget?.status === "active" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Ce MACCS a un compte actif. La suppression révoquera immédiatement son accès.
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
              deleteTarget?.residentId === null ||
              deleteTarget?.residentId === undefined
            }
            onClick={() =>
              deleteTarget?.residentId !== null &&
              deleteTarget?.residentId !== undefined &&
              deleteMutation.mutate(deleteTarget.residentId)
            }
          >
            {deleteMutation.isPending ? <CircularProgress size={16} /> : "Supprimer définitivement"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalAdminResidentsPage;
