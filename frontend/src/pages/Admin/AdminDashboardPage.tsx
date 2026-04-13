import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import adminApi from "../../services/adminApi";
import type { Hospital, HospitalRequest } from "../../types/entities";

const AdminDashboardPage = () => {
  useAxiosPrivate(); // registers the Authorization interceptor for this page
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: hospitals = [], isLoading: loadingHospitals } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: adminApi.listHospitals,
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: adminApi.listRequests,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleHospital(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hospitals"] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminApi.rejectRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-requests"] }),
  });

  // Create hospital dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", city: "", country: "BE" });
  const [createError, setCreateError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => adminApi.createHospital(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
      setCreateOpen(false);
      setCreateForm({ name: "", city: "", country: "BE" });
    },
    onError: (err: any) =>
      setCreateError(err?.response?.data?.message ?? "Erreur lors de la création de l'hôpital"),
  });

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h4" fontWeight={700}>
          Administration
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/admin/managers")}>
          Gérer les managers
        </Button>
      </Box>

      {/* ── Pending requests ─────────────────────────────────────────────────── */}
      <Typography variant="h6" fontWeight={600} mb={1} mt={2}>
        Demandes en attente ({requests.length})
      </Typography>

      {loadingRequests && <CircularProgress size={24} />}

      {!loadingRequests && requests.length === 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Aucune demande en attente
        </Alert>
      )}

      <Grid container spacing={2} mb={4}>
        {requests.map((req: HospitalRequest) => (
          <Grid item xs={12} sm={6} md={4} key={req.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600}>{req.hospitalName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Par {req.requestedBy.firstname} {req.requestedBy.lastname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {req.requestedBy.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(req.createdAt).toLocaleDateString("fr-BE")}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(req.id)}
                >
                  Approuver
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(req.id)}
                >
                  Refuser
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* ── Hospitals ─────────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Hôpitaux ({hospitals.length})
        </Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          + Nouveau hôpital
        </Button>
      </Box>

      {loadingHospitals && <CircularProgress size={24} />}

      <Grid container spacing={2}>
        {hospitals.map((h: Hospital) => (
          <Grid item xs={12} sm={6} md={4} key={h.id}>
            <Card variant="outlined" sx={{ opacity: h.isActive ? 1 : 0.6 }}>
              <CardActionArea onClick={() => navigate(`/admin/hospitals/${h.id}`)}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography fontWeight={600}>{h.name}</Typography>
                    <Chip
                      label={h.isActive ? "Actif" : "Inactif"}
                      color={h.isActive ? "success" : "default"}
                      size="small"
                    />
                  </Box>
                  {h.city && (
                    <Typography variant="body2" color="text.secondary">
                      {h.city}, {h.country}
                    </Typography>
                  )}
                  <Typography variant="caption" color="primary" mt={1} display="block">
                    Cliquer pour configurer →
                  </Typography>
                </CardContent>
              </CardActionArea>
              <CardActions>
                <FormControlLabel
                  control={
                    <Switch
                      checked={h.isActive}
                      size="small"
                      onChange={() => toggleMutation.mutate(h.id)}
                      disabled={toggleMutation.isPending}
                    />
                  }
                  label={h.isActive ? "Désactiver" : "Activer"}
                  sx={{ ml: "auto", mr: 0 }}
                />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Create hospital dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvel hôpital</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Nom *"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Ville"
              value={createForm.city}
              onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              fullWidth
            />
            <TextField
              label="Pays (code ISO)"
              value={createForm.country}
              onChange={(e) =>
                setCreateForm({ ...createForm, country: e.target.value.toUpperCase() })
              }
              fullWidth
              inputProps={{ maxLength: 2 }}
            />
            {createError && <Alert severity="error">{createError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!createForm.name || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardPage;
