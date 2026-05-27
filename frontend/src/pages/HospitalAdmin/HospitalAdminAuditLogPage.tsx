import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTopbarSearch } from "../../hooks/useTopbarSearch";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { T, C, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { AuditLogEntry } from "../../services/hospitalAdminApi";

// ── Action label/color ────────────────────────────────────────────────────────

type TFn = (key: string, opts?: any) => string;
const getActionLabel = (action: string, t: TFn): string =>
  t(`haAudit.actions.${action}`) !== `haAudit.actions.${action}`
    ? t(`haAudit.actions.${action}`)
    : action;

const ACTION_BADGE: Record<string, { bg: string; color: string }> = {
  create_maccs:          { bg: C.okBg,     color: C.ok   },
  create_manager:        { bg: C.okBg,     color: C.ok   },
  create_year:           { bg: C.okBg,     color: C.ok   },
  import_csv:            { bg: C.okBg,     color: C.ok   },
  delete_maccs:          { bg: C.errBg,    color: C.err  },
  delete_manager:        { bg: C.errBg,    color: C.err  },
  delete_year:           { bg: C.errBg,    color: C.err  },
  retire_maccs:          { bg: C.warnBg,   color: C.warn },
  retire_manager:        { bg: C.warnBg,   color: C.warn },
  bulk_edit:             { bg: "#e0f0ff",  color: "#1e5fa8" },
  update_year:           { bg: "#e0f0ff",  color: "#1e5fa8" },
  resend_invite_maccs:   { bg: C.surface2, color: C.ink3 },
  resend_invite_manager: { bg: C.surface2, color: C.ink3 },
};

const PAGE_SIZE = 25;

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Help modal ────────────────────────────────────────────────────────────────

const HelpModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const items = t("haAudit.help.items", { returnObjects: true }) as [string, string][];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("haAudit.help.title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>{t("haAudit.help.intro")}</Typography>
        <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>{t("haAudit.help.trackedTitle")}</Typography>
        <List dense disablePadding>
          {items.map(([action, detail]) => (
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
        <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>{t("haAudit.help.whoTitle")}</Typography>
        <Typography variant="body2">{t("haAudit.help.whoBody")}</Typography>
        <Typography variant="body2" fontWeight={600} mt={2} mb={0.5}>{t("haAudit.help.retentionTitle")}</Typography>
        <Typography variant="body2">{t("haAudit.help.retentionBody")}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">{t("haAudit.help.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const HospitalAdminAuditLogPage = () => {
  const { t } = useTranslation();
  useAxiosPrivate();
  const { density, cycleDensity } = useTableDensity();
  const search = useTopbarSearch(t("haAudit.colAdmin") + ", " + t("haAudit.colAction") + "…");
  const [page, setPage] = useState(1);

  // Reset page quand la recherche topbar change
  useEffect(() => { setPage(1); }, [search]);
  const [sortCol, setSortCol] = useState<"date" | "admin" | "action" | null>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // plus récent en premier par défaut
  const [helpOpen, setHelpOpen] = useState(false);
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Load all entries at once so we can filter client-side
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hospital-admin-audit-log"],
    queryFn: () => hospitalAdminApi.getAuditLog(1000, 0),
  });

  type SortCol = "date" | "admin" | "action";
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!data?.logs) return [];
    const q = search.trim().toLowerCase();
    const base = data.logs.filter((log: AuditLogEntry) => {
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
      if (q) {
        const actionLabel = getActionLabel(log.action, t).toLowerCase();
        if (
          !log.adminName.toLowerCase().includes(q) &&
          !actionLabel.includes(q) &&
          !log.description.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    return [...base].sort((a: AuditLogEntry, b: AuditLogEntry) => {
      let cmp = 0;
      switch (sortCol) {
        case "date":   cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case "admin":  cmp = a.adminName.localeCompare(b.adminName, "fr", { sensitivity: "base" }); break;
        case "action": cmp = getActionLabel(a.action, t).localeCompare(getActionLabel(b.action, t), "fr", { sensitivity: "base" }); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, filterAction, filterFrom, filterTo, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = Boolean(filterAction || filterFrom || filterTo || search.trim());

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
    const csvHeaders = t("haAudit.csvHeaders", { returnObjects: true }) as string[];
    const rows = [
      csvHeaders,
      ...filtered.map((l: AuditLogEntry) => [
        new Date(l.createdAt).toLocaleString("fr-BE"),
        l.adminName,
        getActionLabel(l.action, t),
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
      {/* Header */}
      <Box sx={{ pt: 3, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography sx={T.pageTitle}>{t("haAudit.title")}</Typography>
          <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: C.ink3 }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography sx={T.pageSub}>
          {t("haAudit.subtitle")}
          {data && ` — ${t("haAudit.entriesCount", { count: data.total, suffix: data.total > 1 ? "s" : "" })}`}
        </Typography>
      </Box>

      {/* Filters + actions — même ligne */}
      <Box sx={{ ...T.toolbar, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t("haAudit.filterActionType")}</InputLabel>
          <Select
            value={filterAction}
            label={t("haAudit.filterActionType")}
            onChange={(e) => handleFilterChange(setFilterAction)(e.target.value)}
          >
            <MenuItem value="">{t("haAudit.filterAllActions")}</MenuItem>
            {Object.keys(t("haAudit.actions", { returnObjects: true }) as object).map((key) => (
              <MenuItem key={key} value={key}>{getActionLabel(key, t)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label={t("haAudit.filterFrom")}
          type="date"
          size="small"
          value={filterFrom}
          onChange={(e) => handleFilterChange(setFilterFrom)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label={t("haAudit.filterTo")}
          type="date"
          size="small"
          value={filterTo}
          onChange={(e) => handleFilterChange(setFilterTo)(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        {hasFilters && (
          <Button size="small" onClick={handleResetFilters} sx={{ whiteSpace: "nowrap" }}>
            {t("haAudit.reset")}
          </Button>
        )}

        {/* Poussé à droite */}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {hasFilters && (
            <Typography variant="caption" sx={{ color: C.ink3, whiteSpace: "nowrap" }}>
              {t("haAudit.resultsCount", { count: filtered.length, suffix: filtered.length !== 1 ? "s" : "" })}
            </Typography>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportCsv}
            disabled={!filtered.length}
            sx={{ borderRadius: "8px", height: 36, fontSize: 13, whiteSpace: "nowrap" }}
          >
            {t("haAudit.exportCsv")}
          </Button>
          <DensityToggleButton density={density} onCycle={cycleDensity} />
        </Box>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress sx={{ color: C.brand600 }} /></Box>}
      {isError && <Alert severity="error" sx={{ borderRadius: "10px" }}>{t("haAudit.loadError")}</Alert>}

      {!isLoading && data && filtered.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {hasFilters ? t("haAudit.noResults") : t("haAudit.noEntries")}
        </Alert>
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          <Box sx={T.card}>
            <Box sx={T.wrap}>
              <Table sx={T.table}>
                <TableHead>
                  <TableRow sx={T.headRow}>
                    {(
                      [
                        { col: "date",   label: t("haAudit.colDate"),   width: 150 },
                        { col: "admin",  label: t("haAudit.colAdmin"),  width: 160 },
                        { col: "action", label: t("haAudit.colAction"), width: 180 },
                      ] as { col: SortCol; label: string; width: number }[]
                    ).map(({ col, label, width }) => (
                      <TableCell
                        key={col}
                        onClick={() => handleSort(col)}
                        sx={{ width, cursor: "pointer", "&:hover": { color: C.ink } }}
                      >
                        <Box display="inline-flex" alignItems="center" gap="4px">
                          {label}
                          {sortCol === col
                            ? sortDir === "asc"
                              ? <ArrowUpwardIcon sx={{ fontSize: 11 }} />
                              : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                            : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                          }
                        </Box>
                      </TableCell>
                    ))}
                    <TableCell>{t("haAudit.colDesc")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogs.map((log: AuditLogEntry) => {
                    const badge = ACTION_BADGE[log.action] ?? { bg: C.surface2, color: C.ink3 };
                    return (
                      <TableRow key={log.id} sx={{ ...bodyRowSx(density), cursor: "default" }}>
                        <TableCell sx={{ fontSize: 12, color: C.ink3, whiteSpace: "nowrap" }}>
                          {new Date(log.createdAt).toLocaleString("fr-BE")}
                        </TableCell>
                        <TableCell>
                          <Box sx={T.name}>{log.adminName}</Box>
                        </TableCell>
                        <TableCell>
                          <Box component="span" sx={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            px: "10px", py: "3px", borderRadius: "999px",
                            fontSize: 11, fontWeight: 600,
                            bgcolor: badge.bg, color: badge.color,
                            "&::before": {
                              content: '""', width: 6, height: 6,
                              borderRadius: "50%", bgcolor: badge.color, flexShrink: 0,
                            },
                          }}>
                            {getActionLabel(log.action, t)}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: C.ink2, fontSize: 13 }}>{log.description}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            <Box sx={T.footer}>
              <Typography variant="caption">
                {t("haAudit.entriesCount", { count: filtered.length, suffix: filtered.length !== 1 ? "s" : "" })}
              </Typography>
              {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </>
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Container>
  );
};

export default HospitalAdminAuditLogPage;
