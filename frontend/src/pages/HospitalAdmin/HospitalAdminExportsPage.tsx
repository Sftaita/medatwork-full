import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useTableDensity } from "../../hooks/useTableDensity";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

import { T, C, bodyRowSx } from "../../styles/tableStyles";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import exportsRhApi, {
  type LockResult,
  type StaffPlannerMonthGroup,
  type StaffPlannerItem,
  type SpImportItem,
  type YearResident,
} from "../../services/exportsRhApi";
import YearSelect from "../../components/YearSelect";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clé de sélection locale : yearResidentId-month-calendarYear (indépendant de ResidentValidation) */
function itemKey(item: StaffPlannerItem, group: StaffPlannerMonthGroup): string {
  return `${item.yearResidentId}-${group.month}-${group.calendarYear}`;
}

function fullName(item: StaffPlannerItem): string {
  return [item.residentFirstname, item.residentLastname].filter(Boolean).join(" ") || "—";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Tutorial modal ────────────────────────────────────────────────────────────

const TutorialModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      Guide — Exports RH
      <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Onglet Staff Planner</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Génère un fichier <code>.txt</code> pour le logiciel Staff Planner contenant les horaires des résidents.
            Les validations sont organisées par mois, avec un résultat par MACCS.
          </Typography>
          <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2, "& li": { mb: 0.5 } }}>
            <li><Typography variant="body2">Sélectionnez l'année académique.</Typography></li>
            <li><Typography variant="body2">Les lignes <strong>non traitées</strong> sont présélectionnées automatiquement.</Typography></li>
            <li><Typography variant="body2">Développez les mois pour voir les MACCS concernés.</Typography></li>
            <li><Typography variant="body2">Cochez / décochez individuellement ou via les cases de mois.</Typography></li>
            <li><Typography variant="body2">Cliquez <strong>Générer</strong> — fichier téléchargé, lignes passent en <em>Traité</em>.</Typography></li>
            <li><Typography variant="body2">Le switch <em>Traité</em> permet de corriger manuellement.</Typography></li>
          </Box>
        </Box>
        <Divider />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Colonnes du tableau</Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              <strong>Validé MDS</strong> — V = le maître de stage a validé l'horaire de ce résident pour ce mois.
              Informatif — ne bloque pas la génération.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Statut</strong> — indique si cet item a été inclus dans un export Staff Planner.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Exports</strong> — nombre de fois que ce MACCS × mois a été exporté, avec la date du dernier export.
            </Typography>
          </Stack>
        </Box>
        <Divider />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Onglet Excel</Typography>
          <Typography variant="body2" color="text.secondary">
            Génère un fichier Excel <strong>par résident</strong> couvrant toute l'année académique.
          </Typography>
        </Box>
        <Divider />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Accès</Typography>
          <Typography variant="body2" color="text.secondary">
            Admin hôpital, Super Admin, et Managers Ressources Humaines.
          </Typography>
        </Box>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Fermer</Button>
    </DialogActions>
  </Dialog>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const HospitalAdminExportsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const [tab, setTab] = useState(0);
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [initialized, setInitialized] = useState(false);
  // Selection : Set<"yearResidentId-month-calendarYear">
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchSp, setSearchSp] = useState("");
  const [searchExcel, setSearchExcel] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // ── Fetch years ─────────────────────────────────────────────────────────────

  const { data: years = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["ha-exports-years"],
    queryFn: hospitalAdminApi.listMyYears,
  });

  // Périodes uniques triées du plus récent au plus ancien (pattern dashboard)
  const periods = useMemo(() => {
    const unique = [...new Set(years.map((y) => y.period).filter(Boolean))];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [years]);

  useEffect(() => {
    if (initialized || years.length === 0) return;
    const today = new Date();
    const active =
      years.find((y) => {
        const s = new Date(y.dateOfStart);
        const e = new Date(y.dateOfEnd);
        return today >= s && today <= e;
      }) ??
      years.find((y) => y.status === "active") ??
      years[0];
    setSelectedYearId(active.id);
    setSelectedPeriod(active.period ?? periods[0] ?? "");
    setInitialized(true);
  }, [years, initialized, periods]);

  // ── Fetch months ─────────────────────────────────────────────────────────────

  const {
    data: monthGroups = [],
    isLoading: monthsLoading,
    isError: monthsError,
  } = useQuery({
    queryKey: ["ha-exports-months", selectedYearId],
    queryFn: () => exportsRhApi.listStaffPlannerMonths(selectedYearId as number),
    enabled: typeof selectedYearId === "number",
  });

  // Pre-select untreated items when data loads
  useEffect(() => {
    const allItems = monthGroups.flatMap((g) =>
      g.items.map((i) => ({ item: i, group: g })),
    );
    if (allItems.length === 0) return;
    setSelected(
      new Set(allItems.filter(({ item }) => !item.treated).map(({ item, group }) => itemKey(item, group))),
    );
  }, [monthGroups]);

  // ── Fetch residents (Excel tab) ─────────────────────────────────────────────

  const {
    data: residents = [],
    isLoading: residentsLoading,
    isError: residentsError,
  } = useQuery({
    queryKey: ["ha-exports-residents", selectedYearId],
    queryFn: () => exportsRhApi.listYearResidents(selectedYearId as number),
    enabled: typeof selectedYearId === "number",
  });

  // ── Treated mutation ─────────────────────────────────────────────────────────

  const treatedMutation = useMutation({
    mutationFn: ({ yearResidentId, month, calendarYear, treated }: {
      yearResidentId: number; month: number; calendarYear: number; treated: boolean;
    }) => exportsRhApi.setItemTreated(yearResidentId, month, calendarYear, treated),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ha-exports-months", selectedYearId] }),
    onError: () => toast.error("Erreur lors de la mise à jour du statut."),
  });

  // ── Lock mutation (Phase 5) ───────────────────────────────────────────────

  const [lockDialog, setLockDialog] = useState<{
    item: typeof monthGroups[0]["items"][0];
    group: typeof monthGroups[0];
    action: "lock" | "unlock";
  } | null>(null);
  const [lockReason, setLockReason] = useState("");

  const lockMutation = useMutation<LockResult, Error, {
    yearResidentId: number; month: number; calendarYear: number; locked: boolean; reason: string;
  }>({
    mutationFn: ({ yearResidentId, month, calendarYear, locked, reason }) =>
      exportsRhApi.setItemLock(yearResidentId, month, calendarYear, locked, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ha-exports-months", selectedYearId] });
      setLockDialog(null);
      setLockReason("");
      toast.success("Statut de clôture mis à jour.");
    },
    onError: () => toast.error("Erreur lors de la mise à jour de la clôture."),
  });

  const confirmLock = () => {
    if (!lockDialog) return;
    lockMutation.mutate({
      yearResidentId: lockDialog.item.yearResidentId,
      month:          lockDialog.group.month,
      calendarYear:   lockDialog.group.calendarYear,
      locked:         lockDialog.action === "lock",
      reason:         lockReason,
    });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleYearChange = (yearId: number) => {
    const year = years.find((y) => y.id === yearId);
    setSelectedYearId(yearId);
    if (year?.period) setSelectedPeriod(year.period);
    setSelected(new Set());
    setSearchSp("");
    setSearchExcel("");
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const yearsInPeriod = years.filter((y) => y.period === period);
    const today = new Date();
    const best =
      yearsInPeriod.find((y) => {
        const s = new Date(y.dateOfStart);
        const e = new Date(y.dateOfEnd);
        return today >= s && today <= e;
      }) ??
      yearsInPeriod.find((y) => y.status === "active") ??
      yearsInPeriod[0];
    if (best) {
      setSelectedYearId(best.id);
      setSelected(new Set());
      setSearchSp("");
      setSearchExcel("");
    }
  };

  const toggleItem = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleMonth = (group: StaffPlannerMonthGroup) => {
    const keys = group.items.map((i) => itemKey(i, group));
    const allChecked = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const toggleAll = (groups: StaffPlannerMonthGroup[]) => {
    const allKeys = groups.flatMap((g) => g.items.map((i) => itemKey(i, g)));
    const allChecked = allKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        allKeys.forEach((k) => next.delete(k));
      } else {
        allKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  /** Pré-sélectionne uniquement les items modifiés depuis leur dernier export. */
  const selectDirty = () => {
    const dirtyKeys = monthGroups
      .flatMap((g) => g.items.map((i) => ({ item: i, group: g })))
      .filter(({ item }) => item.dirtySinceExport)
      .map(({ item, group }) => itemKey(item, group));
    setSelected(new Set(dirtyKeys));
  };

  /** Pré-sélectionne les items non traités (comportement initial). */
  const selectUntreated = () => {
    const untreatedKeys = monthGroups
      .flatMap((g) => g.items.map((i) => ({ item: i, group: g })))
      .filter(({ item }) => !item.treated)
      .map(({ item, group }) => itemKey(item, group));
    setSelected(new Set(untreatedKeys));
  };

  const handleGenerateStaffPlanner = async () => {
    if (selected.size === 0) return;
    // Build items from selected keys "yearResidentId-month-calendarYear"
    const items: SpImportItem[] = [...selected].map((key) => {
      const [yrId, month, calYear] = key.split("-").map(Number);
      return { yearResidentId: yrId, month, calendarYear: calYear };
    });
    setGenerating(true);
    try {
      const blob = await exportsRhApi.generateStaffPlanner(items);
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href  = url;
      link.download = "Horaire-StaffPlanner.txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Fichier Staff Planner généré.");
      qc.invalidateQueries({ queryKey: ["ha-exports-months", selectedYearId] });
    } catch (err: any) {
      let msg = "Erreur lors de la génération.";
      try {
        // responseType:'blob' → response.data est un Blob même pour les erreurs
        const blob: Blob | undefined = err?.response?.data;
        if (blob instanceof Blob) {
          const text = await blob.text();
          const json = JSON.parse(text);
          if (json?.errors?.length) msg = "Ressources HRID manquantes pour certains résidents.";
          else if (json?.message)   msg = json.message;
        }
      } catch {}
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExcelDownload = async (resident: YearResident) => {
    if (typeof selectedYearId !== "number") return;
    const name = [resident.firstname, resident.lastname].filter(Boolean).join(" ") || "resident";
    setDownloadingId(resident.id);
    try {
      await exportsRhApi.downloadResidentExcel(selectedYearId, resident.id, name);
      toast.success(`Excel téléchargé pour ${name}`);
    } catch (err: any) {
      toast.error(err?.response?.status === 401 ? "Accès refusé." : "Erreur lors du téléchargement.");
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const filteredGroups: StaffPlannerMonthGroup[] = monthGroups
    .map((g) => ({
      ...g,
      items: searchSp.trim()
        ? g.items.filter((i) => {
            const q = searchSp.toLowerCase();
            return (
              fullName(i).toLowerCase().includes(q) ||
              (i.residentEmail ?? "").toLowerCase().includes(q) ||
              g.label.toLowerCase().includes(q)
            );
          })
        : g.items,
    }))
    .filter((g) => !searchSp.trim() || g.items.length > 0);

  const allItemsFlat = filteredGroups.flatMap((g) => g.items.map((i) => ({ item: i, group: g })));
  const allSelected  = allItemsFlat.length > 0 && allItemsFlat.every(({ item, group }) => selected.has(itemKey(item, group)));
  const someSelected = allItemsFlat.some(({ item, group }) => selected.has(itemKey(item, group))) && !allSelected;

  const filteredResidents = searchExcel.trim()
    ? residents.filter((r) => {
        const q = searchExcel.toLowerCase();
        return (
          (r.firstname ?? "").toLowerCase().includes(q) ||
          (r.lastname ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
        );
      })
    : residents;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box sx={{ ...T.pageHead, mb: 3 }}>
        <Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography sx={T.pageTitle}>Exports RH</Typography>
            <Tooltip title="Guide d'utilisation" arrow>
              <IconButton onClick={() => setTutorialOpen(true)} size="small" sx={{ color: C.ink3 }}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography sx={T.pageSub}>Staff Planner et exports Excel annuels par MACCS</Typography>
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
        <Alert severity="info">Sélectionnez une année académique.</Alert>
      ) : (
        <>
          {/* Barre de navigation : contenu + périodes */}
          <Box
            borderBottom={1}
            borderColor="divider"
            mb={3}
            display="flex"
            alignItems="center"
            overflow="hidden"
          >
            {/* Onglets contenu */}
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ flexShrink: 0 }}
            >
              <Tab label="Staff Planner" />
              <Tab label="Excel" />
            </Tabs>

            {/* Divider vertical léger */}
            {periods.length > 0 && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{ mx: 1.5, my: 1, borderColor: "divider" }}
              />
            )}

            {/* Onglets de périodes (style dashboard) */}
            {periods.length > 0 && (
              <Tabs
                value={selectedPeriod || false}
                onChange={(_, v) => handlePeriodChange(v as string)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  "& .MuiTab-root": {
                    fontSize: "0.8rem",
                    minHeight: 48,
                    color: "text.secondary",
                    textTransform: "none",
                  },
                  "& .Mui-selected": { color: "text.primary", fontWeight: 600 },
                  "& .MuiTabs-indicator": { backgroundColor: "text.secondary" },
                }}
              >
                {periods.map((p) => (
                  <Tab key={p} label={p} value={p} />
                ))}
              </Tabs>
            )}
          </Box>

          {/* ── Tab 0 — Staff Planner ─────────────────────────────────────── */}
          {tab === 0 && (
            <>
              <Box sx={{ ...T.toolbar, mb: 2 }}>
                <Typography sx={{ ...T.pageSub, flex: 1 }}>
                  Sélectionnez les validations à exporter. Les lignes non traitées sont présélectionnées.
                </Typography>
                <TextField
                  placeholder="Rechercher un MACCS ou mois…"
                  value={searchSp}
                  onChange={(e) => setSearchSp(e.target.value)}
                  sx={T.search}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  }}
                />
                <DensityToggleButton density={density} onCycle={cycleDensity} />
              </Box>

              {monthsLoading ? (
                <Stack spacing={1} mb={2}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
                </Stack>
              ) : monthsError ? (
                <Alert severity="error" sx={{ mb: 2 }}>Erreur lors du chargement des mois.</Alert>
              ) : filteredGroups.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {searchSp ? "Aucun résultat." : "Aucune validation pour cette année."}
                </Alert>
              ) : (
                <>
                  {/* Barre sélection globale + pré-sélection */}
                  <Box display="flex" alignItems="center" gap={1} mb={1} px={0.5} flexWrap="wrap">
                    <Checkbox
                      indeterminate={someSelected}
                      checked={allSelected}
                      onChange={() => toggleAll(filteredGroups as StaffPlannerMonthGroup[])}
                      size="small"
                      aria-label="Tout sélectionner"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      {selected.size > 0
                        ? `${selected.size} validation${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""}`
                        : "Tout sélectionner / désélectionner"}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={selectUntreated}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      aria-label="Présélectionner les non traités"
                    >
                      Non traités
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={selectDirty}
                      startIcon={<WarningAmberIcon fontSize="small" />}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      aria-label="Présélectionner les modifiés depuis export"
                    >
                      Modifiés depuis export
                    </Button>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Button
                      variant="contained"
                      onClick={handleGenerateStaffPlanner}
                      disabled={selected.size === 0 || generating}
                      startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                      {generating
                        ? "Génération en cours…"
                        : `Générer Staff Planner${selected.size > 0 ? ` (${selected.size})` : ""}`}
                    </Button>
                    {selected.size === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Sélectionnez au moins une validation
                      </Typography>
                    )}
                  </Box>

                  <Stack spacing={1} mb={2}>
                    {filteredGroups.map((group) => {
                      const keys        = group.items.map((i) => itemKey(i, group));
                      const allChecked  = keys.length > 0 && keys.every((k) => selected.has(k));
                      const someChecked = keys.some((k) => selected.has(k)) && !allChecked;
                      const treatedCount = group.items.filter((i) => i.treated).length;

                      return (
                        <Accordion key={`${group.calendarYear}-${group.month}`} variant="outlined" disableGutters>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1.5} width="100%">
                              <Box onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  indeterminate={someChecked}
                                  checked={allChecked}
                                  onChange={() => toggleMonth(group)}
                                  size="small"
                                  disabled={keys.length === 0}
                                  aria-label={`Sélectionner ${group.label}`}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight={600} flex={1}>
                                {group.label}
                              </Typography>
                              {keys.length > 0 ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    label={`${keys.length} MACCS`}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                  {treatedCount > 0 && (
                                    <Chip
                                      label={`${treatedCount} traité${treatedCount > 1 ? "s" : ""}`}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              ) : (
                                <Chip label="Aucune validation" size="small" variant="outlined" />
                              )}
                            </Box>
                          </AccordionSummary>

                          {group.items.length === 0 ? (
                            <AccordionDetails sx={{ py: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Aucune validation pour ce mois.
                              </Typography>
                            </AccordionDetails>
                          ) : (
                            <AccordionDetails sx={{ p: 0 }}>
                              <Box sx={T.wrap}>
                                <Table sx={T.table}>
                                  <TableHead>
                                    <TableRow sx={T.headRow}>
                                      <TableCell padding="checkbox" />
                                      <TableCell>MACCS</TableCell>
                                      <TableCell>EMAIL</TableCell>
                                      <TableCell>
                                        <Tooltip title="V = horaire validé par le maître de stage. Informatif — ne bloque pas l'export." arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>VALIDÉ MDS</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip title="⚠ Modifié depuis export : les données ont changé depuis le dernier export Staff Planner." arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>MODIF.</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>STATUT</TableCell>
                                      <TableCell>
                                        <Tooltip title="Nombre d'exports Staff Planner incluant ce MACCS pour ce mois" arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>EXPORTS</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip title="Clôture RH officielle — bloque toute modification" arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>CLÔTURE</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>TRAITÉ</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {group.items.map((item) => {
                                      const key = itemKey(item, group);
                                      return (
                                      <TableRow
                                        key={key}
                                        hover
                                        onClick={() => toggleItem(key)}
                                        sx={{
                                          cursor: "pointer",
                                          ...bodyRowSx(density),
                                          ...(selected.has(key) ? { bgcolor: `${C.brand50} !important` } : {}),
                                        }}
                                      >
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                          <Checkbox
                                            checked={selected.has(key)}
                                            onChange={() => toggleItem(key)}
                                            size="small"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Box sx={T.person}>
                                            <Avatar
                                              src={item.residentAvatarUrl ?? undefined}
                                              sx={T.avatar}
                                            >
                                              {!item.residentAvatarUrl && <PersonIcon sx={{ fontSize: 16 }} />}
                                            </Avatar>
                                            <Box>
                                              <Box sx={T.name}>{fullName(item)}</Box>
                                            </Box>
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          <Box sx={T.sub}>{item.residentEmail ?? "—"}</Box>
                                        </TableCell>
                                        <TableCell>
                                          <Box
                                            component="span"
                                            sx={{
                                              fontWeight: item.validatedByMds ? 700 : 400,
                                              color: item.validatedByMds ? C.ok : C.ink3,
                                              fontSize: 13,
                                            }}
                                          >
                                            {item.validatedByMds ? "V" : "—"}
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          {item.dirtySinceExport ? (
                                            <Tooltip
                                              title={`Modifié depuis export${item.dirtyReason ? ` (${item.dirtyReason})` : ""}${item.dirtyAt ? ` — ${fmtDate(item.dirtyAt)}` : ""}`}
                                              arrow
                                            >
                                              <Chip
                                                label="Modifié"
                                                size="small"
                                                color="warning"
                                                variant="outlined"
                                                icon={<WarningAmberIcon />}
                                                aria-label="Modifié depuis export"
                                                sx={{ cursor: "help" }}
                                              />
                                            </Tooltip>
                                          ) : (
                                            <Typography variant="body2" color="text.disabled">—</Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={item.treated ? "Traité" : "Non traité"}
                                            size="small"
                                            color={item.treated ? "success" : "default"}
                                            variant="outlined"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {item.downloadCount > 0 ? (
                                            <Tooltip
                                              title={`Dernier export : ${fmtDate(item.lastGeneratedAt)}`}
                                              arrow
                                            >
                                              <Chip
                                                label={`×${item.downloadCount}`}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                                sx={{ fontVariantNumeric: "tabular-nums", cursor: "help" }}
                                              />
                                            </Tooltip>
                                          ) : (
                                            <Typography variant="body2" color="text.disabled">—</Typography>
                                          )}
                                        </TableCell>
                                        {/* ── CLÔTURE cell ── */}
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                          {item.locked ? (
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                              <Tooltip
                                                title={`Clôturé${item.lockedAt ? ` le ${fmtDate(item.lockedAt)}` : ""}${item.lockReason ? ` — ${item.lockReason}` : ""}`}
                                                arrow
                                              >
                                                <Chip
                                                  label="Verrouillé RH"
                                                  size="small"
                                                  color="error"
                                                  icon={<LockIcon />}
                                                  sx={{ cursor: "help" }}
                                                />
                                              </Tooltip>
                                              <Tooltip title="Déverrouiller la période" arrow>
                                                <span>
                                                  <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => { setLockDialog({ item, group, action: "unlock" }); setLockReason(""); }}
                                                    aria-label={`Déverrouiller ${fullName(item)} — ${group.label}`}
                                                    disabled={lockMutation.isPending}
                                                  >
                                                    <LockOpenIcon fontSize="small" />
                                                  </IconButton>
                                                </span>
                                              </Tooltip>
                                            </Stack>
                                          ) : (
                                            <Tooltip title="Clôturer officiellement la période — bloque toute modification" arrow>
                                              <span>
                                                <IconButton
                                                  size="small"
                                                  onClick={() => { setLockDialog({ item, group, action: "lock" }); setLockReason(""); }}
                                                  aria-label={`Clôturer ${fullName(item)} — ${group.label}`}
                                                  disabled={lockMutation.isPending}
                                                >
                                                  <LockOpenIcon fontSize="small" />
                                                </IconButton>
                                              </span>
                                            </Tooltip>
                                          )}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                          <Switch
                                            size="small"
                                            checked={item.treated}
                                            onChange={() =>
                                              treatedMutation.mutate({
                                                yearResidentId: item.yearResidentId,
                                                month: group.month,
                                                calendarYear: group.calendarYear,
                                                treated: !item.treated,
                                              })
                                            }
                                            disabled={treatedMutation.isPending}
                                            aria-label={`Marquer ${fullName(item)} — ${group.label} comme traité`}
                                          />
                                        </TableCell>
                                      </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </Box>
                            </AccordionDetails>
                          )}
                        </Accordion>
                      );
                    })}
                  </Stack>

                </>
              )}
            </>
          )}

          {/* ── Tab 1 — Excel ─────────────────────────────────────────────── */}
          {tab === 1 && (
            <>
              <Box sx={{ ...T.toolbar, mb: 2 }}>
                <Typography sx={{ ...T.pageSub, flex: 1 }}>
                  Téléchargez le fichier Excel annuel pour chaque MACCS.
                </Typography>
                <TextField
                  placeholder="Rechercher un MACCS…"
                  value={searchExcel}
                  onChange={(e) => setSearchExcel(e.target.value)}
                  sx={T.search}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  }}
                />
                <DensityToggleButton density={density} onCycle={cycleDensity} />
              </Box>

              {residentsLoading ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
                </Stack>
              ) : residentsError ? (
                <Alert severity="error">Erreur lors du chargement.</Alert>
              ) : filteredResidents.length === 0 ? (
                <Alert severity="info">
                  {residents.length === 0 ? "Aucun MACCS pour cette année." : "Aucun résultat."}
                </Alert>
              ) : (
                <Box sx={T.card}>
                  <Box sx={T.wrap}>
                    <Table sx={T.table}>
                      <TableHead>
                        <TableRow sx={T.headRow}>
                          <TableCell>NOM</TableCell>
                          <TableCell>EMAIL</TableCell>
                          <TableCell>STATUT</TableCell>
                          <TableCell align="right">EXPORT</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredResidents.map((r) => {
                          const name = [r.firstname, r.lastname].filter(Boolean).join(" ") || "—";
                          const isDownloading = downloadingId === r.id;
                          return (
                            <TableRow key={r.id} hover sx={bodyRowSx(density)}>
                              <TableCell>
                                <Box sx={T.person}>
                                  <Avatar alt={name} sx={T.avatar}>
                                    <PersonIcon fontSize="small" />
                                  </Avatar>
                                  <Box>
                                    <Box sx={T.name}>{name}</Box>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={T.sub}>{r.email ?? "—"}</Box>
                              </TableCell>
                              <TableCell>
                                <Chip label="Actif" size="small" color="success" variant="outlined" />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Télécharger le fichier Excel annuel" arrow>
                                  <span>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={isDownloading}
                                      onClick={() => handleExcelDownload(r)}
                                      sx={{ position: "relative" }}
                                    >
                                      <span style={{ visibility: isDownloading ? "hidden" : "visible" }}>
                                        Excel annuel
                                      </span>
                                      {isDownloading && (
                                        <CircularProgress size={14} color="inherit" sx={{ position: "absolute" }} />
                                      )}
                                    </Button>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                  <Box sx={T.footer}>
                    <Typography variant="caption" sx={{ color: C.ink3 }}>
                      {filteredResidents.length} MACCS
                    </Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </>
      )}

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* ── Lock / Unlock Confirmation Dialog ──────────────────────────── */}
      <Dialog
        open={lockDialog !== null}
        onClose={() => { if (!lockMutation.isPending) { setLockDialog(null); setLockReason(""); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {lockDialog?.action === "lock" ? "Clôturer la période" : "Déverrouiller la période"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {lockDialog && (
              <Typography variant="body2" color="text.secondary">
                {lockDialog.action === "lock"
                  ? `Clôturer la période bloquera toute modification des horaires pour ${fullName(lockDialog.item)} — ${lockDialog.group.label}. Cette action est enregistrée dans l'audit RH.`
                  : `Déverrouiller permettra à nouveau les modifications pour ${fullName(lockDialog.item)} — ${lockDialog.group.label}.`}
              </Typography>
            )}
            {lockDialog?.action === "lock" && (
              <TextField
                label="Raison de la clôture"
                placeholder="Ex. : Clôture définitive décembre 2024"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                fullWidth
                required
                autoFocus
                size="small"
                helperText="Obligatoire — sera enregistré dans l'audit RH."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLockDialog(null); setLockReason(""); }} disabled={lockMutation.isPending}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color={lockDialog?.action === "lock" ? "error" : "warning"}
            onClick={confirmLock}
            disabled={lockMutation.isPending || (lockDialog?.action === "lock" && lockReason.trim() === "")}
            startIcon={
              lockMutation.isPending
                ? <CircularProgress size={16} color="inherit" />
                : lockDialog?.action === "lock" ? <LockIcon /> : <LockOpenIcon />
            }
          >
            {lockMutation.isPending
              ? "En cours…"
              : lockDialog?.action === "lock" ? "Clôturer" : "Déverrouiller"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalAdminExportsPage;
