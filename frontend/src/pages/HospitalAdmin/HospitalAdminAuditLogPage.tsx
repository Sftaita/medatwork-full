import { useState, useMemo, useEffect } from "react";
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
  const { density, cycleDensity } = useTableDensity();
  const search = useTopbarSearch("Admin, action, description…");
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
        const actionLabel = (ACTION_LABEL[log.action] ?? log.action).toLowerCase();
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
        case "action": cmp = (ACTION_LABEL[a.action] ?? a.action).localeCompare(ACTION_LABEL[b.action] ?? b.action, "fr", { sensitivity: "base" }); break;
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
      {/* Header */}
      <Box sx={{ pt: 3, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography sx={T.pageTitle}>Journal d'activité</Typography>
          <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: C.ink3 }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography sx={T.pageSub}>
          Toutes les actions effectuées par les administrateurs de l'hôpital
          {data && ` — ${data.total} entrée${data.total > 1 ? "s" : ""}`}
        </Typography>
      </Box>

      {/* Filters + actions — même ligne */}
      <Box sx={{ ...T.toolbar, mb: 2 }}>
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

        {/* Poussé à droite */}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {hasFilters && (
            <Typography variant="caption" sx={{ color: C.ink3, whiteSpace: "nowrap" }}>
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </Typography>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportCsv}
            disabled={!filtered.length}
            sx={{ borderRadius: "8px", height: 36, fontSize: 13, whiteSpace: "nowrap" }}
          >
            Exporter CSV
          </Button>
          <DensityToggleButton density={density} onCycle={cycleDensity} />
        </Box>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress sx={{ color: C.brand600 }} /></Box>}
      {isError && <Alert severity="error" sx={{ borderRadius: "10px" }}>Erreur lors du chargement du journal.</Alert>}

      {!isLoading && data && filtered.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {hasFilters ? "Aucun résultat pour ces filtres." : "Aucune action enregistrée pour le moment."}
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
                        { col: "date",   label: "Date",   width: 150 },
                        { col: "admin",  label: "Admin",  width: 160 },
                        { col: "action", label: "Action", width: 180 },
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
                    <TableCell>Description</TableCell>
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
                            {ACTION_LABEL[log.action] ?? log.action}
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
                {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
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
