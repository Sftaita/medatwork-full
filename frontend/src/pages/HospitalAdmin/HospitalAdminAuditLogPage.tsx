import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Pagination from "@mui/material/Pagination";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { AuditLogEntry } from "../../services/hospitalAdminApi";

// ── Action label/color ────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  create_maccs: "Ajout MACCS",
  delete_maccs: "Suppression MACCS",
  retire_maccs: "Retrait MACCS",
  resend_invite_maccs: "Renvoi invitation MACCS",
  create_manager: "Ajout manager",
  delete_manager: "Suppression manager",
  retire_manager: "Retrait manager",
  resend_invite_manager: "Renvoi invitation manager",
  import_csv: "Import CSV",
  bulk_edit: "Modification en masse",
  create_year: "Création année",
  update_year: "Modification année",
  delete_year: "Suppression année",
};

type ChipColor = "success" | "error" | "warning" | "info" | "default";
const ACTION_COLOR: Record<string, ChipColor> = {
  create_maccs: "success", create_manager: "success", create_year: "success", import_csv: "success",
  delete_maccs: "error", delete_manager: "error", delete_year: "error",
  retire_maccs: "warning", retire_manager: "warning",
  bulk_edit: "info", update_year: "info",
  resend_invite_maccs: "default", resend_invite_manager: "default",
};

const PAGE_SIZE = 25;

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Help modal ────────────────────────────────────────────────────────────────

const HelpModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>À propos du journal d'activité</DialogTitle>
    <DialogContent>
      <Typography variant="body2" gutterBottom>
        Le journal d'activité enregistre toutes les actions effectuées par les administrateurs de
        l'hôpital sur la plateforme.
      </Typography>
      <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>
        Quelles actions sont tracées ?
      </Typography>
      <List dense disablePadding>
        {[
          ["Ajout / suppression / retrait MACCS", "Création de compte, retrait d'une année, suppression définitive"],
          ["Renvoi d'invitation", "Chaque renvoi de lien d'activation est enregistré"],
          ["Gestion des managers", "Ajout, retrait, renvoi d'invitation manager"],
          ["Import CSV", "Chaque import (prévisualisation et confirmation)"],
          ["Modification en masse", "Changements groupés sur l'opting-out"],
          ["Gestion des années", "Création, modification, suppression d'une année académique"],
        ].map(([action, detail]) => (
          <ListItem key={action} disableGutters sx={{ alignItems: "flex-start" }}>
            <ListItemText
              primary={action}
              secondary={detail}
              primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItem>
        ))}
      </List>
      <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>
        Qui peut consulter ce journal ?
      </Typography>
      <Typography variant="body2">
        Uniquement les administrateurs de l'hôpital. Chaque hôpital ne voit que ses propres
        entrées.
      </Typography>
      <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>
        Conservation des données
      </Typography>
      <Typography variant="body2">
        Les entrées sont conservées indéfiniment. Utilisez l'export CSV pour archiver ou analyser
        les données dans un tableur.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">Fermer</Button>
    </DialogActions>
  </Dialog>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminAuditLogPage = () => {
  useAxiosPrivate();
  const [page, setPage] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Load all entries at once so we can filter client-side
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hospital-admin-audit-log"],
    queryFn: () => hospitalAdminApi.getAuditLog(1000, 0),
  });

  const filtered = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.filter((log: AuditLogEntry) => {
      if (filterAction && log.action !== filterAction) return false;
      if (filterFrom) {
        const logDate = new Date(log.createdAt);
        const from = new Date(filterFrom);
        from.setHours(0, 0, 0, 0);
        if (logDate < from) return false;
      }
      if (filterTo) {
        const logDate = new Date(log.createdAt);
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (logDate > to) return false;
      }
      return true;
    });
  }, [data, filterAction, filterFrom, filterTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = Boolean(filterAction || filterFrom || filterTo);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const rows = [
      ["Date", "Admin", "Action", "Type entité", "Description"],
      ...filtered.map((l: AuditLogEntry) => [
        new Date(l.createdAt).toLocaleString("fr-BE"),
        l.adminName,
        ACTION_LABEL[l.action] ?? l.action,
        l.entityType,
        l.description,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" pt={3} pb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="h5" fontWeight={700}>Journal d'activité</Typography>
            <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: "text.secondary" }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Toutes les actions effectuées par les administrateurs de l'hôpital
            {data && ` — ${data.total} entrée${data.total > 1 ? "s" : ""}`}
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={handleExportCsv} disabled={!filtered.length}>
          Exporter CSV
        </Button>
      </Box>

      {/* ── Filters ── */}
      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Type d'action</InputLabel>
          <Select
            value={filterAction}
            label="Type d'action"
            onChange={(e) => handleFilterChange(setFilterAction)(e.target.value)}
          >
            <MenuItem value="">Toutes les actions</MenuItem>
            {Object.entries(ACTION_LABEL).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Du"
          type="date"
          size="small"
          value={filterFrom}
          onChange={(e) => handleFilterChange(setFilterFrom)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Au"
          type="date"
          size="small"
          value={filterTo}
          onChange={(e) => handleFilterChange(setFilterTo)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        {hasFilters && (
          <Button size="small" onClick={handleResetFilters} sx={{ whiteSpace: "nowrap" }}>
            Réinitialiser
          </Button>
        )}

        {hasFilters && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Box>

      {isLoading && <CircularProgress size={24} />}
      {isError && <Alert severity="error">Erreur lors du chargement du journal.</Alert>}

      {!isLoading && data && filtered.length === 0 && (
        <Alert severity="info">
          {hasFilters ? "Aucun résultat pour ces filtres." : "Aucune action enregistrée pour le moment."}
        </Alert>
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedLogs.map((log: AuditLogEntry) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.createdAt).toLocaleString("fr-BE")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{log.adminName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ACTION_LABEL[log.action] ?? log.action}
                        color={ACTION_COLOR[log.action] ?? "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.description}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Container>
  );
};

export default HospitalAdminAuditLogPage;
