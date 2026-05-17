import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import HistoryIcon from "@mui/icons-material/History";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LockIcon from "@mui/icons-material/Lock";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";

import hospitalAdminApi from "../../services/hospitalAdminApi";
import auditTimelineApi, {
  type AuditEvent,
  type AuditEventType,
  type AuditFilters,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  ACTOR_TYPE_LABELS,
} from "../../services/auditTimelineApi";
import YearSelect from "../../components/YearSelect";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtPeriod(month: number | null, calYear: number | null): string {
  if (!month || !calYear) return "—";
  return `${String(month).padStart(2, "0")}/${calYear}`;
}

const EVENT_ICONS: Partial<Record<AuditEventType, React.ReactNode>> = {
  rh_lock_applied:              <LockIcon fontSize="small" />,
  rh_lock_removed:              <LockIcon fontSize="small" />,
  export_generated:             <FileDownloadIcon fontSize="small" />,
  validation_accepted:          <CheckCircleIcon fontSize="small" />,
  validation_rejected:          <CancelIcon fontSize="small" />,
  validation_blocked_by_lock:   <BlockIcon fontSize="small" />,
  blocked_modification_attempt: <BlockIcon fontSize="small" />,
  timesheet_created:            <AddCircleIcon fontSize="small" />,
  timesheet_modified:           <EditIcon fontSize="small" />,
  timesheet_deleted:            <DeleteIcon fontSize="small" />,
  garde_created:                <AddCircleIcon fontSize="small" />,
  garde_deleted:                <DeleteIcon fontSize="small" />,
  absence_created:              <AddCircleIcon fontSize="small" />,
  absence_deleted:              <DeleteIcon fontSize="small" />,
};

// ── Context detail row ────────────────────────────────────────────────────────

const ContextDetail = ({ event }: { event: AuditEvent }) => {
  const ctx = event.context;
  if (!ctx || Object.keys(ctx).length === 0) return null;

  return (
    <Box
      component="pre"
      sx={{
        m: 0, p: 1.5, fontSize: "0.72rem", fontFamily: "monospace",
        bgcolor: "grey.900", color: "grey.100", borderRadius: 1, overflow: "auto",
        maxHeight: 160,
      }}
    >
      {JSON.stringify(ctx, null, 2)}
    </Box>
  );
};

// ── Event row ─────────────────────────────────────────────────────────────────

const EventRow = ({ event }: { event: AuditEvent }) => {
  const [open, setOpen] = useState(false);
  const hasContext = Object.keys(event.context ?? {}).length > 0;

  return (
    <>
      <TableRow hover sx={{ "& > *": { borderBottom: open ? "unset" : undefined } }}>
        <TableCell sx={{ py: 0.75 }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", whiteSpace: "nowrap" }}>
            {fmtDateTime(event.occurredAt)}
          </Typography>
        </TableCell>
        <TableCell sx={{ py: 0.75 }}>
          <Chip
            label={EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
            size="small"
            color={EVENT_TYPE_COLORS[event.eventType] ?? "default"}
            icon={EVENT_ICONS[event.eventType] as React.ReactElement | undefined}
            variant="outlined"
            sx={{ maxWidth: 220 }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.75 }}>
          <Stack spacing={0.25}>
            {event.residentName && (
              <Typography variant="body2" fontWeight={600}>{event.residentName}</Typography>
            )}
            {event.yearResidentId && !event.residentName && (
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                YR#{event.yearResidentId}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {fmtPeriod(event.month, event.calendarYear)}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell sx={{ py: 0.75 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={ACTOR_TYPE_LABELS[event.actorType] ?? event.actorType}
              size="small"
              variant="outlined"
            />
            {event.actorId !== null && (
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
                #{event.actorId}
              </Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell sx={{ py: 0.75 }}>
          {event.batchNumber !== null ? (
            <Tooltip title={`Batch #${event.batchNumber} (id: ${event.batchId})`} arrow>
              <Chip
                label={`Export #${event.batchNumber}`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ cursor: "help" }}
              />
            </Tooltip>
          ) : "—"}
        </TableCell>
        <TableCell padding="checkbox" sx={{ py: 0.75 }}>
          {hasContext && (
            <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label="Voir le contexte">
              {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {hasContext && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box p={1.5}>
                <ContextDetail event={event} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS: AuditEventType[] = [
  "export_generated", "rh_lock_applied", "rh_lock_removed",
  "timesheet_created", "timesheet_modified", "timesheet_deleted",
  "garde_created", "garde_deleted",
  "absence_created", "absence_deleted",
  "validation_accepted", "validation_rejected",
  "validation_blocked_by_lock", "blocked_modification_attempt",
];

const LIMIT_OPTIONS = [25, 50, 100];

const HospitalAdminAuditTimelinePage = () => {
  useAxiosPrivate();

  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState<AuditFilters>({});

  const { data: years = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["ha-audit-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  const queryFilters: AuditFilters = useMemo(() => ({
    ...filters,
    page: page + 1,
    limit,
  }), [filters, page, limit]);

  const {
    data,
    isLoading: eventsLoading,
    isError,
  } = useQuery({
    queryKey: ["ha-audit-events", selectedYearId, queryFilters],
    queryFn: () => auditTimelineApi.listByYear(selectedYearId as number, queryFilters),
    enabled: typeof selectedYearId === "number",
  });

  const events = data?.data ?? [];
  const total  = data?.total ?? 0;

  const hasActiveFilters = Object.values(filters).some((v) => v !== "" && v !== undefined);

  const resetFilters = () => {
    setFilters({});
    setPage(0);
  };

  const setFilter = (key: keyof AuditFilters, value: string | number | "") => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  return (
    <Box p={3} maxWidth={1400} mx="auto">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Audit Timeline RH</Typography>
            <Typography variant="body2" color="text.secondary">
              Historique complet des événements métier — exports, validations, modifications, clôtures
            </Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 380 }}>
          <YearSelect
            years={years}
            value={selectedYearId}
            onChange={(id) => { if (id !== "") { setSelectedYearId(id); setPage(0); } }}
            disabled={yearsLoading}
          />
        </Box>
      </Box>

      {selectedYearId === "" ? (
        <Alert severity="info">Sélectionnez une année académique pour afficher la timeline.</Alert>
      ) : (
        <>
          {/* Filters */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type d'événement</InputLabel>
                  <Select
                    label="Type d'événement"
                    value={filters.eventType ?? ""}
                    onChange={(e) => setFilter("eventType", e.target.value as AuditEventType | "")}
                  >
                    <MenuItem value=""><em>Tous</em></MenuItem>
                    {EVENT_TYPE_OPTIONS.map((t) => (
                      <MenuItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  size="small" fullWidth
                  label="Mois (1–12)"
                  type="number"
                  value={filters.month ?? ""}
                  onChange={(e) => setFilter("month", e.target.value ? parseInt(e.target.value, 10) : "")}
                  inputProps={{ min: 1, max: 12 }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  size="small" fullWidth
                  label="Année"
                  type="number"
                  value={filters.calendarYear ?? ""}
                  onChange={(e) => setFilter("calendarYear", e.target.value ? parseInt(e.target.value, 10) : "")}
                  inputProps={{ min: 2020 }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  size="small" fullWidth
                  label="Depuis (AAAA-MM-JJ)"
                  value={filters.from ?? ""}
                  onChange={(e) => setFilter("from", e.target.value)}
                  placeholder="2024-11-01"
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  size="small" fullWidth
                  label="Jusqu'au (AAAA-MM-JJ)"
                  value={filters.to ?? ""}
                  onChange={(e) => setFilter("to", e.target.value)}
                  placeholder="2024-11-30"
                />
              </Grid>
              {hasActiveFilters && (
                <Grid item xs={12} sm="auto">
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<FilterListOffIcon />}
                    onClick={resetFilters}
                    sx={{ textTransform: "none" }}
                  >
                    Réinitialiser
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Count + active filter chips */}
          {hasActiveFilters && (
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1.5}>
              {filters.eventType && (
                <Chip
                  size="small" label={`Type: ${EVENT_TYPE_LABELS[filters.eventType]}`}
                  onDelete={() => setFilter("eventType", "")}
                />
              )}
              {filters.month && (
                <Chip size="small" label={`Mois: ${filters.month}`} onDelete={() => setFilter("month", "")} />
              )}
              {filters.calendarYear && (
                <Chip size="small" label={`Année: ${filters.calendarYear}`} onDelete={() => setFilter("calendarYear", "")} />
              )}
              {filters.from && (
                <Chip size="small" label={`Depuis: ${filters.from}`} onDelete={() => setFilter("from", "")} />
              )}
              {filters.to && (
                <Chip size="small" label={`Jusqu'au: ${filters.to}`} onDelete={() => setFilter("to", "")} />
              )}
            </Stack>
          )}

          {/* Table */}
          {eventsLoading ? (
            <Stack spacing={1}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
            </Stack>
          ) : isError ? (
            <Alert severity="error">Erreur lors du chargement de la timeline.</Alert>
          ) : events.length === 0 ? (
            <Alert severity="info">
              {hasActiveFilters ? "Aucun événement ne correspond aux filtres." : "Aucun événement d'audit pour cette année."}
            </Alert>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                {total} événement{total > 1 ? "s" : ""} — page {page + 1} sur {Math.max(1, Math.ceil(total / limit))}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">DATE / HEURE</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">ÉVÉNEMENT</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">MACCS / PÉRIODE</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">ACTEUR</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">EXPORT</Typography></TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 1 }} />

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={limit}
                onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={LIMIT_OPTIONS}
                labelRowsPerPage="Lignes par page"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default HospitalAdminAuditTimelinePage;
