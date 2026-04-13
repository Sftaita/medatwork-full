import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { HospitalYear, YearInput, YearStatus } from "../../services/hospitalAdminApi";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<YearStatus, string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Fermée",
  archived: "Archivée",
};

type ChipColor = "default" | "primary" | "warning" | "error";
const STATUS_COLOR: Record<YearStatus, ChipColor> = {
  draft: "default",
  active: "primary",
  closed: "warning",
  archived: "error",
};

// ── Year form dialog ──────────────────────────────────────────────────────────

interface YearFormDialogProps {
  open: boolean;
  initial?: HospitalYear | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (data: YearInput) => void;
}

const EMPTY_FORM: YearInput = {
  title: "", location: "", period: "",
  dateOfStart: "", dateOfEnd: "",
  speciality: "", comment: "", status: "active",
};

const YearFormDialog = ({ open, initial, isPending, onClose, onSave }: YearFormDialogProps) => {
  const [form, setForm] = useState<YearInput>(() =>
    initial
      ? {
          title: initial.title,
          location: initial.location,
          period: initial.period,
          dateOfStart: initial.dateOfStart,
          dateOfEnd: initial.dateOfEnd,
          speciality: initial.speciality ?? "",
          comment: initial.comment ?? "",
          status: initial.status,
        }
      : EMPTY_FORM
  );

  const set = (field: keyof YearInput) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
    setForm((prev) => ({ ...prev, [field]: (e.target as HTMLInputElement).value }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.location.trim() || !form.dateOfStart || !form.dateOfEnd) {
      toast.error("Titre, lieu et dates sont obligatoires");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? "Modifier l'année" : "Nouvelle année"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="Titre *" value={form.title} onChange={set("title")} fullWidth size="small" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Lieu *" value={form.location} onChange={set("location")} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Période (ex: 2025-2026)" value={form.period} onChange={set("period")} fullWidth size="small" />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de début *"
                type="date"
                value={form.dateOfStart}
                onChange={set("dateOfStart")}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de fin *"
                type="date"
                value={form.dateOfEnd}
                onChange={set("dateOfEnd")}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <TextField label="Spécialité" value={form.speciality ?? ""} onChange={set("speciality")} fullWidth size="small" />
          <TextField label="Commentaire" value={form.comment ?? ""} onChange={set("comment")} fullWidth size="small" multiline rows={2} />
          {initial && (
            <FormControl size="small" fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={form.status ?? "active"}
                label="Statut"
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as YearStatus }))}
              >
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="closed">Fermée</MenuItem>
                <MenuItem value="archived">Archivée</MenuItem>
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>Annuler</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>
          {isPending ? <CircularProgress size={16} /> : initial ? "Enregistrer" : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Actions menu ──────────────────────────────────────────────────────────────

const ActionsMenu = ({
  year, onEdit, onDelete,
}: {
  year: HospitalYear;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const editable = year.status === "draft" || year.status === "active";

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>
          {editable ? "Modifier" : "Voir / changer le statut"}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setAnchor(null); onDelete(); }}
          sx={{ color: "error.main" }}
          disabled={year.residentCount > 0 || year.managerCount > 0}
        >
          Supprimer
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminYearsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["hospital-admin-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HospitalYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HospitalYear | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hospital-admin-years"] });
    qc.invalidateQueries({ queryKey: ["hospital-admin-dashboard-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: hospitalAdminApi.createYear,
    onSuccess: () => { toast.success("Année créée"); setAddOpen(false); invalidate(); },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<YearInput> }) =>
      hospitalAdminApi.updateYear(id, data),
    onSuccess: () => { toast.success("Année mise à jour"); setEditTarget(null); invalidate(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: hospitalAdminApi.deleteYear,
    onSuccess: () => { toast.success("Année supprimée"); setDeleteTarget(null); invalidate(); },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? "Impossible de supprimer cette année"),
  });

  const sorted = [...years].sort((a, b) => b.dateOfStart.localeCompare(a.dateOfStart));

  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" pt={3} pb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gestion des années</Typography>
          <Typography variant="body2" color="text.secondary">
            Créez et gérez les années de formation de votre hôpital
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Nouvelle année
        </Button>
      </Box>

      {isLoading && <CircularProgress size={24} />}

      {!isLoading && years.length === 0 && (
        <Alert severity="info">Aucune année enregistrée. Créez votre première année.</Alert>
      )}

      {!isLoading && years.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Titre</TableCell>
                <TableCell>Période</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Début</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>MACCS</TableCell>
                <TableCell>Managers</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((year) => (
                <TableRow key={year.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{year.title}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{year.period}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{year.location}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(year.dateOfStart).toLocaleDateString("fr-BE")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(year.dateOfEnd).toLocaleDateString("fr-BE")}
                    </Typography>
                  </TableCell>
                  <TableCell>{year.residentCount}</TableCell>
                  <TableCell>{year.managerCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABEL[year.status]}
                      color={STATUS_COLOR[year.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <ActionsMenu
                      year={year}
                      onEdit={() => setEditTarget(year)}
                      onDelete={() => setDeleteTarget(year)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add dialog */}
      <YearFormDialog
        open={addOpen}
        isPending={createMutation.isPending}
        onClose={() => setAddOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
      />

      {/* Edit dialog */}
      <YearFormDialog
        open={editTarget !== null}
        initial={editTarget}
        isPending={updateMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSave={(data) => editTarget && updateMutation.mutate({ id: editTarget.id, data })}
      />

      {/* Delete confirm */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer cette année ?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.title}</strong> sera supprimée définitivement. Cette action est{" "}
            <strong>irréversible</strong>.
          </Typography>
          {(deleteTarget?.residentCount ?? 0) > 0 || (deleteTarget?.managerCount ?? 0) > 0 ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              Impossible : des résidents ou managers sont encore liés à cette année.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            disabled={
              deleteMutation.isPending ||
              (deleteTarget?.residentCount ?? 0) > 0 ||
              (deleteTarget?.managerCount ?? 0) > 0
            }
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? <CircularProgress size={16} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HospitalAdminYearsPage;
