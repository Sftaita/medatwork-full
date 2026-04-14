import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
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
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import adminApi from "../../services/adminApi";
import type { AdminManager } from "../../types/entities";

// ── Status chip helpers ───────────────────────────────────────────────────────

type ChipColor = "success" | "default" | "warning" | "error" | "info";

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  pending_hospital: "En attente",
};

const STATUS_COLOR: Record<string, ChipColor> = {
  active: "success",
  inactive: "default",
  pending_hospital: "info",
};

// validatedAt=null → profile not yet completed
const chipLabel = (manager: AdminManager): string =>
  manager.validatedAt === null ? "Non activé" : (STATUS_LABEL[manager.status] ?? manager.status);

const chipColor = (manager: AdminManager): ChipColor =>
  manager.validatedAt === null ? "error" : (STATUS_COLOR[manager.status] ?? "default");

// ── Actions menu ──────────────────────────────────────────────────────────────

interface ManagerActionsMenuProps {
  manager: AdminManager;
  onToggle: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onActivate: () => void;
  isPending: boolean;
}

const ManagerActionsMenu = ({
  manager,
  onToggle,
  onResetPassword,
  onDelete,
  onActivate,
  isPending,
}: ManagerActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={isPending}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {manager.validatedAt === null && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onActivate();
            }}
            sx={{ color: "success.main", fontWeight: 600 }}
          >
            Activer manuellement
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onToggle();
          }}
          disabled={manager.status === "pending_hospital" || manager.validatedAt === null}
        >
          Activer / Désactiver
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onResetPassword();
          }}
        >
          Réinitialiser le mot de passe
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDelete();
          }}
          sx={{ color: "error.main" }}
        >
          Supprimer le compte
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AdminManagersPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-manager-stats"],
    queryFn: adminApi.getManagerStats,
  });

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["admin-managers"],
    queryFn: adminApi.listManagers,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleManagerStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-managers"] });
      qc.invalidateQueries({ queryKey: ["admin-manager-stats"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la mise à jour du statut"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (manager: AdminManager) => adminApi.resetManagerPassword(manager.id),
    onSuccess: (_data, manager) =>
      toast.success(`Email de réinitialisation envoyé à ${manager.email}`),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi de l'email"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteManager(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-managers"] });
      qc.invalidateQueries({ queryKey: ["admin-manager-stats"] });
      setDeleteTarget(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la suppression"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminApi.activateManager(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-managers"] });
      qc.invalidateQueries({ queryKey: ["admin-manager-stats"] });
      toast.success("Compte activé manuellement");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'activation"),
  });

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminManager | null>(null);

  const q = search.toLowerCase();
  const filtered = managers
    .filter(
      (m: AdminManager) =>
        m.firstname.toLowerCase().includes(q) ||
        m.lastname.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        chipLabel(m).toLowerCase().includes(q) ||
        m.hospitals.some((h) => h.name.toLowerCase().includes(q))
    )
    .sort((a: AdminManager, b: AdminManager) =>
      a.lastname.localeCompare(b.lastname, "fr", { sensitivity: "base" })
    );

  const isPending =
    toggleMutation.isPending ||
    resetPasswordMutation.isPending ||
    deleteMutation.isPending ||
    activateMutation.isPending;

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Gestion des managers
        </Typography>
      </Box>

      {/* Stats */}
      {loadingStats && <CircularProgress size={24} sx={{ mb: 3 }} />}
      {stats && (
        <Grid container spacing={2} mb={4}>
          {(
            [
              { label: "Total", value: stats.total },
              { label: "Actifs", value: stats.active },
              { label: "Inactifs", value: stats.inactive },
              { label: "Non activés", value: stats.notActivated },
              { label: "En attente", value: stats.pending },
            ] as const
          ).map(({ label, value }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h4" fontWeight={700} textAlign="center">
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Search */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Typography variant="h6" fontWeight={600}>
          Managers ({filtered.length}
          {search ? `/${managers.length}` : ""})
        </Typography>
        <TextField
          size="small"
          placeholder="Rechercher par nom, email, hôpital…"
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

      {loadingManagers && <CircularProgress size={24} />}

      {!loadingManagers && filtered.length === 0 && (
        <Alert severity="info">
          {managers.length === 0
            ? "Aucun manager enregistré."
            : "Aucun résultat pour cette recherche."}
        </Alert>
      )}

      {!loadingManagers && filtered.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Nom</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Statut</strong>
                </TableCell>
                <TableCell>
                  <strong>Hôpitaux</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((manager: AdminManager) => (
                <TableRow key={manager.id} hover>
                  <TableCell>
                    {manager.lastname} {manager.firstname}
                  </TableCell>
                  <TableCell>{manager.email}</TableCell>
                  <TableCell>
                    <Chip label={chipLabel(manager)} color={chipColor(manager)} size="small" />
                  </TableCell>
                  <TableCell>
                    {manager.hospitals.length > 0
                      ? manager.hospitals.map((h) => h.name).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <ManagerActionsMenu
                      manager={manager}
                      onToggle={() => toggleMutation.mutate(manager.id)}
                      onResetPassword={() => resetPasswordMutation.mutate(manager)}
                      onDelete={() => setDeleteTarget(manager)}
                      onActivate={() => activateMutation.mutate(manager.id)}
                      isPending={isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Supprimer le compte</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le compte de{" "}
            <strong>
              {deleteTarget?.lastname} {deleteTarget?.firstname}
            </strong>
            ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagersPage;
