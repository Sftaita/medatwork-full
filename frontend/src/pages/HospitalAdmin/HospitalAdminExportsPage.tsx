import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchStore } from "../../store/searchStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useTableDensity } from "../../hooks/useTableDensity";
import { useUserSettings, DEFAULT_SETTINGS } from "../../hooks/useUserSettings";

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
import TablePagination from "@mui/material/TablePagination";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

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

const TutorialModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const steps = t("haExp.tutorial.spSteps", { returnObjects: true }) as string[];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {t("haExp.tutorial.title")}
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t("haExp.tutorial.spTitle")}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>{t("haExp.tutorial.spDesc")}</Typography>
            <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2, "& li": { mb: 0.5 } }}>
              {steps.map((step, i) => (
                <li key={i}><Typography variant="body2">{step}</Typography></li>
              ))}
            </Box>
          </Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t("haExp.tutorial.colsTitle")}</Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">{t("haExp.tutorial.colValidated")}</Typography>
              <Typography variant="body2" color="text.secondary">{t("haExp.tutorial.colStatus")}</Typography>
              <Typography variant="body2" color="text.secondary">{t("haExp.tutorial.colExports")}</Typography>
            </Stack>
          </Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t("haExp.tutorial.excelTitle")}</Typography>
            <Typography variant="body2" color="text.secondary">{t("haExp.tutorial.excelDesc")}</Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t("haExp.tutorial.accessTitle")}</Typography>
            <Typography variant="body2" color="text.secondary">{t("haExp.tutorial.accessDesc")}</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("haExp.tutorial.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── HRID Missing Modal ────────────────────────────────────────────────────────

interface HridResident { firstname: string | null; lastname: string | null; }

const HridMissingModal = ({
  residents,
  onClose,
  onGoToParams,
}: {
  residents: HridResident[];
  onClose: () => void;
  onGoToParams: () => void;
}) => {
  const { t } = useTranslation();
  const steps = t("haExp.hrid.steps", { returnObjects: true }) as string[];
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <ErrorOutlineIcon color="info" />
        {t("haExp.hrid.title")}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">{t("haExp.hrid.intro")}</Typography>
          <Stack spacing={0.75} pl={1}>
            <Typography variant="body2"><strong>{t("haExp.hrid.workerHrid")}</strong></Typography>
            <Typography variant="body2"><strong>{t("haExp.hrid.sectionHrid")}</strong></Typography>
          </Stack>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {t("haExp.hrid.affected", { count: residents.length })}
            </Typography>
            <Stack spacing={0.5}>
              {residents.map((r, i) => (
                <Box key={i} display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "info.main", flexShrink: 0 }} />
                  <Typography variant="body2">
                    {[r.firstname, r.lastname].filter(Boolean).join(" ") || "—"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t("haExp.hrid.howToFix")}</Typography>
            <Stack spacing={0.75} pl={1}>
              {steps.map((step, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  <strong style={{ color: "#1a1620" }}>{i + 1}.</strong> {step}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">{t("haExp.hrid.close")}</Button>
        <Button variant="outlined" color="primary" endIcon={<ArrowForwardIcon />} onClick={onGoToParams}>
          {t("haExp.hrid.goToParams")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const HospitalAdminExportsPage = () => {
  const { t } = useTranslation();
  useAxiosPrivate();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { density, cycleDensity } = useTableDensity();
  const { data: userSettings } = useUserSettings();
  const excelPageSize = userSettings?.tables.staffPlanner.pageSize
    ?? DEFAULT_SETTINGS.tables.staffPlanner.pageSize;

  // Excel tab pagination
  const [excelPage, setExcelPage] = useState(0);

  const [hridErrors, setHridErrors] = useState<HridResident[] | null>(null);

  const [tab, setTab] = useState(0);
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [initialized, setInitialized] = useState(false);
  // Selection : Set<"yearResidentId-month-calendarYear">
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { register, unregister, value: searchValue, setValue: setSearchValue } = useSearchStore();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Topbar search — placeholder selon l'onglet actif
  useEffect(() => {
    register(tab === 0 ? t("haExp.colMaccs") + "…" : t("haExp.colName") + "…");
    return () => unregister();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
    onError: () => toast.error(t("haExp.toast.treatedError")),
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
      toast.success(t("haExp.toast.lockSuccess"));
    },
    onError: () => toast.error(t("haExp.toast.lockError")),
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
    setSearchValue("");
    setExcelPage(0);
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
      setSearchValue("");
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
      toast.success(t("haExp.toast.spGenerated"));
      qc.invalidateQueries({ queryKey: ["ha-exports-months", selectedYearId] });
    } catch (err: any) {
      try {
        // responseType:'blob' → response.data est un Blob même pour les erreurs
        const blob: Blob | undefined = err?.response?.data;
        if (blob instanceof Blob) {
          const text = await blob.text();
          const json = JSON.parse(text);
          if (json?.errors?.length) {
            // HRID manquants → modal guidé plutôt qu'un toast opaque
            setHridErrors(json.errors as HridResident[]);
            return;
          }
          if (json?.message) { toast.error(json.message); return; }
        }
      } catch {}
      toast.error(t("haExp.toast.spError"));
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
      toast.success(t("haExp.toast.excelOk", { name }));
    } catch (err: any) {
      toast.error(err?.response?.status === 401 ? t("haExp.toast.accessDenied") : t("haExp.toast.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  };

  // Stable sx object — density changes rarely, avoid Emotion re-serialize on every row
  const rowSx = useMemo(() => bodyRowSx(density), [density]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const spQuery    = tab === 0 ? searchValue.trim().toLowerCase() : "";
  const excelQuery = tab === 1 ? searchValue.trim().toLowerCase() : "";

  const filteredGroups: StaffPlannerMonthGroup[] = monthGroups
    .map((g) => ({
      ...g,
      items: spQuery
        ? g.items.filter((i) =>
            fullName(i).toLowerCase().includes(spQuery) ||
            (i.residentEmail ?? "").toLowerCase().includes(spQuery) ||
            g.label.toLowerCase().includes(spQuery)
          )
        : g.items,
    }))
    .filter((g) => !spQuery || g.items.length > 0);

  const allItemsFlat = filteredGroups.flatMap((g) => g.items.map((i) => ({ item: i, group: g })));
  const allSelected  = allItemsFlat.length > 0 && allItemsFlat.every(({ item, group }) => selected.has(itemKey(item, group)));
  const someSelected = allItemsFlat.some(({ item, group }) => selected.has(itemKey(item, group))) && !allSelected;

  const filteredResidents = excelQuery
    ? residents.filter((r) =>
        (r.firstname ?? "").toLowerCase().includes(excelQuery) ||
        (r.lastname ?? "").toLowerCase().includes(excelQuery) ||
        (r.email ?? "").toLowerCase().includes(excelQuery)
      )
    : residents;

  const paginatedResidents = filteredResidents.slice(
    excelPage * excelPageSize,
    (excelPage + 1) * excelPageSize,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box sx={{ ...T.pageHead, mb: 3 }}>
        <Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography sx={T.pageTitle}>{t("haExp.title")}</Typography>
            <Tooltip title={t("haExp.guideTooltip")} arrow>
              <IconButton onClick={() => setTutorialOpen(true)} size="small" sx={{ color: C.ink3 }}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography sx={T.pageSub}>{t("haExp.subtitle")}</Typography>
        </Box>
      </Box>

      {selectedYearId === "" && !yearsLoading ? (
        <Alert severity="info">{t("haExp.selectYear")}</Alert>
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
              <Tab label={t("haExp.tabSP")} />
              <Tab label={t("haExp.tabExcel")} />
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

          {/* Toolbar commune — sélection d'année + densité */}
          <Box sx={{ ...T.toolbar, mb: 2 }}>
            <Box sx={{ minWidth: 280 }}>
              <YearSelect
                years={years}
                value={selectedYearId}
                onChange={(id) => id !== "" && handleYearChange(id)}
                disabled={yearsLoading}
              />
            </Box>
            <Box sx={{ ml: "auto" }}>
              <DensityToggleButton density={density} onCycle={cycleDensity} />
            </Box>
          </Box>

          {/* ── Tab 0 — Staff Planner ─────────────────────────────────────── */}
          {tab === 0 && (
            <>
              <Box sx={{ ...T.toolbar, mb: 2 }}>
                <Typography sx={{ ...T.pageSub, flex: 1 }}>
                  {t("haExp.spDesc")}
                </Typography>
              </Box>

              {monthsLoading ? (
                <Stack spacing={1} mb={2}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
                </Stack>
              ) : monthsError ? (
                <Alert severity="error" sx={{ mb: 2 }}>{t("haExp.monthsError")}</Alert>
              ) : filteredGroups.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {spQuery ? t("haExp.noResults") : t("haExp.noValidationsYear")}
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
                        ? t("haExp.selectedCount", { count: selected.size, suffix: selected.size > 1 ? "s" : "" })
                        : t("haExp.selectAll")}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={selectUntreated}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      aria-label="Présélectionner les non traités"
                    >
                      {t("haExp.btnUntreated")}
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
                      {t("haExp.btnDirty")}
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
                        ? t("haExp.generating")
                        : selected.size > 0
                          ? t("haExp.btnGenerateCount", { count: selected.size })
                          : t("haExp.btnGenerate")}
                    </Button>
                    {selected.size === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {t("haExp.selectAtLeast")}
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
                                    label={t("haExp.maccsCount", { count: keys.length })}
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
                                <Chip label={t("haExp.chipNoValidation")} size="small" variant="outlined" />
                              )}
                            </Box>
                          </AccordionSummary>

                          {group.items.length === 0 ? (
                            <AccordionDetails sx={{ py: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {t("haExp.noValidationsMonth")}
                              </Typography>
                            </AccordionDetails>
                          ) : (
                            <AccordionDetails sx={{ p: 0 }}>
                              <Box sx={T.wrap}>
                                <Table sx={T.table}>
                                  <TableHead>
                                    <TableRow sx={T.headRow}>
                                      <TableCell padding="checkbox" />
                                      <TableCell>{t("haExp.colMaccs")}</TableCell>
                                      <TableCell>{t("haExp.colEmail")}</TableCell>
                                      <TableCell>
                                        <Tooltip title={t("haExp.tooltipValidatedMds")} arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>{t("haExp.colValidatedMds")}</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip title={t("haExp.tooltipModif")} arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>{t("haExp.colModif")}</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>{t("haExp.colStatus")}</TableCell>
                                      <TableCell>
                                        <Tooltip title={t("haExp.tooltipExports")} arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>{t("haExp.colExports")}</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip title={t("haExp.tooltipClosure")} arrow>
                                          <span style={{ cursor: "help", textDecoration: "underline dotted" }}>{t("haExp.colClosure")}</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>{t("haExp.colTreated")}</TableCell>
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
                                          ...rowSx,
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
                                                label={t("haExp.chipModified")}
                                                size="small"
                                                color="warning"
                                                variant="outlined"
                                                icon={<WarningAmberIcon />}
                                                aria-label={t("haExp.chipModifiedAriaLabel")}
                                                sx={{ cursor: "help" }}
                                              />
                                            </Tooltip>
                                          ) : (
                                            <Typography variant="body2" color="text.disabled">—</Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={item.treated ? t("haExp.chipTreated") : t("haExp.chipUntreated")}
                                            size="small"
                                            color={item.treated ? "success" : "default"}
                                            variant="outlined"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {item.downloadCount > 0 ? (
                                            <Tooltip
                                              title={t("haExp.lastExport", { date: fmtDate(item.lastGeneratedAt) })}
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
                                                  label={t("haExp.chipLocked")}
                                                  size="small"
                                                  color="error"
                                                  icon={<LockIcon />}
                                                  sx={{ cursor: "help" }}
                                                />
                                              </Tooltip>
                                              <Tooltip title={t("haExp.tooltipUnlock")} arrow>
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
                                            <Tooltip title={t("haExp.tooltipLock")} arrow>
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
                  {t("haExp.excelDesc")}
                </Typography>
              </Box>

              {residentsLoading ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
                </Stack>
              ) : residentsError ? (
                <Alert severity="error">{t("haExp.residentsError")}</Alert>
              ) : filteredResidents.length === 0 ? (
                <Alert severity="info">
                  {residents.length === 0 ? t("haExp.noMaccsYear") : t("haExp.noResults")}
                </Alert>
              ) : (
                <Box sx={T.card}>
                  <Box sx={T.wrap}>
                    <Table sx={T.table}>
                      <TableHead>
                        <TableRow sx={T.headRow}>
                          <TableCell>{t("haExp.colName")}</TableCell>
                          <TableCell>{t("haExp.colEmail")}</TableCell>
                          <TableCell>{t("haExp.colStatus")}</TableCell>
                          <TableCell align="right">{t("haExp.colExport")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedResidents.map((r) => {
                          const name = [r.firstname, r.lastname].filter(Boolean).join(" ") || "—";
                          const isDownloading = downloadingId === r.id;
                          return (
                            <TableRow key={r.id} hover sx={rowSx}>
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
                                <Chip label={t("haExp.chipActive")} size="small" color="success" variant="outlined" />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title={t("haExp.tooltipAnnualExcel")} arrow>
                                  <span>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={isDownloading}
                                      onClick={() => handleExcelDownload(r)}
                                      sx={{ position: "relative" }}
                                    >
                                      <span style={{ visibility: isDownloading ? "hidden" : "visible" }}>
                                        {t("haExp.btnAnnualExcel")}
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
                      {t("haExp.maccsCount", { count: filteredResidents.length })}
                    </Typography>
                  </Box>
                  {filteredResidents.length > excelPageSize && (
                    <TablePagination
                      component="div"
                      count={filteredResidents.length}
                      page={excelPage}
                      rowsPerPage={excelPageSize}
                      rowsPerPageOptions={[]}
                      onPageChange={(_, p) => setExcelPage(p)}
                      labelDisplayedRows={({ from, to, count }) => t("haExp.paginationOf", { from, to, count })}
                    />
                  )}
                </Box>
              )}
            </>
          )}
        </>
      )}

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* ── Modal HRID manquants ──────────────────────────────────────── */}
      {hridErrors !== null && (
        <HridMissingModal
          residents={hridErrors}
          onClose={() => setHridErrors(null)}
          onGoToParams={() => {
            setHridErrors(null);
            navigate("/manager/year-detail", {
              state: { yearId: selectedYearId, defaultTab: "setup" },
            });
          }}
        />
      )}

      {/* ── Lock / Unlock Confirmation Dialog ──────────────────────────── */}
      <Dialog
        open={lockDialog !== null}
        onClose={() => { if (!lockMutation.isPending) { setLockDialog(null); setLockReason(""); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {lockDialog?.action === "lock" ? t("haExp.lock.lockTitle") : t("haExp.lock.unlockTitle")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {lockDialog && (
              <Typography variant="body2" color="text.secondary">
                {lockDialog.action === "lock"
                  ? t("haExp.lock.lockBody", { name: fullName(lockDialog.item), month: lockDialog.group.label })
                  : t("haExp.lock.unlockBody", { name: fullName(lockDialog.item), month: lockDialog.group.label })}
              </Typography>
            )}
            {lockDialog?.action === "lock" && (
              <TextField
                label={t("haExp.lock.reasonLabel")}
                placeholder={t("haExp.lock.reasonPlaceholder")}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                fullWidth
                required
                autoFocus
                size="small"
                helperText={t("haExp.lock.reasonHelper")}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLockDialog(null); setLockReason(""); }} disabled={lockMutation.isPending}>
            {t("haExp.lock.cancel")}
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
              ? t("haExp.lock.inProgress")
              : lockDialog?.action === "lock" ? t("haExp.lock.lockBtn") : t("haExp.lock.unlockBtn")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalAdminExportsPage;
