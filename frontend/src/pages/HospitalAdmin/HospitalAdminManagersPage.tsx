import { useState } from "react";
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
import Drawer from "@mui/material/Drawer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { ManagerRow, ManagerStatus, HospitalYear } from "../../services/hospitalAdminApi";

type ChipColor = "success" | "info" | "error" | "default";

const STATUS_LABEL: Record<ManagerStatus, string> = {
  active: "Actif",
  pending: "En attente",
  incomplete: "Incomplet",
};

const STATUS_TOOLTIP: Record<ManagerStatus, string> = {
  active: "Le manager a un compte actif et peut se connecter",
  pending: "Invitation envoyée — le manager n'a pas encore accepté",
  incomplete: "Compte créé mais non activé — le manager n'a pas encore défini son mot de passe",
};

const STATUS_COLOR: Record<ManagerStatus, ChipColor> = {
  active: "success",
  pending: "info",
  incomplete: "error",
};

// ── Actions menu ─────────────────────────────────────────────────────────────

interface ActionsMenuProps {
  row: ManagerRow;
  isPending: boolean;
  onView: () => void;
  onResend: () => void;
  onRemove: () => void;
  onDelete: () => void;
}

const ActionsMenu = ({
  row,
  isPending,
  onView,
  onResend,
  onRemove,
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
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            onRemove();
          }}
          sx={{ color: "error.main" }}
        >
          Retirer de l'année
        </MenuItem>
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

// ── View drawer ──────────────────────────────────────────────────────────────

const ViewDrawer = ({ row, onClose }: { row: ManagerRow | null; onClose: () => void }) => (
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
            Détail Manager
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
              Titre / Fonction
            </Typography>
            <Typography>{row.job || "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Année académique
            </Typography>
            <Typography>{row.yearTitle ?? "—"}</Typography>
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
        </Stack>
      </>
    )}
  </Drawer>
);

// ── Add dialog ───────────────────────────────────────────────────────────────

interface AddDialogProps {
  open: boolean;
  years: HospitalYear[];
  onClose: () => void;
  onSave: (data: { firstname: string; lastname: string; email: string; yearId: number }) => void;
  isPending: boolean;
}

const AddDialog = ({ open, years, onClose, onSave, isPending }: AddDialogProps) => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [yearId, setYearId] = useState<number | "">("");

  const reset = () => {
    setFirstname("");
    setLastname("");
    setEmail("");
    setYearId("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!firstname.trim() || !lastname.trim() || !email.trim() || yearId === "") return;
    onSave({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim().toLowerCase(),
      yearId: yearId as number,
    });
  };

  const valid =
    firstname.trim() !== "" && lastname.trim() !== "" && email.trim() !== "" && yearId !== "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter un manager</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <Box display="flex" gap={2}>
            <TextField
              label="Prénom"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Nom"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              fullWidth
              required
            />
          </Box>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>Année académique</InputLabel>
            <Select
              value={yearId}
              label="Année académique"
              onChange={(e) => setYearId(e.target.value as number)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
            Si le manager n'a pas encore de compte, il recevra un email pour créer son profil. S'il
            a déjà un compte, il recevra une invitation à accepter.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Annuler
        </Button>
        <Button variant="contained" disabled={isPending || !valid} onClick={handleSave}>
          {isPending ? <CircularProgress size={16} /> : "Inviter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const HospitalAdminManagersPage = () => {
  useAxiosPrivate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"current" | "history">("current");
  const [search, setSearch] = useState("");
  const [viewRow, setViewRow] = useState<ManagerRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ManagerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagerRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["hospital-managers", mode],
    queryFn: () => hospitalAdminApi.listManagers(mode),
  });

  const { data: years = [] } = useQuery({
    queryKey: ["hospital-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hospital-managers"] });

  const addMutation = useMutation({
    mutationFn: hospitalAdminApi.addManager,
    onSuccess: () => {
      toast.success("Manager invité.");
      setAddOpen(false);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'ajout."),
    meta: { suppressErrorToast: true },
  });

  const resendMutation = useMutation({
    mutationFn: (myId: number) => hospitalAdminApi.resendManagerInvite(myId),
    onSuccess: () => toast.success("Invitation renvoyée."),
    onError: () => toast.error("Erreur lors du renvoi."),
    meta: { suppressErrorToast: true },
  });

  const removeMutation = useMutation({
    mutationFn: (myId: number) => hospitalAdminApi.removeManagerYear(myId),
    onSuccess: () => {
      toast.success("Manager retiré de l'année.");
      setRemoveTarget(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors du retrait."),
    meta: { suppressErrorToast: true },
  });

  const deleteMutation = useMutation({
    mutationFn: (managerId: number) => hospitalAdminApi.deleteManager(managerId),
    onSuccess: () => {
      toast.success("Manager supprimé définitivement.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("Erreur lors de la suppression."),
    meta: { suppressErrorToast: true },
  });

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (r.firstname ?? "").toLowerCase().includes(q) ||
      (r.lastname ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.yearTitle ?? "").toLowerCase().includes(q)
  );

  const anyPending =
    addMutation.isPending ||
    resendMutation.isPending ||
    removeMutation.isPending ||
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
            Gestion des managers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Responsables de stage rattachés aux années de votre hôpital
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Ajouter un manager
        </Button>
      </Box>

      {/* Filters */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={2}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => {
            if (v) setMode(v);
          }}
          size="small"
        >
          <ToggleButton value="current">Années en cours</ToggleButton>
          <ToggleButton value="history">Historique</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small"
          placeholder="Rechercher par nom, email ou année…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 320 }}
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
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          {rows.length === 0
            ? "Aucun manager pour cette période."
            : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Nom Prénom</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Fonction</strong>
                </TableCell>
                <TableCell>
                  <strong>Année académique</strong>
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
                <TableRow key={row.myId} hover>
                  <TableCell>
                    {row.lastname ?? "—"} {row.firstname ?? ""}
                  </TableCell>
                  <TableCell>{row.email ?? "—"}</TableCell>
                  <TableCell>{row.job || "—"}</TableCell>
                  <TableCell>{row.yearTitle ?? "—"}</TableCell>
                  <TableCell>
                    <Tooltip title={STATUS_TOOLTIP[row.status]} arrow>
                      <Chip
                        label={STATUS_LABEL[row.status]}
                        color={STATUS_COLOR[row.status]}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <ActionsMenu
                      row={row}
                      isPending={anyPending}
                      onView={() => setViewRow(row)}
                      onResend={() => resendMutation.mutate(row.myId)}
                      onRemove={() => setRemoveTarget(row)}
                      onDelete={() => setDeleteTarget(row)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ViewDrawer row={viewRow} onClose={() => setViewRow(null)} />

      {/* Add dialog */}
      <AddDialog
        open={addOpen}
        years={years}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addMutation.mutate(data)}
        isPending={addMutation.isPending}
      />

      {/* Remove from year confirm */}
      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Retirer ce manager de l'année ?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>
              {removeTarget?.firstname} {removeTarget?.lastname}
            </strong>{" "}
            sera retiré de l'année <strong>{removeTarget?.yearTitle}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)} disabled={removeMutation.isPending}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={removeMutation.isPending}
            onClick={() => removeTarget && removeMutation.mutate(removeTarget.myId)}
          >
            {removeMutation.isPending ? <CircularProgress size={16} /> : "Retirer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Supprimer définitivement ce manager ?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <strong>
              {deleteTarget?.firstname} {deleteTarget?.lastname}
            </strong>{" "}
            sera supprimé de toutes les années de cet hôpital. Cette action est{" "}
            <strong>irréversible</strong>.
          </Typography>
          {deleteTarget?.status === "active" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Ce manager a un compte actif. La suppression révoquera son accès.
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
              deleteTarget?.managerId === null ||
              deleteTarget?.managerId === undefined
            }
            onClick={() =>
              deleteTarget?.managerId !== null &&
              deleteTarget?.managerId !== undefined &&
              deleteMutation.mutate(deleteTarget.managerId)
            }
          >
            {deleteMutation.isPending ? <CircularProgress size={16} /> : "Supprimer définitivement"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalAdminManagersPage;
