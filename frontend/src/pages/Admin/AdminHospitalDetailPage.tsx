import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import adminApi from "../../services/adminApi";
import type { HospitalYear, AdminManager } from "../../types/entities";

// ── Status helpers ────────────────────────────────────────────────────────────

const ADMIN_TYPE_LABEL: Record<string, string> = { invited: "Invité externe", promoted: "Manager promu" };
const ADMIN_STATUS_LABEL: Record<string, string> = { active: "Actif", invited: "En attente" };
type ChipColor = "success" | "info" | "default";
const ADMIN_STATUS_COLOR: Record<string, ChipColor> = { active: "success", invited: "info" };

const MANAGER_STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  pending_hospital: "En attente",
};
const MANAGER_STATUS_COLOR: Record<string, ChipColor> = {
  active: "success",
  inactive: "default",
  pending_hospital: "info",
};

type HospitalAdminRow = {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  status: string;
  createdAt: string;
  type: "invited" | "promoted";
};

// ── Admin actions menu ────────────────────────────────────────────────────────

interface AdminActionsMenuProps {
  admin: HospitalAdminRow;
  onReinvite: () => void;
  onDelete: () => void;
  onUnpromote: () => void;
  isPending: boolean;
}

const AdminActionsMenu = ({ admin, onReinvite, onDelete, onUnpromote, isPending }: AdminActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={isPending}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {admin.type === "invited" && admin.status === "invited" && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onReinvite();
            }}
          >
            Renvoyer l'invitation
          </MenuItem>
        )}
        {admin.type === "invited" && <Divider />}
        {admin.type === "invited" ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onDelete();
            }}
            sx={{ color: "error.main" }}
          >
            Supprimer le compte
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onUnpromote();
            }}
            sx={{ color: "error.main" }}
          >
            Retirer la promotion
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AdminHospitalDetailPage = () => {
  useAxiosPrivate();
  const { id } = useParams<{ id: string }>();
  const hospitalId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState(0);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ["admin-hospital", hospitalId],
    queryFn: () => adminApi.getHospital(hospitalId),
    enabled: !isNaN(hospitalId),
  });

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ["admin-hospital-admins-detail", hospitalId],
    queryFn: () => adminApi.listHospitalAdminsForHospital(hospitalId),
    enabled: !isNaN(hospitalId),
  });

  const { data: years = [], isLoading: loadingYears } = useQuery({
    queryKey: ["admin-hospital-years", hospitalId],
    queryFn: () => adminApi.listHospitalYears(hospitalId),
    enabled: !isNaN(hospitalId),
  });

  const { data: hospitalManagers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["admin-hospital-managers", hospitalId],
    queryFn: () => adminApi.listHospitalManagers(hospitalId),
    enabled: !isNaN(hospitalId),
  });

  // Fetch all managers lazily (only when a dialog that needs them is open)
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [addManagerOpen, setAddManagerOpen] = useState(false);

  const { data: allManagers = [] } = useQuery({
    queryKey: ["admin-managers-list"],
    queryFn: adminApi.listManagers,
    enabled: promoteOpen || addManagerOpen,
  });

  // ── Admin mutations ───────────────────────────────────────────────────────────

  const [adminSearch, setAdminSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HospitalAdminRow | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () => adminApi.inviteHospitalAdmin(hospitalId, inviteEmail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-admins-detail", hospitalId] });
      toast.success("Invitation envoyée.");
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'invitation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (adminId: number) => adminApi.deleteHospitalAdmin(adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-admins-detail", hospitalId] });
      setDeleteTarget(null);
      toast.success("Compte supprimé.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la suppression"),
  });

  const [unpromoteConfirmTarget, setUnpromoteConfirmTarget] = useState<HospitalAdminRow | null>(null);

  const unpromoteMutation = useMutation({
    mutationFn: (managerId: number) => adminApi.unpromoteManager(hospitalId, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-admins-detail", hospitalId] });
      setUnpromoteConfirmTarget(null);
      toast.success("Promotion retirée.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'opération"),
  });

  const reinviteMutation = useMutation({
    mutationFn: (adminId: number) => adminApi.reinviteHospitalAdmin(adminId),
    onSuccess: () => toast.success("Invitation renvoyée."),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi"),
  });

  // ── Promote manager → HospitalAdmin ──────────────────────────────────────────

  const [promoteSearch, setPromoteSearch] = useState("");
  const [promoteTarget, setPromoteTarget] = useState<AdminManager | null>(null);

  const promoteMutation = useMutation({
    mutationFn: (managerId: number) => adminApi.promoteManagerToAdmin(hospitalId, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-admins-detail", hospitalId] });
      toast.success("Manager promu administrateur hôpital.");
      setPromoteOpen(false);
      setPromoteTarget(null);
      setPromoteSearch("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la promotion"),
  });

  // ── Manager ↔ hospital association ───────────────────────────────────────────

  const [managerSearch, setManagerSearch] = useState("");
  const [addManagerSearch, setAddManagerSearch] = useState("");
  const [removeManagerTarget, setRemoveManagerTarget] = useState<AdminManager | null>(null);

  const addManagerMutation = useMutation({
    mutationFn: (managerId: number) => adminApi.addManagerToHospital(hospitalId, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-managers", hospitalId] });
      toast.success("Manager associé à l'hôpital.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur"),
  });

  const removeManagerMutation = useMutation({
    mutationFn: (managerId: number) => adminApi.removeManagerFromHospital(hospitalId, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-managers", hospitalId] });
      setRemoveManagerTarget(null);
      toast.success("Manager retiré de l'hôpital.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur"),
  });

  // ── Year mutations ────────────────────────────────────────────────────────────

  const [yearOpen, setYearOpen] = useState(false);
  const [yearForm, setYearForm] = useState({
    title: "",
    dateOfStart: "",
    dateOfEnd: "",
    location: "",
    speciality: "",
  });
  const [yearFormError, setYearFormError] = useState("");

  const createYearMutation = useMutation({
    mutationFn: () =>
      adminApi.createHospitalYear(hospitalId, {
        ...yearForm,
        speciality: yearForm.speciality || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospital-years", hospitalId] });
      setYearOpen(false);
      setYearForm({ title: "", dateOfStart: "", dateOfEnd: "", location: "", speciality: "" });
      setYearFormError("");
    },
    onError: (err: any) =>
      setYearFormError(err?.response?.data?.message ?? "Erreur lors de la création"),
  });

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const adminQ = (tab === 0 ? (adminSearch ?? "") : "").toLowerCase();
  const filteredAdmins = admins.filter(
    (a: HospitalAdminRow) =>
      a.email.toLowerCase().includes(adminQ) ||
      (a.firstname ?? "").toLowerCase().includes(adminQ) ||
      (a.lastname ?? "").toLowerCase().includes(adminQ)
  );

  const managerQ = managerSearch.toLowerCase();
  const filteredHospitalManagers = hospitalManagers.filter(
    (m: AdminManager) =>
      m.email.toLowerCase().includes(managerQ) ||
      m.firstname.toLowerCase().includes(managerQ) ||
      m.lastname.toLowerCase().includes(managerQ)
  );

  const promoteQ = promoteSearch.toLowerCase();
  const filteredAllManagersForPromote = allManagers.filter(
    (m: AdminManager) =>
      m.email.toLowerCase().includes(promoteQ) ||
      m.firstname.toLowerCase().includes(promoteQ) ||
      m.lastname.toLowerCase().includes(promoteQ)
  );

  const addQ = addManagerSearch.toLowerCase();
  const assignedIds = new Set(hospitalManagers.map((m: AdminManager) => m.id));
  const filteredAllManagersForAdd = allManagers.filter(
    (m: AdminManager) =>
      !assignedIds.has(m.id) &&
      (m.email.toLowerCase().includes(addQ) ||
        m.firstname.toLowerCase().includes(addQ) ||
        m.lastname.toLowerCase().includes(addQ))
  );

  const isPending =
    deleteMutation.isPending ||
    reinviteMutation.isPending ||
    inviteMutation.isPending ||
    promoteMutation.isPending ||
    unpromoteMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loadingHospital) {
    return (
      <Box p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <IconButton onClick={() => navigate("/admin")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {hospital?.name ?? `Hôpital #${hospitalId}`}
        </Typography>
        {hospital && (
          <Chip
            label={hospital.isActive ? "Actif" : "Inactif"}
            color={hospital.isActive ? "success" : "default"}
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Box>
      {hospital?.city && (
        <Typography variant="body2" color="text.secondary" mb={2} ml={6}>
          {hospital.city}, {hospital.country}
        </Typography>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={`Admins hôpital (${admins.length})`} />
        <Tab label={`Années de formation (${years.length})`} />
        <Tab label={`Managers (${hospitalManagers.length})`} />
      </Tabs>

      {/* ── Tab 0 : Admins ─────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            gap={2}
            flexWrap="wrap"
          >
            <TextField
              size="small"
              placeholder="Rechercher par nom ou email…"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box display="flex" gap={1}>
              <Button variant="outlined" size="small" onClick={() => setPromoteOpen(true)}>
                Promouvoir un manager
              </Button>
              <Button variant="contained" size="small" onClick={() => setInviteOpen(true)}>
                + Inviter un admin
              </Button>
            </Box>
          </Box>

          {loadingAdmins && <CircularProgress size={24} />}

          {!loadingAdmins && filteredAdmins.length === 0 && (
            <Alert severity="info">
              {admins.length === 0
                ? "Aucun administrateur pour cet hôpital."
                : "Aucun résultat pour cette recherche."}
            </Alert>
          )}

          {!loadingAdmins && filteredAdmins.length > 0 && (
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
                      <strong>Invité le</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAdmins.map((admin: HospitalAdminRow) => (
                    <TableRow key={admin.id} hover>
                      <TableCell>
                        {admin.firstname || admin.lastname ? (
                          `${admin.firstname ?? ""} ${admin.lastname ?? ""}`.trim()
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={ADMIN_TYPE_LABEL[admin.type] ?? admin.type}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={ADMIN_STATUS_LABEL[admin.status] ?? admin.status}
                            color={ADMIN_STATUS_COLOR[admin.status] ?? "default"}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(admin.createdAt).toLocaleDateString("fr-BE")}</TableCell>
                      <TableCell align="right">
                        <AdminActionsMenu
                          admin={admin}
                          onReinvite={() => reinviteMutation.mutate(admin.id)}
                          onDelete={() => setDeleteTarget(admin)}
                          onUnpromote={() => setUnpromoteConfirmTarget(admin)}
                          isPending={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── Tab 1 : Années ─────────────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button variant="contained" size="small" onClick={() => setYearOpen(true)}>
              + Nouvelle année
            </Button>
          </Box>

          {loadingYears && <CircularProgress size={24} />}

          {!loadingYears && years.length === 0 && (
            <Alert severity="info">Aucune année de formation pour cet hôpital.</Alert>
          )}

          <Grid container spacing={2}>
            {years.map((year: HospitalYear) => (
              <Grid item xs={12} sm={6} md={4} key={year.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography fontWeight={600}>{year.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {year.period}
                    </Typography>
                    <Typography variant="body2">
                      {new Date(year.dateOfStart).toLocaleDateString("fr-BE")} →{" "}
                      {new Date(year.dateOfEnd).toLocaleDateString("fr-BE")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {year.location}
                    </Typography>
                    {year.speciality && (
                      <Typography variant="caption" color="primary">
                        {year.speciality}
                      </Typography>
                    )}
                    {year.residentCount !== undefined && (
                      <Chip
                        label={`${year.residentCount} résident${year.residentCount !== 1 ? "s" : ""}`}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Tab 2 : Managers ───────────────────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
            <TextField
              size="small"
              placeholder="Rechercher par nom ou email…"
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" size="small" onClick={() => setAddManagerOpen(true)}>
              + Associer un manager
            </Button>
          </Box>

          {loadingManagers && <CircularProgress size={24} />}

          {!loadingManagers && filteredHospitalManagers.length === 0 && (
            <Alert severity="info">
              {hospitalManagers.length === 0
                ? "Aucun manager associé à cet hôpital."
                : "Aucun résultat pour cette recherche."}
            </Alert>
          )}

          {!loadingManagers && filteredHospitalManagers.length > 0 && (
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
                  {filteredHospitalManagers.map((m: AdminManager) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        {m.firstname} {m.lastname}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={MANAGER_STATUS_LABEL[m.status] ?? m.status}
                          color={MANAGER_STATUS_COLOR[m.status] ?? "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => setRemoveManagerTarget(m)}
                          disabled={removeManagerMutation.isPending}
                        >
                          Retirer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── Invite admin dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteEmail("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Inviter un administrateur</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <TextField
              label="Adresse email *"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              placeholder="admin@hopital.be"
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInviteOpen(false);
              setInviteEmail("");
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!inviteEmail || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
          >
            {inviteMutation.isPending ? <CircularProgress size={20} /> : "Envoyer l'invitation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Promote manager dialog ────────────────────────────────────────────── */}
      <Dialog
        open={promoteOpen}
        onClose={() => {
          setPromoteOpen(false);
          setPromoteTarget(null);
          setPromoteSearch("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Promouvoir un manager en administrateur</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <TextField
              size="small"
              placeholder="Rechercher un manager…"
              value={promoteSearch}
              onChange={(e) => setPromoteSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            {filteredAllManagersForPromote.length === 0 && promoteSearch && (
              <Typography variant="body2" color="text.secondary">
                Aucun résultat.
              </Typography>
            )}
            <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
              {filteredAllManagersForPromote.map((m: AdminManager) => (
                <Box
                  key={m.id}
                  onClick={() => setPromoteTarget(m)}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor: promoteTarget?.id === m.id ? "primary.light" : "transparent",
                    "&:hover": {
                      bgcolor: promoteTarget?.id === m.id ? "primary.light" : "action.hover",
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {m.firstname} {m.lastname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.email}
                  </Typography>
                </Box>
              ))}
            </Box>
            {promoteTarget && (
              <Alert severity="info">
                <strong>{promoteTarget.firstname} {promoteTarget.lastname}</strong> recevra les droits d'administrateur hôpital et pourra se connecter avec ses identifiants manager habituels.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPromoteOpen(false);
              setPromoteTarget(null);
              setPromoteSearch("");
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={promoteTarget === null || promoteMutation.isPending}
            onClick={() => promoteTarget && promoteMutation.mutate(promoteTarget.id)}
          >
            {promoteMutation.isPending ? <CircularProgress size={20} /> : "Promouvoir"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete admin confirmation ─────────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Supprimer le compte</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le compte de <strong>{deleteTarget?.email}</strong> ?
            Cette action est irréversible.
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

      {/* ── Add manager dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={addManagerOpen}
        onClose={() => {
          setAddManagerOpen(false);
          setAddManagerSearch("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Associer un manager à cet hôpital</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <TextField
              size="small"
              placeholder="Rechercher un manager…"
              value={addManagerSearch}
              onChange={(e) => setAddManagerSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            {filteredAllManagersForAdd.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {allManagers.length === 0 ? "Chargement…" : "Aucun manager disponible."}
              </Typography>
            )}
            <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
              {filteredAllManagersForAdd.map((m: AdminManager) => (
                <Box
                  key={m.id}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {m.firstname} {m.lastname}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.email}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => addManagerMutation.mutate(m.id)}
                    disabled={addManagerMutation.isPending}
                  >
                    Associer
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddManagerOpen(false);
              setAddManagerSearch("");
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Remove manager confirmation ───────────────────────────────────────── */}
      <Dialog
        open={removeManagerTarget !== null}
        onClose={() => setRemoveManagerTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Retirer le manager</DialogTitle>
        <DialogContent>
          <Typography>
            Retirer{" "}
            <strong>
              {removeManagerTarget?.firstname} {removeManagerTarget?.lastname}
            </strong>{" "}
            de cet hôpital ? Le compte manager reste actif.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveManagerTarget(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            disabled={removeManagerMutation.isPending}
            onClick={() =>
              removeManagerTarget && removeManagerMutation.mutate(removeManagerTarget.id)
            }
          >
            {removeManagerMutation.isPending ? <CircularProgress size={20} /> : "Retirer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Unpromote manager confirmation ───────────────────────────────────── */}
      <Dialog
        open={unpromoteConfirmTarget !== null}
        onClose={() => setUnpromoteConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Retirer la promotion</DialogTitle>
        <DialogContent>
          <Typography>
            Retirer les droits d'administrateur hôpital de{" "}
            <strong>
              {unpromoteConfirmTarget?.firstname} {unpromoteConfirmTarget?.lastname}
            </strong>{" "}
            ? Le compte manager reste actif.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnpromoteConfirmTarget(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            disabled={unpromoteMutation.isPending}
            onClick={() =>
              unpromoteConfirmTarget && unpromoteMutation.mutate(unpromoteConfirmTarget.id)
            }
          >
            {unpromoteMutation.isPending ? <CircularProgress size={20} /> : "Retirer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create year dialog ────────────────────────────────────────────────── */}
      <Dialog open={yearOpen} onClose={() => setYearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle année de formation</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="create-year-form"
            onSubmit={(e) => {
              e.preventDefault();
              setYearFormError("");
              if (
                !yearForm.title ||
                !yearForm.dateOfStart ||
                !yearForm.dateOfEnd ||
                !yearForm.location
              ) {
                setYearFormError("Titre, dates et lieu sont obligatoires");
                return;
              }
              createYearMutation.mutate();
            }}
            display="flex"
            flexDirection="column"
            gap={2}
            pt={1}
          >
            <TextField
              label="Titre *"
              value={yearForm.title}
              onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
              fullWidth
              placeholder="Ex : Stage cardiologie S1"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Date de début *"
                  type="date"
                  value={yearForm.dateOfStart}
                  onChange={(e) => setYearForm({ ...yearForm, dateOfStart: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Date de fin *"
                  type="date"
                  value={yearForm.dateOfEnd}
                  onChange={(e) => setYearForm({ ...yearForm, dateOfEnd: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Lieu *"
              value={yearForm.location}
              onChange={(e) => setYearForm({ ...yearForm, location: e.target.value })}
              fullWidth
              placeholder="Ex : Service cardiologie, bâtiment A"
            />
            <TextField
              label="Spécialité"
              value={yearForm.speciality}
              onChange={(e) => setYearForm({ ...yearForm, speciality: e.target.value })}
              fullWidth
              placeholder="Ex : Cardiologie"
            />
            {yearFormError && <Alert severity="error">{yearFormError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYearOpen(false)}>Annuler</Button>
          <Button
            type="submit"
            form="create-year-form"
            variant="contained"
            disabled={createYearMutation.isPending}
          >
            {createYearMutation.isPending ? <CircularProgress size={20} /> : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminHospitalDetailPage;
