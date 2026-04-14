import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
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
import type { AdminHospitalAdmin } from "../../types/entities";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  invited: "Invité",
};

type ChipColor = "success" | "info";
const STATUS_COLOR: Record<string, ChipColor> = {
  active: "success",
  invited: "info",
};

const TYPE_LABEL: Record<string, string> = {
  invited: "Invitation",
  promoted: "Promu",
};

// ── Actions menu ──────────────────────────────────────────────────────────────

interface ActionsMenuProps {
  admin: AdminHospitalAdmin;
  onReinvite: () => void;
  onDelete: () => void;
  isPending: boolean;
}

const ActionsMenu = ({ admin, onReinvite, onDelete, isPending }: ActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={isPending}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {admin.type === "invited" && admin.status === "invited" && (
          <MenuItem onClick={() => { setAnchor(null); onReinvite(); }}>
            Renvoyer l'invitation
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => { setAnchor(null); onDelete(); }} sx={{ color: "error.main" }}>
          {admin.type === "promoted" ? "Révoquer" : "Supprimer le compte"}
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AdminHospitalAdminsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admin-hospital-admins"],
    queryFn: adminApi.listHospitalAdmins,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteHospitalAdmin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-admins"] });
      setDeleteTarget(null);
      toast.success("Compte supprimé.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la suppression"),
  });

  const reinviteMutation = useMutation({
    mutationFn: (id: number) => adminApi.reinviteHospitalAdmin(id),
    onSuccess: () => toast.success("Invitation renvoyée."),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi"),
  });

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminHospitalAdmin | null>(null);

  const q = search.toLowerCase();
  const filtered = admins.filter(
    (a: AdminHospitalAdmin) =>
      (a.firstname ?? "").toLowerCase().includes(q) ||
      (a.lastname ?? "").toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.hospital.name.toLowerCase().includes(q)
  );

  const isPending = deleteMutation.isPending || reinviteMutation.isPending;

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Admins hôpitaux
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comptes responsables d'hôpital
        </Typography>
      </Box>

      {isLoading && <CircularProgress size={24} />}

      {!isLoading && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
            <Typography variant="h6" fontWeight={600}>
              Comptes ({filtered.length}{search ? `/${admins.length}` : ""})
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

          {filtered.length === 0 ? (
            <Alert severity="info">
              {admins.length === 0
                ? "Aucun admin hôpital enregistré."
                : "Aucun résultat pour cette recherche."}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nom</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Hôpital</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Statut</strong></TableCell>
                    <TableCell><strong>Créé le</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((admin: AdminHospitalAdmin) => (
                    <TableRow key={admin.id} hover>
                      <TableCell>
                        {admin.firstname || admin.lastname
                          ? `${admin.firstname ?? ""} ${admin.lastname ?? ""}`.trim()
                          : <Typography variant="body2" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.hospital.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={TYPE_LABEL[admin.type] ?? admin.type}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABEL[admin.status] ?? admin.status}
                          color={STATUS_COLOR[admin.status] ?? "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(admin.createdAt).toLocaleDateString("fr-BE")}
                      </TableCell>
                      <TableCell align="right">
                        <ActionsMenu
                          admin={admin}
                          onReinvite={() => reinviteMutation.mutate(admin.id)}
                          onDelete={() => setDeleteTarget(admin)}
                          isPending={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Delete confirmation */}
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
            <strong>{deleteTarget?.email}</strong> ? Cette action est irréversible.
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

export default AdminHospitalAdminsPage;
