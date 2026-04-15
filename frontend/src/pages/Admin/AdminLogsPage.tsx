import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "../../services/adminApi";
import type { AdminAuditLogEntry } from "../../services/adminApi";

// Material UI
import Box from "@mui/material/Box";
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
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";

// ── Constants ─────────────────────────────────────────────────────────────────

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
  create_maccs: "success",
  create_manager: "success",
  create_year: "success",
  import_csv: "success",
  delete_maccs: "error",
  delete_manager: "error",
  delete_year: "error",
  retire_maccs: "warning",
  retire_manager: "warning",
  bulk_edit: "info",
  update_year: "info",
  resend_invite_maccs: "default",
  resend_invite_manager: "default",
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  resident: "MACCS",
  manager: "Manager",
  year: "Année",
};

const PAGE_SIZE = 25;

// ── Detail dialog ─────────────────────────────────────────────────────────────

const DetailDialog = ({
  log,
  onClose,
}: {
  log: AdminAuditLogEntry | null;
  onClose: () => void;
}) => {
  if (!log) return null;

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const renderChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return null;
    const { old: oldVal, new: newVal, ...rest } = changes as Record<string, unknown>;

    if (oldVal !== undefined || newVal !== undefined) {
      // Standard {old, new} format
      return (
        <Box>
          {oldVal !== undefined && (
            <Box mb={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                AVANT
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: "error.50" }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: "0.75rem", m: 0 }}>
                  {JSON.stringify(oldVal, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
          {newVal !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                APRÈS
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: "success.50" }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: "0.75rem", m: 0 }}>
                  {JSON.stringify(newVal, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
          {Object.keys(rest).length > 0 && (
            <Box mt={1}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: "0.75rem", m: 0 }}>
                  {JSON.stringify(rest, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      );
    }

    // Arbitrary JSON
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: "0.75rem", m: 0 }}>
          {JSON.stringify(changes, null, 2)}
        </Typography>
      </Paper>
    );
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={700}>
            Détail de l'action
          </Typography>
          <Chip
            label={log.status === "success" ? "Succès" : "Erreur"}
            color={log.status === "success" ? "success" : "error"}
            size="small"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          #{log.id} · {fmt(log.createdAt)}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Qui */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
              Auteur
            </Typography>
            <Typography variant="body2" mt={0.5}>
              {log.adminName}
            </Typography>
          </Box>

          <Divider />

          {/* Hôpital */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
              Hôpital
            </Typography>
            <Typography variant="body2" mt={0.5}>
              {log.hospitalName}
            </Typography>
          </Box>

          <Divider />

          {/* Action */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
              Action
            </Typography>
            <Box mt={0.5}>
              <Chip
                label={ACTION_LABEL[log.action] ?? log.action}
                color={ACTION_COLOR[log.action] ?? "default"}
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          {/* Entité */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
              Entité concernée
            </Typography>
            <Typography variant="body2" mt={0.5}>
              {ENTITY_TYPE_LABEL[log.entityType] ?? log.entityType}
              {log.entityId !== null && (
                <Typography component="span" variant="body2" color="text.secondary">
                  {" "}(ID #{log.entityId})
                </Typography>
              )}
            </Typography>
          </Box>

          <Divider />

          {/* Description */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
              Description
            </Typography>
            <Typography variant="body2" mt={0.5}>
              {log.description}
            </Typography>
          </Box>

          {/* Modifications */}
          {log.changes && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                  Modifications
                </Typography>
                <Box mt={0.5}>{renderChanges(log.changes)}</Box>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const AdminLogsPage = () => {
  const [page, setPage] = useState(1);
  const [filterHospital, setFilterHospital] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selected, setSelected] = useState<AdminAuditLogEntry | null>(null);

  // Fetch all hospitals for filter dropdown
  const { data: hospitals } = useQuery({
    queryKey: ["admin-hospitals-list"],
    queryFn: () => adminApi.listHospitals(),
  });

  // Load all entries at once, filter client-side (max 1000 from backend)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => adminApi.getAuditLog({ limit: 1000 }),
  });

  const filtered = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.filter((log) => {
      if (filterHospital && String(log.hospitalId) !== filterHospital) return false;
      if (filterAction && log.action !== filterAction) return false;
      if (filterEntityType && log.entityType !== filterEntityType) return false;
      if (filterStatus && log.status !== filterStatus) return false;
      if (filterFrom) {
        const from = new Date(filterFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(log.createdAt) < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(log.createdAt) > to) return false;
      }
      return true;
    });
  }, [data, filterHospital, filterAction, filterEntityType, filterStatus, filterFrom, filterTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = Boolean(filterHospital || filterAction || filterEntityType || filterStatus || filterFrom || filterTo);

  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterHospital("");
    setFilterAction("");
    setFilterEntityType("");
    setFilterStatus("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const rows = [
      ["Date", "Admin", "Hôpital", "Action", "Type entité", "Statut", "Description"],
      ...filtered.map((l) => [
        new Date(l.createdAt).toLocaleString("fr-BE"),
        l.adminName,
        l.hospitalName,
        ACTION_LABEL[l.action] ?? l.action,
        ENTITY_TYPE_LABEL[l.entityType] ?? l.entityType,
        l.status === "success" ? "Succès" : "Erreur",
        l.description,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Box p={3} maxWidth={1400} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Journal d'activité
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toutes les actions effectuées par les administrateurs d'hôpitaux
            {data && (
              <> — <strong>{data.total}</strong> entrée{data.total !== 1 ? "s" : ""} au total</>
            )}
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={handleExportCsv} disabled={!filtered.length}>
          Exporter CSV
        </Button>
      </Box>

      {/* Filters */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
        {/* Hospital */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Hôpital</InputLabel>
          <Select
            value={filterHospital}
            label="Hôpital"
            onChange={(e) => reset(setFilterHospital)(e.target.value)}
          >
            <MenuItem value="">Tous les hôpitaux</MenuItem>
            {(hospitals ?? []).map((h) => (
              <MenuItem key={h.id} value={String(h.id)}>
                {h.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Action */}
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={filterAction}
            label="Action"
            onChange={(e) => reset(setFilterAction)(e.target.value)}
          >
            <MenuItem value="">Toutes les actions</MenuItem>
            {Object.entries(ACTION_LABEL).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Entity type */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterEntityType}
            label="Type"
            onChange={(e) => reset(setFilterEntityType)(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            {Object.entries(ENTITY_TYPE_LABEL).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={filterStatus}
            label="Statut"
            onChange={(e) => reset(setFilterStatus)(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="success">Succès</MenuItem>
            <MenuItem value="error">Erreur</MenuItem>
          </Select>
        </FormControl>

        {/* Dates */}
        <TextField
          label="Du"
          type="date"
          size="small"
          value={filterFrom}
          onChange={(e) => reset(setFilterFrom)(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />
        <TextField
          label="Au"
          type="date"
          size="small"
          value={filterTo}
          onChange={(e) => reset(setFilterTo)(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />

        {hasFilters && (
          <Button size="small" onClick={handleResetFilters}>
            Réinitialiser
          </Button>
        )}

        {hasFilters && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Box>

      {/* Content */}
      {isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Erreur lors du chargement du journal.</Alert>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <Alert severity="info">
          {hasFilters
            ? "Aucun résultat pour ces filtres."
            : "Aucune action enregistrée pour le moment."}
        </Alert>
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Date</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Hôpital</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedLogs.map((log) => (
                  <Tooltip key={log.id} title="Cliquez pour voir les détails" placement="left" arrow>
                    <TableRow
                      hover
                      onClick={() => setSelected(log)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="caption" color="text.secondary">
                          {fmt(log.createdAt)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {log.adminName}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.hospitalName}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={ACTION_LABEL[log.action] ?? log.action}
                          color={ACTION_COLOR[log.action] ?? "default"}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption">
                          {ENTITY_TYPE_LABEL[log.entityType] ?? log.entityType}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={log.status === "success" ? "Succès" : "Erreur"}
                          color={log.status === "success" ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>

                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 300,
                          }}
                        >
                          {log.description}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </Tooltip>
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

      {/* Detail dialog */}
      <DetailDialog log={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};

export default AdminLogsPage;
