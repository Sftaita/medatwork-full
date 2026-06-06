import { useState, useEffect, useCallback, useMemo } from "react";
import UserAvatar from "../../../../components/small/UserAvatar";
import { useTranslation } from "react-i18next";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { toast } from "react-toastify";

import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import residentsApi from "../../../../services/residentsApi";
import yearsApi from "../../../../services/yearsApi";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";
import DateHandler from "../../../../components/medium/DateHandler";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Resident {
  residentId: number;
  yearResidentId: number;
  firstname: string;
  lastname: string;
  email: string;
  lastConnection?: string;
  allowed: boolean;
  avatarPath?: string | null;
  dateOfStart?: string;
  optingOut?: boolean;
  legalLeaves?: number;
  scientificLeaves?: number;
  maternityLeaves?: number;
  paternityLeaves?: number;
  unpaidLeavesLeaves?: number;
}

type FilterKey = "all" | "ok" | "pending";

// ── Constants ─────────────────────────────────────────────────────────────────

const AV_COLORS = [
  "#7B3FA0", "#2f7fc4", "#1f9d57", "#d9803a",
  "#c4477f", "#5b54c9", "#2a9d9d", "#b5852a",
];

function getInitials(first: string, last: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase();
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ allowed }: { allowed: boolean }) {
  const theme = useTheme();
  const isOk = allowed;
  const color  = isOk ? theme.palette.success.dark  : theme.palette.warning.main;
  const bgRing = isOk ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.warning.main, 0.12);

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: "7px",
        fontSize: 12.5, fontWeight: 600, color,
        whiteSpace: "nowrap",
      }}
    >
      <Box sx={{
        width: 22, height: 22, borderRadius: 999,
        bgcolor: bgRing, color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flex: "none",
      }}>
        {isOk
          ? <CheckIcon sx={{ fontSize: 13 }} />
          : <AccessTimeIcon sx={{ fontSize: 13 }} />}
      </Box>
      {isOk ? "Validé" : "En attente"}
    </Box>
  );
}

// ── Opting-out toggle (same visual as ValidateToggle in General) ───────────────

function OptingToggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  const theme = useTheme();
  return (
    <Box
      component="button"
      role="switch"
      aria-checked={value}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onChange(); }}
      sx={{
        display: "flex", alignItems: "center", gap: "12px",
        border: "none", background: "transparent", cursor: "pointer",
        fontFamily: "inherit", fontSize: 14, fontWeight: 500,
        color: "text.primary", p: "12px 0 4px",
        "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, borderRadius: 4 },
      }}
    >
      <Box sx={{
        width: 46, height: 26, borderRadius: 999,
        bgcolor: value ? theme.palette.success.main : alpha(theme.palette.text.disabled, 0.3),
        position: "relative",
        transition: theme.transitions.create("background-color"),
        flex: "none",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}>
        <Box sx={{
          position: "absolute", top: 3, width: 20, height: 20,
          borderRadius: 999, bgcolor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          left: value ? 23 : 3,
          transition: theme.transitions.create("left"),
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }} />
      </Box>
      Opting out
    </Box>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FChip({ label, count, active, countVariant = "neutral", onClick }: {
  label: string; count: number; active: boolean;
  countVariant?: "neutral" | "ok" | "pending";
  onClick: () => void;
}) {
  const theme = useTheme();
  const badgeBg =
    active             ? alpha("#fff", 0.22) :
    countVariant === "ok"      ? alpha(theme.palette.success.main, 0.1) :
    countVariant === "pending" ? alpha(theme.palette.warning.main, 0.1) :
    theme.palette.background.default;
  const badgeColor =
    active             ? "#fff" :
    countVariant === "ok"      ? theme.palette.success.dark :
    countVariant === "pending" ? theme.palette.warning.main :
    theme.palette.text.secondary;

  return (
    <Box
      component="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      sx={{
        display: "inline-flex", alignItems: "center", gap: "7px",
        px: "13px", py: "8px", borderRadius: "10px",
        border: `1px solid ${active ? "transparent" : theme.palette.divider}`,
        bgcolor: active ? theme.palette.text.primary : "background.paper",
        color: active ? "#fff" : "text.secondary",
        fontWeight: 600, fontSize: 12.5, fontFamily: "inherit",
        cursor: "pointer", flex: "none",
        transition: theme.transitions.create(["background", "color"]),
        "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      {label}
      <Box component="span" sx={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
        px: "6px", py: "1px", borderRadius: 999,
        bgcolor: badgeBg, color: badgeColor,
      }}>
        {count}
      </Box>
    </Box>
  );
}

// ── Table header row ──────────────────────────────────────────────────────────

const ROW_GRID = { xs: "24px 1fr auto", sm: "44px 1.4fr 2fr 1fr 1.1fr" };

function TableHeader() {
  const theme = useTheme();
  return (
    <Box
      display="grid"
      sx={{
        gridTemplateColumns: ROW_GRID,
        gap: { xs: "10px", sm: "16px" },
        px: { xs: "16px", sm: "20px" },
        height: 50,
        bgcolor:     theme.palette.custom.primarySofter,
        borderBottom: `1px solid ${theme.palette.divider}`,
        alignItems:  "center",
        fontSize:    11,
        fontWeight:  700,
        letterSpacing: ".09em",
        textTransform: "uppercase",
        color:       "text.disabled",
        // Header masqué sur mobile
        display:     { xs: "none", sm: "grid" },
      }}
    >
      <Box />
      <Box>Nom</Box>
      <Box>Email</Box>
      <Box>Statut</Box>
      <Box>Dernière connexion</Box>
    </Box>
  );
}

// ── Resident row ──────────────────────────────────────────────────────────────

interface ResidentRowProps {
  resident: Resident;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  adminRights: boolean;
  yearId: number;
  fetchResidentList: () => void;
}

function ResidentRow({ resident, index, isOpen, onToggle, adminRights, yearId, fetchResidentList }: ResidentRowProps) {
  const { t } = useTranslation();
  const theme  = useTheme();
  const axiosPrivate = useAxiosPrivate();

  // Edit state (local — reset on open)
  const [dateOfStart,      setDateOfStart]      = useState(resident.dateOfStart ?? "");
  const [optingOut,        setOptingOut]         = useState(resident.optingOut ?? false);
  const [legalLeaves,      setLegalLeaves]       = useState(resident.legalLeaves ?? 0);
  const [scientificLeaves, setScientificLeaves]  = useState(resident.scientificLeaves ?? 0);
  const [maternityLeaves,  setMaternityLeaves]   = useState(resident.maternityLeaves ?? 0);
  const [paternityLeaves,  setPaternityLeaves]   = useState(resident.paternityLeaves ?? 0);
  const [unpaidLeaves,     setUnpaidLeaves]      = useState(resident.unpaidLeavesLeaves ?? 0);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Reset form when row is opened/closed
  useEffect(() => {
    if (isOpen) {
      setDateOfStart(resident.dateOfStart ?? "");
      setOptingOut(resident.optingOut ?? false);
      setLegalLeaves(resident.legalLeaves ?? 0);
      setScientificLeaves(resident.scientificLeaves ?? 0);
      setMaternityLeaves(resident.maternityLeaves ?? 0);
      setPaternityLeaves(resident.paternityLeaves ?? 0);
      setUnpaidLeaves(resident.unpaidLeavesLeaves ?? 0);
    }
  }, [isOpen, resident]);

  const handleSave = async () => {
    setSaving(true);
    const data = { dateOfStart, optingOut, legalLeaves, scientificLeaves, maternityLeaves, paternityLeaves, unpaidLeaves };
    try {
      const { method, url } = yearsApi.updateYearResident();
      await axiosPrivate[method](url + resident.yearResidentId, data);
      toast.success(t("yearDetail.residentTable.updated", "Modifications enregistrées"), toastSuccess);
      onToggle();
      fetchResidentList();
    } catch (error) {
      handleApiError(error);
      toast.error(t("yearDetail.residentTable.updateError", "Erreur lors de la mise à jour"), toastError);
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const { method, url } = yearsApi.UpdateYearResidentRelation();
      await axiosPrivate[method](url, { yearId, residentId: resident.residentId, status: true });
      toast.success("Demande acceptée !", toastSuccess);
      fetchResidentList();
    } catch (error) {
      handleApiError(error);
      toast.error("Erreur lors de l'acceptation", toastError);
    } finally {
      setAccepting(false);
    }
  };

  const handleDisable = async () => {
    try {
      const { method, url } = yearsApi.deleteYearResidentRelation();
      await axiosPrivate[method](url + resident.yearResidentId);
      toast.success("MACCS désactivé", toastSuccess);
      fetchResidentList();
    } catch (error) {
      handleApiError(error);
    }
  };

  const leaveField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
  ) => (
    <TextField
      label={label}
      type="number"
      size="small"
      fullWidth
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      inputProps={{ min: 0 }}
    />
  );

  return (
    <Box
      data-testid={`resident-row-${resident.residentId}`}
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        "&:last-child": { borderBottom: "none" },
        boxShadow: isOpen ? `inset 3px 0 0 ${theme.palette.primary.main}` : "none",
      }}
    >
      {/* ── Table row ──────────────────────────────────────────────────── */}
      <Box
        display="grid"
        role="row"
        aria-expanded={isOpen}
        data-testid={`resident-cell-${resident.residentId}`}
        onClick={onToggle}
        sx={{
          gridTemplateColumns: ROW_GRID,
          gap:        { xs: "10px", sm: "16px" },
          px:         { xs: "16px", sm: "20px" },
          minHeight:  70,
          alignItems: "center",
          cursor:     "pointer",
          bgcolor:    isOpen ? theme.palette.custom.primarySofter : "transparent",
          "&:hover":  { bgcolor: theme.palette.custom.primarySofter },
          transition: theme.transitions.create("background"),
        }}
      >
        {/* Chevron */}
        <Box sx={{
          width: { xs: 24, sm: 26 }, height: { xs: 24, sm: 26 },
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isOpen ? "primary.main" : "text.disabled",
          transition: theme.transitions.create("transform"),
          transform: isOpen ? "rotate(180deg)" : "none",
        }}>
          <ChevronRightIcon sx={{ fontSize: 16, transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }} />
        </Box>

        {/* Avatar + Nom */}
        <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
          <UserAvatar
            firstname={resident.firstname}
            lastname={resident.lastname}
            avatarPath={resident.avatarPath}
            size={34}
            color={AV_COLORS[index % AV_COLORS.length]}
            fontSize={12}
          />
          <Typography fontWeight={600} fontSize={14} noWrap>
            {resident.firstname} {resident.lastname}
          </Typography>
        </Box>

        {/* Email — masqué sur mobile */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", minWidth: 0 }}>
          <Typography
            noWrap
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "text.secondary" }}
          >
            {resident.email ?? ""}
          </Typography>
        </Box>

        {/* Statut */}
        <Box>
          <StatusPill allowed={resident.allowed} />
        </Box>

        {/* Dernière connexion — masquée sur mobile */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}>
          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "text.secondary" }}>
            {resident.lastConnection ?? "—"}
          </Typography>
        </Box>
      </Box>

      {/* ── Edit form ─────────────────────────────────────────────────── */}
      <Collapse in={isOpen} timeout={200} unmountOnExit>
        <Box sx={{ p: { xs: "8px 16px 22px", sm: "8px 24px 26px" } }}>
          <Box
            display="grid"
            sx={{
              gridTemplateColumns: { xs: "1fr", sm: "1.1fr 1.3fr" },
              gap:              { xs: "22px", sm: "28px" },
              borderTop:        `1px dashed ${theme.palette.divider}`,
              pt:               "18px",
            }}
          >
            {/* Col 1 — Informations générales */}
            <Box>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13.5, fontWeight: 600, mb: 2 }}>
                {t("yearDetail.residentTable.generalInfo", "Informations générales")}
              </Typography>
              <DateHandler
                label={t("yearDetail.residentTable.startDate", "Début de l'année académique")}
                value={dateOfStart}
                onChange={(v: string) => setDateOfStart(v)}
                size="small"
              />
              <OptingToggle value={optingOut} onChange={() => setOptingOut((p) => !p)} />
            </Box>

            {/* Col 2 — Congés */}
            <Box>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13.5, fontWeight: 600, mb: 2 }}>
                {t("yearDetail.residentTable.leaves", "Congés")}
              </Typography>
              <Box display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
                {leaveField(t("yearDetail.residentTable.legalLeaves",      "Jours de congé"),          legalLeaves,      setLegalLeaves)}
                {leaveField(t("yearDetail.residentTable.scientificLeaves", "Jours de scientifique"),   scientificLeaves, setScientificLeaves)}
                {leaveField(t("yearDetail.residentTable.maternityLeaves",  "Jours de maternité"),      maternityLeaves,  setMaternityLeaves)}
                {leaveField(t("yearDetail.residentTable.paternityLeaves",  "Jours de paternité"),      paternityLeaves,  setPaternityLeaves)}
                {leaveField(t("yearDetail.residentTable.unpaidLeaves",     "Jours non rémunérés"),     unpaidLeaves,     setUnpaidLeaves)}
              </Box>
            </Box>
          </Box>

          {/* Actions */}
          <Box display="flex" alignItems="center" gap={1.5} mt={2.5} flexWrap="wrap">
            {/* Accepter — uniquement pour les résidents en attente avec droits admin */}
            {!resident.allowed && adminRights && (
              <Button
                variant="contained"
                size="small"
                disabled={accepting}
                onClick={(e) => { e.stopPropagation(); handleAccept(); }}
              >
                {t("yearDetail.residentTable.accept", "Accepter")}
              </Button>
            )}
            {/* Modifier — uniquement pour résidents acceptés */}
            {resident.allowed && (
              <Button
                variant="contained"
                size="small"
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
              >
                {t("yearDetail.residentTable.edit", "Modifier")}
              </Button>
            )}
            <Button
              variant="text"
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
            >
              {t("yearDetail.residentTable.cancel", "Annuler")}
            </Button>
            {adminRights && (
              <Button
                variant="text"
                size="small"
                sx={{ ml: "auto", color: "error.main", "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.06) } }}
                onClick={(e) => { e.stopPropagation(); handleDisable(); }}
              >
                {t("yearDetail.residentTable.disable", "Désactiver le MACCS")}
              </Button>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Add MACCS dialog ──────────────────────────────────────────────────────────

interface AddMaccsDialogProps {
  open: boolean;
  yearId: number;
  onClose: () => void;
  onAdded: () => void;
}

function AddMaccsDialog({ open, yearId, onClose, onAdded }: AddMaccsDialogProps) {
  const { t }         = useTranslation();
  const axiosPrivate  = useAxiosPrivate();
  const [firstname, setFirstname] = useState("");
  const [lastname,  setLastname]  = useState("");
  const [email,     setEmail]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const reset = () => { setFirstname(""); setLastname(""); setEmail(""); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { method, url } = yearsApi.addResidentToYear(yearId);
      await axiosPrivate[method](url, { firstname, lastname, email });
      toast.success(t("yearDetail.residents.addSuccess", "MACCS ajouté avec succès"), toastSuccess);
      reset();
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t("yearDetail.residents.addError", "Erreur lors de l'ajout"), toastError);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = firstname.trim() !== "" && lastname.trim() !== "" && /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <Box sx={{ p: "22px 24px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 600 }}>
          {t("yearDetail.residents.addTitle", "Ajouter un MACCS")}
        </Box>
        <IconButton
          size="small"
          onClick={(e) => { (e.currentTarget as HTMLElement).blur(); handleClose(); }}
          aria-label="Fermer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <TextField
          label={t("yearDetail.residents.firstname", "Prénom")}
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
          size="small"
          fullWidth
          autoFocus
          inputProps={{ "data-testid": "add-maccs-firstname" }}
        />
        <TextField
          label={t("yearDetail.residents.lastname", "Nom")}
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
          size="small"
          fullWidth
          inputProps={{ "data-testid": "add-maccs-lastname" }}
        />
        <TextField
          label={t("yearDetail.residents.email", "Email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size="small"
          fullWidth
          inputProps={{ "data-testid": "add-maccs-email" }}
        />
      </DialogContent>
      <DialogActions sx={{ p: "12px 24px 20px", gap: 1 }}>
        <Button variant="text" onClick={handleClose} disabled={saving}>
          {t("common.cancel", "Annuler")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          data-testid="add-maccs-submit"
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : t("yearDetail.residents.addConfirm", "Ajouter")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Residents = ({ yearId, adminRights }: { yearId: number | null; adminRights?: boolean | null; setActiveLink?: (k: string) => void }) => {
  const { t }    = useTranslation();
  const theme    = useTheme();
  const axiosPrivate = useAxiosPrivate();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterKey>("all");
  const [query,     setQuery]     = useState("");
  const [openSet,   setOpenSet]   = useState<Set<number>>(new Set());
  const [addOpen,   setAddOpen]   = useState(false);

  const fetchResidentList = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const { method, url } = residentsApi.fetchResidents();
      const res = await axiosPrivate[method](url + yearId);
      setResidents(res?.data?.residents ?? []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, yearId]);

  useEffect(() => { fetchResidentList(); }, [fetchResidentList]);

  const toggleOpen = (id: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Counts
  const counts = useMemo(() => ({
    all:     residents.length,
    ok:      residents.filter((r) => r.allowed).length,
    pending: residents.filter((r) => !r.allowed).length,
  }), [residents]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents.filter((r) => {
      if (filter === "ok"      && !r.allowed)  return false;
      if (filter === "pending" &&  r.allowed)  return false;
      if (q && !`${r.firstname} ${r.lastname}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [residents, filter, query]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", sm: "flex-start" }}
        gap="18px"
        flexDirection={{ xs: "column", sm: "row" }}
        mb={2.5}
      >
        <Box flex={1}>
          <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>
            {t("yearDetail.residents.title", "MACCS")}
            {" "}
            <Box component="span" sx={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500,
              color: "primary.main", bgcolor: theme.palette.custom.primarySoft,
              px: "9px", py: "2px", borderRadius: 999, verticalAlign: "3px", ml: "6px",
            }}>
              {counts.all}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: "5px" }}>
            {t("yearDetail.residents.subtitle", "Ajouter, accepter ou désactiver les MACCS de l'année.")}
          </Typography>
        </Box>

        {/* Search + CTA */}
        <Box display="flex" alignItems="center" gap={1.25} flexWrap={{ xs: "wrap", sm: "nowrap" }} sx={{ width: { xs: "100%", sm: "auto" } }}>
          {/* Recherche */}
          <Box display="flex" alignItems="center" gap={1} sx={{
            height: 42, px: 1.75, flex: { xs: 1, sm: "none" }, width: { sm: 270 },
            bgcolor: "background.paper",
            border: `1px solid ${theme.palette.divider}`, borderRadius: "12px",
            "&:focus-within": { borderColor: "primary.main", boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` },
          }}>
            <SearchIcon sx={{ color: "text.disabled", fontSize: 17 }} />
            <InputBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("yearDetail.residents.search", "Rechercher un MACCS…")}
              inputProps={{ "aria-label": "Rechercher un MACCS" }}
              sx={{ fontSize: 13.5, width: "100%" }}
            />
          </Box>
          {/* Ajouter un MACCS */}
          {adminRights && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
              data-testid="add-maccs-btn"
              sx={{ height: 42, whiteSpace: "nowrap", flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
            >
              {t("yearDetail.residents.add", "Ajouter un MACCS")}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <Box
        role="radiogroup"
        aria-label="Filtres"
        display="flex" gap="6px" mb={1.75}
        sx={{
          overflowX:    { xs: "auto", sm: "visible" },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          pb:           { xs: "2px", sm: 0 },
        }}
      >
        <FChip label="Tous"       count={counts.all}     active={filter === "all"}     onClick={() => setFilter("all")}     />
        <FChip label="Validés"    count={counts.ok}      active={filter === "ok"}      countVariant="ok"      onClick={() => setFilter("ok")}      />
        <FChip label="En attente" count={counts.pending}  active={filter === "pending"} countVariant="pending" onClick={() => setFilter("pending")} />
      </Box>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor:      "background.paper",
        border:       `1px solid ${theme.palette.divider}`,
        borderRadius: "16px",
        overflow:     "hidden",
      }}>
        <TableHeader />

        {filtered.length === 0 ? (
          <Box sx={{ p: "40px", textAlign: "center", color: "text.disabled", fontSize: 13.5 }}>
            {t("yearDetail.residents.empty", "Aucun MACCS ne correspond à cette recherche.")}
          </Box>
        ) : (
          filtered.map((resident, index) => (
            <ResidentRow
              key={resident.residentId}
              resident={resident}
              index={index}
              isOpen={openSet.has(resident.residentId)}
              onToggle={() => toggleOpen(resident.residentId)}
              adminRights={!!adminRights}
              yearId={yearId!}
              fetchResidentList={fetchResidentList}
            />
          ))
        )}
      </Box>

      {yearId !== null && (
        <AddMaccsDialog
          open={addOpen}
          yearId={yearId}
          onClose={() => setAddOpen(false)}
          onAdded={fetchResidentList}
        />
      )}
    </Box>
  );
};

export default Residents;
