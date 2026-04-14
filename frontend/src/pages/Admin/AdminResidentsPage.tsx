import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
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
import type { AdminResident } from "../../types/entities";

// ── Actions menu ──────────────────────────────────────────────────────────────

interface ResidentActionsMenuProps {
  resident: AdminResident;
  onActivate: () => void;
  onResetPassword: () => void;
  isPending: boolean;
}

const ResidentActionsMenu = ({
  resident,
  onActivate,
  onResetPassword,
  isPending,
}: ResidentActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={isPending}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {resident.validatedAt === null && (
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
            onResetPassword();
          }}
        >
          Réinitialiser le mot de passe
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AdminResidentsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["admin-residents"],
    queryFn: adminApi.listResidents,
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminApi.activateResident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-residents"] });
      toast.success("Compte activé manuellement");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'activation"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (resident: AdminResident) => adminApi.resetResidentPassword(resident.id),
    onSuccess: (_data, resident) =>
      toast.success(`Email de réinitialisation envoyé à ${resident.email}`),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi de l'email"),
  });

  const [search, setSearch] = useState("");

  const isPending = activateMutation.isPending || resetPasswordMutation.isPending;

  const q = search.toLowerCase();
  const filtered = residents
    .filter(
      (r: AdminResident) =>
        r.firstname.toLowerCase().includes(q) ||
        r.lastname.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.validatedAt !== null ? "actif" : "en attente").includes(q)
    )
    .sort((a: AdminResident, b: AdminResident) =>
      a.lastname.localeCompare(b.lastname, "fr", { sensitivity: "base" })
    );

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          MACCS
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Médecins en formation clinique et scientifique
        </Typography>
      </Box>

      {isLoading && <CircularProgress size={24} />}

      {!isLoading && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
            <Typography variant="h6" fontWeight={600}>
              Résidents ({filtered.length}
              {search ? `/${residents.length}` : ""})
            </Typography>
            <TextField
              size="small"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 300 }}
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
              {residents.length === 0
                ? "Aucun résident enregistré."
                : "Aucun résultat pour cette recherche."}
            </Alert>
          ) : (
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
                    <TableCell align="right">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((r: AdminResident) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        {r.lastname} {r.firstname}
                      </TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.validatedAt !== null ? "Actif" : "En attente"}
                          color={r.validatedAt !== null ? "success" : "info"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <ResidentActionsMenu
                          resident={r}
                          onActivate={() => activateMutation.mutate(r.id)}
                          onResetPassword={() => resetPasswordMutation.mutate(r)}
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
    </Box>
  );
};

export default AdminResidentsPage;
