import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useTopbarSearch } from "../../hooks/useTopbarSearch";
import { T, C, bodyRowSx, yearPillSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Drawer from "@mui/material/Drawer";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PeopleIcon from "@mui/icons-material/People";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

import adminApi from "../../services/adminApi";
import type { HospitalYear, Hospital } from "../../types/entities";

// ── Traduction des spécialités ─────────────────────────────────────────────────

const SPECIALITY_FR: Record<string, string> = {
  "cardiology":           "Cardiologie",
  "neurology":            "Neurologie",
  "pediatrics":           "Pédiatrie",
  "surgery":              "Chirurgie",
  "general surgery":      "Chirurgie générale",
  "orthopedics":          "Orthopédie",
  "internal medicine":    "Médecine interne",
  "emergency medicine":   "Médecine d'urgence",
  "anesthesiology":       "Anesthésiologie",
  "radiology":            "Radiologie",
  "psychiatry":           "Psychiatrie",
  "oncology":             "Oncologie",
  "gynecology":           "Gynécologie",
  "urology":              "Urologie",
  "dermatology":          "Dermatologie",
  "ophthalmology":        "Ophtalmologie",
  "ent":                  "ORL",
  "otolaryngology":       "ORL",
  "gastroenterology":     "Gastroentérologie",
  "nephrology":           "Néphrologie",
  "rheumatology":         "Rhumatologie",
  "endocrinology":        "Endocrinologie",
  "pulmonology":          "Pneumologie",
  "infectious disease":   "Maladies infectieuses",
  "hematology":           "Hématologie",
  "geriatrics":           "Gériatrie",
  "palliative care":      "Soins palliatifs",
  "neonatology":          "Néonatologie",
  "intensive care":       "Soins intensifs",
  "rehabilitation":       "Réhabilitation",
  "sport medicine":       "Médecine du sport",
  "general practice":     "Médecine générale",
  "family medicine":      "Médecine de famille",
};

function translateSpeciality(s: string | null | undefined): string {
  if (!s) return "";
  const key = s.trim().toLowerCase();
  return SPECIALITY_FR[key] ?? s;
}

// ── Row actions menu ───────────────────────────────────────────────────────────

const RowMenu = ({ onAssign }: { onAssign: () => void }) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
        sx={{ color: C.ink3, "&:hover": { bgcolor: C.surface2 } }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 180, borderRadius: "10px", boxShadow: C.shadow, border: `1px solid ${C.line}` } }}
      >
        <MenuItem
          onClick={() => { setAnchor(null); onAssign(); }}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <SwapHorizIcon fontSize="small" sx={{ color: C.ink3 }} />
          Changer l'hôpital
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Detail drawer ─────────────────────────────────────────────────────────────

const DetailDrawer = ({ year, onClose, onAssign }: {
  year: HospitalYear | null;
  onClose: () => void;
  onAssign: () => void;
}) => (
  <Drawer
    anchor="right"
    open={year !== null}
    onClose={onClose}
    PaperProps={{ sx: { width: { xs: "100%", sm: 380 } } }}
  >
    {year && (
      <Box display="flex" flexDirection="column" height="100%">
        {/* Header */}
        <Box px={3} pt={3} pb={2} borderBottom={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1} mr={1}>
              <Typography fontWeight={700} fontSize={16} lineHeight={1.3}>
                {year.title}
              </Typography>
              {year.speciality && (
                <Typography fontSize={12} sx={{ color: C.ink3, mt: "3px" }}>
                  {translateSpeciality(year.speciality)}
                </Typography>
              )}
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
          </Box>
        </Box>

        {/* Body */}
        <Box flex={1} overflow="auto" px={3} py={2}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Période
              </Typography>
              <Typography fontSize={13}>{year.period}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Lieu
              </Typography>
              <Box display="flex" alignItems="center" gap={0.75}>
                <LocationOnIcon sx={{ fontSize: 15, color: C.ink3 }} />
                <Typography fontSize={13}>{year.location || "—"}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Hôpital
              </Typography>
              <Box display="flex" alignItems="center" gap={0.75}>
                <LocalHospitalIcon sx={{ fontSize: 15, color: C.ink3 }} />
                {year.hospital ? (
                  <Typography fontSize={13}>{year.hospital.name}</Typography>
                ) : (
                  <Box component="span" sx={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    px: "10px", py: "3px", borderRadius: "999px",
                    fontSize: 11, fontWeight: 600, bgcolor: C.warnBg, color: C.warn,
                  }}>
                    Sans hôpital
                  </Box>
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Résidents
              </Typography>
              <Box display="flex" alignItems="center" gap={0.75}>
                <PeopleIcon sx={{ fontSize: 15, color: C.ink3 }} />
                <Box component="span" sx={yearPillSx(year.residentCount ?? 0)}>
                  {year.residentCount ?? 0}
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Dates
              </Typography>
              <Typography fontSize={13}>
                {new Date(year.dateOfStart).toLocaleDateString("fr-BE")}
                {" → "}
                {new Date(year.dateOfEnd).toLocaleDateString("fr-BE")}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Box px={3} py={2} borderTop={1} borderColor="divider" bgcolor={C.surface2}>
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            fullWidth
            onClick={() => { onClose(); onAssign(); }}
            sx={{ borderRadius: "8px", fontSize: 13 }}
          >
            Changer l'hôpital
          </Button>
        </Box>
      </Box>
    )}
  </Drawer>
);

// ── Main page ─────────────────────────────────────────────────────────────────

type SortCol = "titre" | "periode" | "hopital" | "residents";

const AdminYearsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const search = useTopbarSearch("Titre, période, hôpital…");
  const [hospitalFilter, setHospitalFilter] = useState<number | "none" | "">("");
  const [sortCol, setSortCol] = useState<SortCol | null>("titre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [detailYear, setDetailYear] = useState<HospitalYear | null>(null);
  const [assignTarget, setAssignTarget] = useState<HospitalYear | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | "">("");

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: years = [], isLoading: loadingYears } = useQuery({
    queryKey: ["admin-all-years"],
    queryFn: adminApi.listAllYears,
  });

  const { data: hospitals = [], isLoading: loadingHospitals } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: adminApi.listHospitals,
  });

  const assignMutation = useMutation({
    mutationFn: ({ yearId, hospitalId }: { yearId: number; hospitalId: number }) =>
      adminApi.assignYearHospital(yearId, hospitalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-years"] });
      toast.success("Hôpital mis à jour.");
      setAssignTarget(null);
      setSelectedHospitalId("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la réattribution"),
  });

  // ── Hospital filter options ────────────────────────────────────────────────
  const hospitalOptions = useMemo(() => {
    const seen = new Map<number, string>();
    (years as HospitalYear[]).forEach((y) => {
      if (y.hospital) seen.set(y.hospital.id, y.hospital.name);
    });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [years]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = (years as HospitalYear[]).filter((y) => {
      if (hospitalFilter === "none" && y.hospital) return false;
      if (typeof hospitalFilter === "number" && y.hospital?.id !== hospitalFilter) return false;
      return (
        y.title.toLowerCase().includes(q) ||
        y.period.toLowerCase().includes(q) ||
        (y.location ?? "").toLowerCase().includes(q) ||
        (y.speciality ?? "").toLowerCase().includes(q) ||
        translateSpeciality(y.speciality).toLowerCase().includes(q) ||
        (y.hospital?.name ?? "").toLowerCase().includes(q)
      );
    });

    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "titre":
          cmp = a.title.localeCompare(b.title, "fr", { sensitivity: "base" }); break;
        case "periode":
          cmp = a.period.localeCompare(b.period, "fr"); break;
        case "hopital":
          cmp = (a.hospital?.name ?? "").localeCompare(b.hospital?.name ?? "", "fr", { sensitivity: "base" }); break;
        case "residents":
          cmp = (a.residentCount ?? 0) - (b.residentCount ?? 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [years, q, hospitalFilter, sortCol, sortDir]);

  const openAssign = (year: HospitalYear) => {
    setAssignTarget(year);
    setSelectedHospitalId(year.hospital?.id ?? "");
  };

  // ── Sort header helper ─────────────────────────────────────────────────────
  const SortHead = ({
    col, label, align, width,
  }: { col: SortCol; label: string; align?: "center" | "right"; width?: number }) => (
    <TableCell
      align={align}
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
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p={3} maxWidth={1400} mx="auto">

      {/* Header */}
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>Années de stage</Typography>
          <Typography sx={T.pageSub}>Vue globale — toutes années, tous hôpitaux</Typography>
        </Box>
      </Box>

      {/* Toolbar */}
      <Box sx={T.toolbar}>
        {/* Filtre hôpital */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ fontSize: 13 }}>Hôpital</InputLabel>
          <Select
            value={hospitalFilter}
            label="Hôpital"
            onChange={(e) => setHospitalFilter(e.target.value as number | "none" | "")}
            sx={{ fontSize: 13, height: 38, borderRadius: "8px" }}
          >
            <MenuItem value="" sx={{ fontSize: 13 }}>Tous</MenuItem>
            <MenuItem value="none" sx={{ fontSize: 13, fontStyle: "italic", color: C.warn }}>
              Sans hôpital
            </MenuItem>
            {hospitalOptions.map(([id, name]) => (
              <MenuItem key={id} value={id} sx={{ fontSize: 13 }}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="caption" sx={{ color: C.ink3, ml: "auto" }}>
          {filtered.length} année{filtered.length !== 1 ? "s" : ""}
        </Typography>

        <DensityToggleButton density={density} onCycle={cycleDensity} />
      </Box>

      {/* Table */}
      {loadingYears ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress sx={{ color: C.brand600 }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {years.length === 0 ? "Aucune année enregistrée." : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <SortHead col="titre"     label="Titre" />
                  <SortHead col="periode"   label="Période"   width={130} />
                  <SortHead col="hopital"   label="Hôpital"   width={220} />
                  <SortHead col="residents" label="Résidents" align="center" width={100} />
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((year: HospitalYear) => (
                  <TableRow
                    key={year.id}
                    sx={bodyRowSx(density)}
                    onClick={() => setDetailYear(year)}
                  >
                    {/* Titre + spécialité */}
                    <TableCell>
                      <Box sx={T.name}>{year.title}</Box>
                      {year.speciality && (
                        <Box sx={{ ...T.sub, fontFamily: "inherit", mt: "2px" }}>
                          {translateSpeciality(year.speciality)}
                        </Box>
                      )}
                    </TableCell>

                    {/* Période */}
                    <TableCell sx={{ color: C.ink2, fontSize: 13 }}>{year.period}</TableCell>

                    {/* Hôpital */}
                    <TableCell>
                      {year.hospital ? (
                        <Typography sx={{ fontSize: 13, color: C.ink2 }}>
                          {year.hospital.name}
                        </Typography>
                      ) : (
                        <Tooltip title="Non rattachée à un hôpital" arrow>
                          <Box component="span" sx={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            px: "10px", py: "3px", borderRadius: "999px",
                            fontSize: 11, fontWeight: 600,
                            bgcolor: C.warnBg, color: C.warn,
                            "&::before": {
                              content: '""', width: 6, height: 6,
                              borderRadius: "50%", bgcolor: C.warn, flexShrink: 0,
                            },
                          }}>
                            Sans hôpital
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>

                    {/* Résidents */}
                    <TableCell align="center">
                      <Box component="span" sx={yearPillSx(year.residentCount ?? 0)}>
                        {year.residentCount ?? 0}
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu onAssign={() => openAssign(year)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Footer */}
          <Box sx={T.footer}>
            <Typography variant="caption">
              {filtered.length} sur {years.length} année{years.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Detail drawer */}
      <DetailDrawer
        year={detailYear}
        onClose={() => setDetailYear(null)}
        onAssign={() => detailYear && openAssign(detailYear)}
      />

      {/* Assign hospital dialog */}
      <Dialog
        open={assignTarget !== null}
        onClose={() => { setAssignTarget(null); setSelectedHospitalId(""); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Changer l'hôpital</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" mb={2}>
            Année : <strong>{assignTarget?.title}</strong>
          </Typography>
          {loadingHospitals ? (
            <CircularProgress size={20} />
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel>Hôpital</InputLabel>
              <Select
                value={selectedHospitalId}
                label="Hôpital"
                onChange={(e) => setSelectedHospitalId(e.target.value as number)}
              >
                {(hospitals as Hospital[]).map((h) => (
                  <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssignTarget(null); setSelectedHospitalId(""); }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!selectedHospitalId || assignMutation.isPending}
            onClick={() =>
              assignTarget &&
              selectedHospitalId !== "" &&
              assignMutation.mutate({ yearId: assignTarget.id, hospitalId: selectedHospitalId as number })
            }
            sx={{ bgcolor: C.brand600, "&:hover": { bgcolor: C.brand700 } }}
          >
            {assignMutation.isPending ? <CircularProgress size={20} /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminYearsPage;
