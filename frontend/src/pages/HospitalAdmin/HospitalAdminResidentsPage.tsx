import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTopbarSearch } from "../../hooks/useTopbarSearch";
import YearSelect from "../../components/YearSelect";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { T, C, statusBadgeSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Skeleton from "@mui/material/Skeleton";
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

type ChipColor = "success" | "warning" | "error" | "default" | "info" | "primary";
type TFn = (key: string, opts?: any) => string;

const getResStatusLabel   = (s: MaccsStatus, t: TFn) => t(`haRes.status.${s}`);
const getResStatusTooltip = (s: MaccsStatus, t: TFn) => t(`haRes.statusTooltip.${s}`);

const STATUS_COLOR: Record<MaccsStatus, ChipColor> = {
  active:         "success",
  pending:        "warning",
  not_registered: "error",
  retired:        "default",
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
  const { t } = useTranslation();
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
          {t("haRes.menu.viewDetail")}
        </MenuItem>
        {row.status !== "retired" && (
          <MenuItem onClick={() => { close(); onEdit(); }}>
            {t("haRes.menu.editOptingOut")}
          </MenuItem>
        )}
        <Divider />
        {row.status === "pending" && (
          <MenuItem onClick={() => { close(); onResend(); }}>
            {t("haRes.menu.resendInvite")}
          </MenuItem>
        )}
        {row.status !== "retired" && (
          <MenuItem onClick={() => { close(); onChangeYear(); }}>
            {t("haRes.menu.changeYear")}
          </MenuItem>
        )}
        {row.status !== "retired" && (
          <MenuItem onClick={() => { close(); onRetire(); }} sx={{ color: "error.main" }}>
            {t("haRes.menu.retire")}
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => { close(); onDelete(); }} sx={{ color: "error.main", fontWeight: 600 }}>
          {t("haRes.menu.deletePermanently")}
        </MenuItem>
      </Menu>
    </>
  );
};

// ── View drawer ───────────────────────────────────────────────────────────────

const ViewDrawer = ({ row, onClose }: { row: MaccsRow | null; onClose: () => void }) => {
  const { t } = useTranslation();
  return (
  <Drawer
    anchor="right"
    open={row !== null}
    onClose={onClose}
    PaperProps={{ sx: { width: 360, p: 3 } }}
  >
    {row && (
      <>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar
              src={row.avatarUrl ?? undefined}
              alt={`${row.firstname ?? ""} ${row.lastname ?? ""}`}
              sx={{ width: 44, height: 44 }}
            >
              {!row.avatarUrl && (row.firstname?.[0] ?? "?").toUpperCase()}
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              {t("haRes.drawer.title")}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.fullName")}</Typography>
            <Typography>{row.firstname} {row.lastname}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.email")}</Typography>
            <Typography>{row.email ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.academicYear")}</Typography>
            <Typography>{row.yearTitle ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.optingOut")}</Typography>
            <Box mt={0.5}>
              {row.optingOut ? (
                <Chip label={t("haRes.drawer.optingOutYes")} size="small" color="primary" variant="outlined" />
              ) : (
                <Typography variant="body2">{t("haRes.drawer.optingOutNo")}</Typography>
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.status")}</Typography>
            <Box mt={0.5}>
              <Tooltip title={getResStatusTooltip(row.status, t)} arrow>
                <Chip label={getResStatusLabel(row.status, t)} color={STATUS_COLOR[row.status]} variant="outlined" size="small" />
              </Tooltip>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t("haRes.drawer.addedOn")}</Typography>
            <Typography>{new Date(row.createdAt).toLocaleDateString("fr-BE")}</Typography>
          </Box>
        </Stack>
      </>
    )}
  </Drawer>
  );
};

// ── Edit dialog (optingOut) ───────────────────────────────────────────────────

interface EditDialogProps {
  row: MaccsRow | null;
  onClose: () => void;
  onSave: (yrId: number, optingOut: boolean) => void;
  isPending: boolean;
}

const EditDialog = ({ row, onClose, onSave, isPending }: EditDialogProps) => {
  const { t } = useTranslation();
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
      <DialogTitle>{t("haRes.editDialog.title", { name: `${row.firstname} ${row.lastname}` })}</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={<Switch checked={optingOut} onChange={(e) => setOptingOut(e.target.checked)} />}
          label={t("haRes.editDialog.optingOut")}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>{t("haRes.editDialog.cancel")}</Button>
        <Button variant="contained" disabled={isPending} onClick={() => onSave(row.yrId, optingOut)}>
          {isPending ? <CircularProgress size={16} /> : t("haRes.editDialog.save")}
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
  const { t } = useTranslation();
  const [newYearId, setNewYearId] = useState<number | "">("");

  if (!row) return null;

  const availableYears = years.filter((y) => y.id !== row.yearId);

  return (
    <Dialog open={row !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("haRes.changeYearDialog.title", { name: `${row.firstname} ${row.lastname}` })}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>{t("haRes.changeYearDialog.newYear")}</InputLabel>
          <Select
            value={newYearId}
            label={t("haRes.changeYearDialog.newYear")}
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
        <Button onClick={onClose} disabled={isPending}>{t("haRes.changeYearDialog.cancel")}</Button>
        <Button variant="contained" disabled={isPending || newYearId === ""}
          onClick={() => newYearId !== "" && onSave(row.yrId, newYearId)}>
          {isPending ? <CircularProgress size={16} /> : t("haRes.changeYearDialog.move")}
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
  const { t } = useTranslation();
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
      <DialogTitle>{t("haRes.addDialog.title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>{t("haRes.addDialog.info")}</Alert>
          <TextField
            label={t("haRes.addDialog.firstname")}
            value={form.firstname}
            onChange={(e) => set("firstname", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label={t("haRes.addDialog.lastname")}
            value={form.lastname}
            onChange={(e) => set("lastname", e.target.value)}
            fullWidth
            required
          />
          <TextField
            label={t("haRes.addDialog.email")}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>{t("haRes.addDialog.year")}</InputLabel>
            <Select
              value={form.yearId}
              label={t("haRes.addDialog.year")}
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
            label={t("haRes.addDialog.optingOut")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>{t("haRes.addDialog.cancel")}</Button>
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
          {isPending ? <CircularProgress size={16} /> : t("haRes.addDialog.add")}
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
  const { t } = useTranslation();
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
      toast.error(t("haRes.csv.errorAnalysis"));
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
      toast.success(t("haRes.csv.success"));
    } catch {
      toast.error(t("haRes.csv.errorImport"));
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
      <DialogTitle>{t("haRes.csv.title")}</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
            {t("haRes.csv.formatInfo")}
          </Alert>

          {!confirmed && (
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => inputRef.current?.click()}
              >
                {file ? file.name : t("haRes.csv.chooseFile")}
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
                  {loading ? <CircularProgress size={16} /> : t("haRes.csv.analyze")}
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
                      {t("haRes.csv.exportErrors")}
                    </Button>
                  }
                >
                  <Typography variant="body2" fontWeight={600} mb={0.5}>
                    {t("haRes.csv.errorsCount", { count: preview.errors.length })}
                  </Typography>
                  {preview.errors.slice(0, 5).map((e, i) => (
                    <Typography key={i} variant="caption" display="block">
                      {t("haRes.csv.linePrefix")} {e.line}
                      {e.email ? ` (${e.email})` : ""} — {e.reason}
                    </Typography>
                  ))}
                  {preview.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      {t("haRes.csv.moreErrors", { count: preview.errors.length - 5 })}
                    </Typography>
                  )}
                </Alert>
              )}

              <Typography variant="body2" mb={1}>
                <strong>{preview.created.length}</strong> {t("haRes.csv.toCreate")},{" "}
                <strong>{preview.attached.length}</strong> {t("haRes.csv.toAttach")}.
              </Typography>

              {[
                { title: t("haRes.csv.sectionCreate"), items: preview.created },
                { title: t("haRes.csv.sectionAttach"), items: preview.attached },
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

          {confirmed && <Alert severity="success">{t("haRes.csv.success")}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{confirmed ? t("haRes.csv.close") : t("haRes.csv.cancel")}</Button>
        {preview && !confirmed && (
          <Button variant="contained" onClick={handleConfirm}
            disabled={loading || preview.created.length + preview.attached.length === 0}>
            {loading ? <CircularProgress size={16} /> : t("haRes.csv.confirm")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminResidentsPage = () => {
  const { t } = useTranslation();
  useAxiosPrivate();
  const queryClient = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const [mode, setMode] = useState<"current" | "history">("current");
  const search = useTopbarSearch(t("haRes.colName") + ", email…");
  const [statusFilter, setStatusFilter] = useState<MaccsStatus | "">("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [sortCol, setSortCol] = useState<"nom" | "email" | "annee" | "optingout" | "statut" | null>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
    onSuccess: () => { toast.success(t("haRes.toast.edited")); setEditRow(null); invalidate(); },
    onError: () => toast.error(t("haRes.toast.editError")),
    meta: { suppressErrorToast: true },
  });

  const retireMutation = useMutation({
    mutationFn: (yrId: number) => hospitalAdminApi.retireResident(yrId),
    onSuccess: () => { toast.success(t("haRes.toast.retired")); setRetireTarget(null); invalidate(); },
    onError: () => toast.error(t("haRes.toast.retireError")),
    meta: { suppressErrorToast: true },
  });

  const changeYearMutation = useMutation({
    mutationFn: ({ yrId, newYearId }: { yrId: number; newYearId: number }) =>
      hospitalAdminApi.changeResidentYear(yrId, newYearId),
    onSuccess: () => { toast.success(t("haRes.toast.yearChanged")); setChangeYearRow(null); invalidate(); },
    onError: () => toast.error(t("haRes.toast.yearChangeError")),
    meta: { suppressErrorToast: true },
  });

  const addMutation = useMutation({
    mutationFn: hospitalAdminApi.addResident,
    onSuccess: () => { toast.success(t("haRes.toast.added")); setAddOpen(false); invalidate(); },
    onError: () => toast.error(t("haRes.toast.addError")),
    meta: { suppressErrorToast: true },
  });

  const resendMutation = useMutation({
    mutationFn: (yrId: number) => hospitalAdminApi.resendResidentInvite(yrId),
    onSuccess: () => toast.success(t("haRes.toast.resent")),
    onError: () => toast.error(t("haRes.toast.resendError")),
    meta: { suppressErrorToast: true },
  });

  const deleteMutation = useMutation({
    mutationFn: (residentId: number) => hospitalAdminApi.deleteResident(residentId),
    onSuccess: () => { toast.success(t("haRes.toast.deleted")); setDeleteTarget(null); invalidate(); },
    onError: () => toast.error(t("haRes.toast.deleteError")),
    meta: { suppressErrorToast: true },
  });

  const bulkEditMutation = useMutation({
    mutationFn: ({ yrIds, changes }: { yrIds: number[]; changes: { optingOut?: boolean } }) =>
      hospitalAdminApi.bulkEditResidents(yrIds, changes),
    onSuccess: (data) => { toast.success(t("haRes.toast.bulkEdited", { count: data.updated })); setSelected([]); invalidate(); },
    onError: () => toast.error(t("haRes.toast.bulkEditError")),
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
      toast.error(t("haRes.toast.exportError"));
    }
  };

  // ── Sort handler ───────────────────────────────────────────────────────────
  type SortCol = "nom" | "email" | "annee" | "optingout" | "statut";
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // Stable sx — density changes rarely, avoid Emotion re-serialize on every row
  const rowSx = useMemo(() => bodyRowSx(density), [density]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (yearFilter !== "" && r.yearId !== yearFilter) return false;
      return (
        (r.firstname ?? "").toLowerCase().includes(q) ||
        (r.lastname ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.yearTitle ?? "").toLowerCase().includes(q)
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
        case "annee":
          cmp = (a.yearTitle ?? "").localeCompare(b.yearTitle ?? "", "fr", { sensitivity: "base" });
          break;
        case "optingout":
          cmp = Number(a.optingOut) - Number(b.optingOut);
          break;
        case "statut":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        default:
          cmp = (a.lastname ?? "").localeCompare(b.lastname ?? "", "fr", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, q, statusFilter, yearFilter, sortCol, sortDir]);

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
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>{t("haRes.title")}</Typography>
          <Typography sx={T.pageSub}>{t("haRes.subtitle")}</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setCsvOpen(true)}
            sx={{ borderRadius: "8px", height: 36, fontSize: 13 }}
          >
            {t("haRes.importCsv")}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ bgcolor: C.brand600, "&:hover": { bgcolor: C.brand700 }, borderRadius: "8px", height: 36, fontSize: 13 }}
          >
            {t("haRes.addMaccs")}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ ...T.toolbar, mb: 2 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) { setMode(v); setSelected([]); } }}
          size="small"
        >
          <ToggleButton value="current">{t("haRes.tabCurrent")}</ToggleButton>
          <ToggleButton value="history">{t("haRes.tabHistory")}</ToggleButton>
        </ToggleButtonGroup>


        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t("haRes.filterStatus")}</InputLabel>
          <Select
            value={statusFilter}
            label={t("haRes.filterStatus")}
            onChange={(e) => setStatusFilter(e.target.value as MaccsStatus | "")}
          >
            <MenuItem value="">{t("haRes.filterAll")}</MenuItem>
            <MenuItem value="active">{t("haRes.status.active")}</MenuItem>
            <MenuItem value="pending">{t("haRes.status.pending")}</MenuItem>
            <MenuItem value="not_registered">{t("haRes.status.not_registered")}</MenuItem>
            <MenuItem value="retired">{t("haRes.status.retired")}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ minWidth: 200 }}>
          <YearSelect
            years={years}
            value={yearFilter}
            onChange={setYearFilter}
            label={t("haRes.filterYear")}
          />
        </Box>

        <Box flex={1} />

        {selected.length > 0 && (
          <Box display="flex" gap={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">{t("haRes.selectedCount", { count: selected.length })}</Typography>
            <Button size="small" variant="outlined"
              onClick={() => bulkEditMutation.mutate({ yrIds: selected, changes: { optingOut: true } })}
              disabled={bulkEditMutation.isPending}>
              {t("haRes.optingOutOn")}
            </Button>
            <Button size="small" variant="outlined"
              onClick={() => bulkEditMutation.mutate({ yrIds: selected, changes: { optingOut: false } })}
              disabled={bulkEditMutation.isPending}>
              {t("haRes.optingOutOff")}
            </Button>
          </Box>
        )}

        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
          {t("haRes.exportCsv")}
        </Button>
        <DensityToggleButton density={density} onCycle={cycleDensity} />
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <TableCell padding="checkbox" sx={{ pl: "18px !important" }}><Skeleton width={16} height={16} /></TableCell>
                  {[t("haRes.colName"), t("haRes.colEmail"), t("haRes.colYear"), t("haRes.colOptingOut"), t("haRes.colStatus")].map((h) => (
                    <TableCell key={h}><Skeleton width={80} /></TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(8)].map((_, i) => (
                  <TableRow key={i} sx={{ height: 60 }}>
                    <TableCell padding="checkbox" sx={{ pl: "18px !important" }}>
                      <Skeleton variant="rectangular" width={16} height={16} sx={{ borderRadius: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={T.person}>
                        <Skeleton variant="circular" width={34} height={34} />
                        <Box>
                          <Skeleton width={120} height={14} />
                          <Skeleton width={160} height={12} sx={{ mt: 0.5 }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton width={150} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={40} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 999 }} /></TableCell>
                    <TableCell><Skeleton width={24} height={24} variant="circular" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          {rows.length === 0 ? t("haRes.noMaccs") : t("haRes.noResults")}
        </Alert>
      ) : (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <TableCell padding="checkbox" sx={{ pl: "18px !important" }}>
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={selected.length > 0 && !allSelected}
                      onChange={toggleAll}
                      sx={{ color: C.ink4 }}
                    />
                  </TableCell>
                  {(
                    [
                      { col: "nom",       label: t("haRes.colName") },
                      { col: "email",     label: t("haRes.colEmail") },
                      { col: "annee",     label: t("haRes.colYear") },
                      { col: "optingout", label: t("haRes.colOptingOut"), width: 110 },
                      { col: "statut",    label: t("haRes.colStatus"),    width: 120 },
                    ] as { col: SortCol; label: string; width?: number }[]
                  ).map(({ col, label, width }) => (
                    <TableCell
                      key={col}
                      onClick={() => handleSort(col)}
                      sx={{ width, cursor: "pointer", "&:hover": { color: C.ink } }}
                    >
                      <Box display="inline-flex" alignItems="center" gap="4px">
                        {label}
                        {sortCol === col
                          ? sortDir === "asc"
                            ? <ArrowUpwardIcon sx={{ fontSize: 11 }} />
                            : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                          : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                        }
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => {
                  const initials = ((row.firstname?.[0] ?? "") + (row.lastname?.[0] ?? "")).toUpperCase() || "?";
                  const badgeVariant =
                    row.status === "active"  ? "active"  :
                    row.status === "pending" ? "pending" : "default";
                  return (
                    <TableRow
                      key={row.yrId}
                      sx={{ ...rowSx, ...(selected.includes(row.yrId) ? { bgcolor: `${C.brand50} !important` } : {}) }}
                      selected={selected.includes(row.yrId)}
                      onClick={() => toggleOne(row.yrId)}
                    >
                      <TableCell padding="checkbox" sx={{ pl: "18px !important" }}>
                        <Checkbox
                          size="small"
                          checked={selected.includes(row.yrId)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleOne(row.yrId)}
                          sx={{ color: C.ink4 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={T.person}>
                          <Avatar
                            src={row.avatarUrl ?? undefined}
                            alt={`${row.firstname ?? ""} ${row.lastname ?? ""}`}
                            sx={T.avatar}
                          >
                            {!row.avatarUrl && initials}
                          </Avatar>
                          <Box>
                            <Box sx={T.name}>{row.lastname ?? "—"} {row.firstname ?? ""}</Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: C.ink2 }}>{row.email ?? "—"}</TableCell>
                      <TableCell sx={{ color: C.ink2 }}>{row.yearTitle ?? "—"}</TableCell>
                      <TableCell>
                        {row.optingOut ? (
                          <Box component="span" sx={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            px: "10px", py: "3px", borderRadius: "999px", fontSize: 11, fontWeight: 600,
                            bgcolor: "#fdf3d8", color: C.warn,
                          }}>
                            {t("haRes.optingOutYes")}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 13, color: C.ink4 }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={getResStatusTooltip(row.status, t)} arrow>
                          <Box component="span" sx={statusBadgeSx(badgeVariant)}>
                            {getResStatusLabel(row.status, t)}
                          </Box>
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
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Footer */}
          <Box sx={T.footer}>
            <Typography variant="caption">
              {t("haRes.footerCount", { filtered: filtered.length, total: rows.length })}
            </Typography>
          </Box>
        </Box>
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
        <DialogTitle>{t("haRes.retireDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("haRes.retireDialog.body", { name: `${retireTarget?.firstname} ${retireTarget?.lastname}` })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetireTarget(null)} disabled={retireMutation.isPending}>
            {t("haRes.retireDialog.cancel")}
          </Button>
          <Button color="error" variant="contained" disabled={retireMutation.isPending}
            onClick={() => retireTarget && retireMutation.mutate(retireTarget.yrId)}>
            {retireMutation.isPending ? <CircularProgress size={16} /> : t("haRes.retireDialog.retire")}
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
        <DialogTitle>{t("haRes.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t("haRes.deleteDialog.body", { name: `${deleteTarget?.firstname} ${deleteTarget?.lastname}` })}
          </Typography>
          {deleteTarget?.status === "active" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t("haRes.deleteDialog.activeWarning")}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            {t("haRes.deleteDialog.cancel")}
          </Button>
          <Button color="error" variant="contained"
            disabled={deleteMutation.isPending || deleteTarget?.residentId === null || deleteTarget?.residentId === undefined}
            onClick={() => deleteTarget?.residentId !== null && deleteTarget?.residentId !== undefined && deleteMutation.mutate(deleteTarget.residentId)}>
            {deleteMutation.isPending ? <CircularProgress size={16} /> : t("haRes.deleteDialog.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalAdminResidentsPage;
