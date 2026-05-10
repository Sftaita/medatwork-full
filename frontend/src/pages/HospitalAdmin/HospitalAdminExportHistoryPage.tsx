/**
 * HospitalAdminExportHistoryPage — Phase 3 V2 Enterprise
 *
 * Consultation de l'historique des exports Staff Planner.
 * Read-only, orientée audit RH.
 *
 * Layout :
 *  - Tableau des batches (paginé, filtrable)
 *  - Drawer latéral : détail batch + liste snapshots
 *  - Panel inline : détail snapshot avec payloadLines
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";
import VerifiedIcon from "@mui/icons-material/Verified";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import YearSelect from "../../components/YearSelect";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import exportsHistoryApi, {
  type ExportBatch,
  type ExportSnapshotSummary,
  type ExportSnapshotDetail,
  type BatchListFilters,
} from "../../services/exportsHistoryApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function shortHash(hash: string): string {
  return hash.slice(0, 8) + "…";
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function actorLabel(type: string): string {
  switch (type) {
    case "manager":        return "Manager";
    case "hospital_admin": return "Admin hôpital";
    case "app_admin":      return "Super Admin";
    default:               return type;
  }
}

// ── SnapshotDetailPanel ───────────────────────────────────────────────────────

const SnapshotDetailPanel = ({
  snapshotId,
  onClose,
}: {
  snapshotId: number;
  onClose: () => void;
}) => {
  const { data, isLoading, isError } = useQuery<ExportSnapshotDetail>({
    queryKey: ["sp-snapshot-detail", snapshotId],
    queryFn:  () => exportsHistoryApi.getSnapshotDetail(snapshotId),
  });

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          Détail snapshot #{snapshotId}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Box>

      {isLoading && <CircularProgress size={20} />}
      {isError   && <Alert severity="error" sx={{ mb: 1 }}>Erreur de chargement.</Alert>}

      {data && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Mois</Typography>
              <Typography variant="body2">{MONTHS_FR[data.month - 1]} {data.calendarYear}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Heures</Typography>
              <Typography variant="body2">{fmtMinutes(data.totalMinutes)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Timesheets / Gardes / Absences</Typography>
              <Typography variant="body2">{data.timesheetCount} / {data.gardeHospitalCount} / {data.absenceCount}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Validé MDS au moment export</Typography>
              <Typography variant="body2" color={data.validatedByMdsAtExport ? "success.main" : "text.secondary"} fontWeight={700}>
                {data.validatedByMdsAtExport ? "Oui" : "Non"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Worker HRID</Typography>
              <Typography variant="body2" fontFamily="monospace">{data.workerHRIDAtExport ?? "—"}</Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Fingerprint SHA-256 (au moment export)
            </Typography>
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ wordBreak: "break-all", bgcolor: "grey.100", p: 0.5, borderRadius: 0.5, fontSize: "0.7rem" }}
            >
              {data.dataFingerprint}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Lignes Staff Planner exportées
            </Typography>
            <Box
              component="pre"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.72rem",
                bgcolor: "#1e1e1e",
                color: "#d4d4d4",
                p: 1.5,
                borderRadius: 1,
                overflowX: "auto",
                maxHeight: 200,
                overflowY: "auto",
                m: 0,
              }}
            >
              {data.payloadLines || "— aucune ligne —"}
            </Box>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

// ── BatchDrawer ───────────────────────────────────────────────────────────────

const BatchDrawer = ({
  batch,
  onClose,
}: {
  batch: ExportBatch;
  onClose: () => void;
}) => {
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<number | null>(null);

  const { data: snapshotsData, isLoading, isError } = useQuery({
    queryKey: ["sp-snapshots", batch.id],
    queryFn:  () => exportsHistoryApi.listSnapshots(batch.id),
  });

  const snapshots = snapshotsData?.data ?? [];

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", md: 720 }, p: 3, overflowY: "auto" } }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Export #{batch.batchNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fmtDateTime(batch.generatedAt)} — {actorLabel(batch.generatedByType)}
          </Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      {/* Métadonnées */}
      <Stack direction="row" spacing={3} flexWrap="wrap" mb={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">MACCS exportés</Typography>
          <Typography variant="body2" fontWeight={700}>{batch.itemCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Taille fichier</Typography>
          <Typography variant="body2">{fmtBytes(batch.fileSizeBytes)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">SHA-256 fichier</Typography>
          <Tooltip title={batch.fileHash} arrow>
            <Typography variant="body2" fontFamily="monospace" sx={{ cursor: "help" }}>
              {shortHash(batch.fileHash)}
            </Typography>
          </Tooltip>
        </Box>
        {batch.notes && (
          <Box>
            <Typography variant="caption" color="text.secondary">Notes</Typography>
            <Typography variant="body2">{batch.notes}</Typography>
          </Box>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Snapshots */}
      <Typography variant="subtitle1" fontWeight={700} mb={1}>
        MACCS dans cet export
      </Typography>

      {isLoading && (
        <Stack spacing={1}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={52} variant="rectangular" sx={{ borderRadius: 1 }} />)}
        </Stack>
      )}
      {isError && <Alert severity="error">Erreur de chargement des snapshots.</Alert>}

      {!isLoading && !isError && snapshots.length === 0 && (
        <Alert severity="info">Aucun snapshot dans ce batch.</Alert>
      )}

      {snapshots.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">MACCS</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">MOIS</Typography></TableCell>
                <TableCell>
                  <Tooltip title="Validé MDS au moment de l'export" arrow>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ cursor: "help", textDecoration: "underline dotted" }}>
                      MDS
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">HEURES</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">TS</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">GARDES</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">ABS</Typography></TableCell>
                <TableCell>
                  <Tooltip title="Fingerprint SHA-256 au moment de l'export" arrow>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ cursor: "help", textDecoration: "underline dotted" }}>
                      FP
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots.map((s: ExportSnapshotSummary) => (
                <>
                  <TableRow
                    key={s.id}
                    hover
                    sx={{ cursor: "pointer", bgcolor: expandedSnapshotId === s.id ? "action.selected" : undefined }}
                    onClick={() => setExpandedSnapshotId(expandedSnapshotId === s.id ? null : s.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {[s.residentLastname, s.residentFirstname].filter(Boolean).join(" ") || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{MONTHS_FR[s.month - 1]} {s.calendarYear}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={s.validatedByMdsAtExport ? 700 : 400}
                        color={s.validatedByMdsAtExport ? "success.main" : "text.secondary"}
                      >
                        {s.validatedByMdsAtExport ? <VerifiedIcon fontSize="small" /> : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{fmtMinutes(s.totalMinutes)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.timesheetCount}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.gardeHospitalCount}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.absenceCount}</Typography></TableCell>
                    <TableCell>
                      <Tooltip title={s.dataFingerprint} arrow>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.7rem" sx={{ cursor: "help" }}>
                          {shortHash(s.dataFingerprint)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell padding="checkbox">
                      <IconButton size="small">
                        {expandedSnapshotId === s.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow key={`detail-${s.id}`}>
                    <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedSnapshotId === s.id} unmountOnExit>
                        <Box sx={{ px: 2, pb: 2 }}>
                          <SnapshotDetailPanel
                            snapshotId={s.id}
                            onClose={() => setExpandedSnapshotId(null)}
                          />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Drawer>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const HospitalAdminExportHistoryPage = () => {
  useAxiosPrivate();

  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedBatch, setSelectedBatch] = useState<ExportBatch | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<BatchListFilters>({ limit: 20 });
  const [searchBatchNumber, setSearchBatchNumber] = useState("");
  const [filterByType, setFilterByType] = useState("");

  // Années
  const { data: years = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["ha-history-years"],
    queryFn:  hospitalAdminApi.listMyYears,
  });

  // Batches
  const activeFilters: BatchListFilters = useMemo(() => ({
    ...filters,
    page,
    batchNumber:     searchBatchNumber ? Number(searchBatchNumber) : undefined,
    generatedByType: filterByType || undefined,
  }), [filters, page, searchBatchNumber, filterByType]);

  const {
    data:      batchResult,
    isLoading: batchLoading,
    isError:   batchError,
  } = useQuery({
    queryKey: ["sp-batches", selectedYearId, activeFilters],
    queryFn:  () => exportsHistoryApi.listBatches(selectedYearId as number, activeFilters),
    enabled:  typeof selectedYearId === "number",
  });

  const batches    = batchResult?.data ?? [];
  const totalBatch = batchResult?.total ?? 0;
  const totalPages = Math.ceil(totalBatch / (filters.limit ?? 20));

  const handleYearChange = (id: number) => {
    setSelectedYearId(id);
    setSelectedBatch(null);
    setPage(1);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <Box p={3} maxWidth={1200} mx="auto">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <HistoryIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Historique des exports</Typography>
            <Typography variant="body2" color="text.secondary">
              Audit des exports Staff Planner — lecture seule
            </Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 380 }}>
          <YearSelect
            years={years}
            value={selectedYearId}
            onChange={(id) => id !== "" && handleYearChange(id)}
            disabled={yearsLoading}
          />
        </Box>
      </Box>

      {selectedYearId === "" ? (
        <Alert severity="info">Sélectionnez une année académique pour consulter l'historique des exports.</Alert>
      ) : (
        <>
          {/* Filtres */}
          <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="flex-end">
            <TextField
              size="small"
              label="N° batch"
              value={searchBatchNumber}
              onChange={(e) => { setSearchBatchNumber(e.target.value); handleFilterChange(); }}
              sx={{ width: 120 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Type d'acteur</InputLabel>
              <Select
                value={filterByType}
                label="Type d'acteur"
                onChange={(e) => { setFilterByType(e.target.value); handleFilterChange(); }}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="hospital_admin">Admin hôpital</MenuItem>
                <MenuItem value="app_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            {(searchBatchNumber || filterByType) && (
              <Button
                size="small"
                onClick={() => { setSearchBatchNumber(""); setFilterByType(""); setPage(1); }}
              >
                Réinitialiser
              </Button>
            )}
          </Box>

          {/* Tableau batches */}
          {batchLoading ? (
            <Stack spacing={1}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} height={52} variant="rectangular" sx={{ borderRadius: 1 }} />)}
            </Stack>
          ) : batchError ? (
            <Alert severity="error">Erreur lors du chargement de l'historique.</Alert>
          ) : batches.length === 0 ? (
            <Alert severity="info">
              {totalBatch === 0 ? "Aucun export trouvé pour cette année." : "Aucun résultat avec ces filtres."}
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">#</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">DATE</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700} color="text.secondary">ACTEUR</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700} color="text.secondary">MACCS</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700} color="text.secondary">TAILLE</Typography></TableCell>
                      <TableCell>
                        <Tooltip title="SHA-256 du fichier .txt généré" arrow>
                          <Typography variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ cursor: "help", textDecoration: "underline dotted" }}>
                            HASH
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow
                        key={batch.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => setSelectedBatch(batch)}
                        selected={selectedBatch?.id === batch.id}
                      >
                        <TableCell>
                          <Chip
                            label={`#${batch.batchNumber}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{fmtDateTime(batch.generatedAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={actorLabel(batch.generatedByType)}
                            size="small"
                            variant="outlined"
                            color={batch.generatedByType === "hospital_admin" ? "secondary" : "default"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>{batch.itemCount}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">{fmtBytes(batch.fileSizeBytes)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={batch.fileHash} arrow>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" sx={{ cursor: "help" }}>
                              {shortHash(batch.fileHash)}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell padding="checkbox">
                          <IconButton size="small" aria-label="Voir détail">
                            <ExpandMoreIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center">
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {totalBatch} export{totalBatch > 1 ? "s" : ""} au total
              </Typography>
            </>
          )}
        </>
      )}

      {/* Drawer détail batch */}
      {selectedBatch && (
        <BatchDrawer
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </Box>
  );
};

export default HospitalAdminExportHistoryPage;
