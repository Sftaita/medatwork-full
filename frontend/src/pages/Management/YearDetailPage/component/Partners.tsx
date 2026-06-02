import { useState, useEffect, useCallback } from "react";
import useAuth from "../../../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import DownloadIcon from "@mui/icons-material/Download";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { toast } from "react-toastify";

import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import managersApi from "../../../../services/managersApi";
import yearsApi from "../../../../services/yearsApi";
import { jobList } from "../../../../doc/lists";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";
import SearchDialog from "./SearchDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManagerEntry {
  id: number;
  firstname: string;
  lastname: string;
  job?: string;
  managerId?: number;
  admin: boolean;
  dataAccess: boolean;
  dataValidation: boolean;
  dataDownload: boolean;
  hasAgendaAccess: boolean;
  canManageAgenda: boolean;
}

// ── Palette avatars ───────────────────────────────────────────────────────────

const AV_COLORS = [
  "#7B3FA0","#2f7fc4","#1f9d57","#d9803a",
  "#c4477f","#5b54c9","#2a9d9d","#b5852a",
];

function getInitials(first = "", last = "") {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

// ── Puce de droit ─────────────────────────────────────────────────────────────

function PermChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  const theme = useTheme();
  return (
    <Box
      component="span"
      sx={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "6px",
        fontSize:     12,
        fontWeight:   600,
        color:        "primary.main",
        bgcolor:      theme.palette.custom.primarySoft,
        px:           "12px",
        py:           "6px",
        borderRadius: 999,
        "& svg":      { fontSize: 13 },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

// ── Bouton "soft" ─────────────────────────────────────────────────────────────

function SoftBtn({
  children,
  onClick,
  danger = false,
  disabled = false,
  startIcon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  startIcon?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box
      component="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "7px",
        height:       40,
        px:           2,
        borderRadius: "11px",
        border:       `1px solid ${disabled ? theme.palette.divider : (danger ? theme.palette.divider : theme.palette.divider)}`,
        bgcolor:      "background.paper",
        color:        disabled ? "text.disabled" : (danger ? "text.disabled" : "text.primary"),
        fontWeight:   600,
        fontSize:     13,
        fontFamily:   "inherit",
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled ? 0.5 : 1,
        transition:   theme.transitions.create(["color", "border-color", "background"]),
        "&:hover:not(:disabled)": danger
          ? { color: "error.main", borderColor: alpha(theme.palette.error.main, 0.4), bgcolor: alpha(theme.palette.error.main, 0.06) }
          : { bgcolor: "background.default" },
        "& svg": { fontSize: 15 },
      }}
    >
      {startIcon}
      {children}
    </Box>
  );
}

// ── Modale de confirmation suppression ────────────────────────────────────────

function ConfirmDeleteModal({
  open, name, onConfirm, onClose,
}: {
  open: boolean; name: string; onConfirm: () => void; onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: "20px", maxWidth: 420, p: 0, border: "none" } }}
      BackdropProps={{ sx: { backdropFilter: "blur(2px)", background: "rgba(38,30,46,.42)" } }}
    >
      <Box sx={{ p: "28px" }}>
        <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600, mb: 1 }}>
          Confirmer la suppression
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.55, mb: 2.5 }}>
          Êtes-vous sûr de vouloir retirer <b>{name}</b> de cette année ?
          Cette action est irréversible.
        </Typography>
        <Box display="flex" justifyContent="flex-end" gap={1.25}>
          <Box
            component="button"
            onClick={onClose}
            sx={{ px: "18px", py: "11px", border: "none", background: "transparent", color: "text.secondary", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", "&:hover": { bgcolor: "background.default" } }}
          >
            Annuler
          </Box>
          <Box
            component="button"
            onClick={onConfirm}
            sx={{ px: "22px", py: "11px", border: "none", bgcolor: "error.main", color: "#fff", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 16px -5px ${alpha(theme.palette.error.main, 0.5)}`, "&:hover": { filter: "brightness(.92)" } }}
          >
            Retirer
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Modale modification des droits ────────────────────────────────────────────

interface Rights {
  admin: boolean; dataAccess: boolean; dataValidation: boolean;
  dataDownload: boolean; canManageAgenda: boolean; hasAgendaAccess: boolean;
}

const RIGHTS_DEFS = [
  { key: "admin",          label: "Administrateur",           labelKey: "yearDetail.rightsUpdate.admin" },
  { key: "dataAccess",     label: "Accès aux données",        labelKey: "yearDetail.rightsUpdate.dataAccess" },
  { key: "dataValidation", label: "Validation des données",   labelKey: "yearDetail.rightsUpdate.dataValidation" },
  { key: "dataDownload",   label: "Téléchargement des données",labelKey: "yearDetail.rightsUpdate.dataDownload" },
  { key: "canManageAgenda","label": "Gérer l'agenda",         labelKey: "yearDetail.rightsUpdate.manageAgenda" },
  { key: "hasAgendaAccess","label": "Accès à l'agenda",       labelKey: "yearDetail.rightsUpdate.agendaAccess" },
] as const;

function RightsModal({
  open, manager, managerList, setManagerList, onClose,
}: {
  open: boolean;
  manager: ManagerEntry | null;
  managerList: ManagerEntry[];
  setManagerList: (l: ManagerEntry[]) => void;
  onClose: () => void;
}) {
  const { t }  = useTranslation();
  const theme  = useTheme();
  const axiosPrivate = useAxiosPrivate();

  const [rights, setRights] = useState<Rights>({
    admin: false, dataAccess: false, dataValidation: false,
    dataDownload: false, canManageAgenda: false, hasAgendaAccess: false,
  });

  useEffect(() => {
    if (manager) {
      setRights({
        admin:          !!manager.admin,
        dataAccess:     !!manager.dataAccess,
        dataValidation: !!manager.dataValidation,
        dataDownload:   !!manager.dataDownload,
        canManageAgenda:!!manager.canManageAgenda,
        hasAgendaAccess:!!manager.hasAgendaAccess,
      });
    }
  }, [manager]);

  const toggle = (key: keyof Rights) =>
    setRights((r) => ({ ...r, [key]: !r[key] }));

  const handleSave = async () => {
    if (!manager) return;
    const initial = { ...rights };
    onClose();
    try {
      const { method, url } = yearsApi.updateManagerRigths();
      await axiosPrivate[method](url, { managerYearId: manager.id, newRights: rights });
      toast.success(t("yearDetail.rightsUpdate.updated", "Droits mis à jour"), toastSuccess);
      setManagerList(managerList.map((m) => m.id === manager.id ? { ...m, ...rights } : m));
    } catch (error) {
      handleApiError(error);
      setRights(initial);
      toast.error("Erreur lors de la mise à jour des droits", toastError);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: "20px", maxWidth: 520, width: "100%", p: 0, border: "none" } }}
      BackdropProps={{ sx: { backdropFilter: "blur(2px)", background: "rgba(38,30,46,.42)" } }}
    >
      <Box sx={{ p: "28px" }}>
        <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600, mb: 1 }}>
          {t("yearDetail.rightsUpdate.title", "Modifier les droits du collaborateur")}
        </Typography>
        {manager && (
          <Typography sx={{ color: "primary.main", fontWeight: 600, mb: 2.25 }}>
            {manager.lastname} {manager.firstname}
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {RIGHTS_DEFS.map(({ key, labelKey, label }) => {
            const checked = rights[key as keyof Rights];
            return (
              <Box
                key={key}
                component="label"
                sx={{
                  display: "flex", alignItems: "center", gap: "13px",
                  px: "6px", py: "12px", borderRadius: "10px", cursor: "pointer",
                  fontSize: 14, fontWeight: 500,
                  "&:hover": { bgcolor: "background.default" },
                }}
              >
                <Box
                  sx={{
                    width: 22, height: 22, borderRadius: "7px", flex: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: checked ? "none" : `2px solid ${theme.palette.divider}`,
                    bgcolor: checked ? "primary.main" : "transparent",
                    color: "#fff",
                    transition: theme.transitions.create(["background", "border"]),
                  }}
                  onClick={() => toggle(key as keyof Rights)}
                >
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M5 10.5l3.2 3.2L15 6.5" />
                    </svg>
                  )}
                </Box>
                <input type="checkbox" checked={checked} onChange={() => toggle(key as keyof Rights)} style={{ display: "none" }} />
                {t(labelKey, label)}
              </Box>
            );
          })}
        </Box>

        <Box display="flex" justifyContent="flex-end" gap={1.25} mt={2.5}>
          <Box component="button" onClick={onClose} sx={{ px: "18px", py: "11px", border: "none", background: "transparent", color: "text.secondary", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", "&:hover": { bgcolor: "background.default" } }}>
            Annuler
          </Box>
          <Box component="button" onClick={handleSave} sx={{ px: "22px", py: "11px", border: "none", bgcolor: "primary.main", color: "#fff", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 16px -5px ${alpha(theme.palette.primary.main, 0.5)}`, "&:hover": { filter: "brightness(.92)" } }}>
            Confirmer
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Carte collaborateur ───────────────────────────────────────────────────────

const PERM_CHIPS: Array<{ key: keyof ManagerEntry; icon: React.ReactNode; label: string; labelKey: string }> = [
  { key: "admin",          icon: <ShieldOutlinedIcon />,    label: "Administrateur", labelKey: "yearDetail.partners.chipAdmin" },
  { key: "dataAccess",     icon: <VisibilityOutlinedIcon />,label: "Consultation",   labelKey: "yearDetail.partners.chipConsult" },
  { key: "dataValidation", icon: <BookmarkBorderIcon />,    label: "Validation",     labelKey: "yearDetail.partners.chipValidation" },
  { key: "dataDownload",   icon: <DownloadIcon />,          label: "Téléchargement", labelKey: "yearDetail.partners.chipDownload" },
  { key: "hasAgendaAccess",icon: <CalendarMonthIcon />,     label: "Calendrier",     labelKey: "yearDetail.partners.chipCalendar" },
  { key: "canManageAgenda",icon: <CalendarTodayIcon />,     label: "Planification",  labelKey: "yearDetail.partners.chipPlanning" },
];

function CollabCard({
  item, index, locked, isSelf, adminRights,
  onDelete, onRights,
}: {
  item: ManagerEntry; index: number; locked: boolean;
  /** true = c'est le manager connecté lui-même → ne peut pas modifier ses propres droits */
  isSelf: boolean;
  adminRights: boolean;
  onDelete: () => void; onRights: () => void;
}) {
  const { t }  = useTranslation();
  const theme  = useTheme();

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap={2}
      sx={{
        py:            "22px",
        borderBottom:  `1px solid ${theme.palette.divider}`,
        "&:last-child":{ borderBottom: "none" },
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      {/* Avatar */}
      <Box sx={{
        width: 46, height: 46, borderRadius: "50%", flex: "none",
        bgcolor: AV_COLORS[index % AV_COLORS.length],
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 15, fontWeight: 700,
      }}>
        {getInitials(item.firstname, item.lastname)}
      </Box>

      {/* Meta */}
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 15.5, fontWeight: 600 }}>
            {item.lastname} {item.firstname}
          </Typography>
          {isSelf && (
            <Typography component="span" sx={{
              fontSize: 11, fontWeight: 600, px: "8px", py: "2px",
              borderRadius: 999, bgcolor: theme.palette.custom.primarySoft,
              color: "primary.main",
            }}>
              Vous
            </Typography>
          )}
        </Box>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: "3px", mb: 1.5 }}>
          {jobList[item.job ?? ""] ?? item.job ?? ""}
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {PERM_CHIPS.filter(({ key }) => !!item[key]).map(({ key, icon, label, labelKey }) => (
            <PermChip key={key} icon={icon} label={t(labelKey, label)} />
          ))}
        </Box>
      </Box>

      {/* Actions */}
      {adminRights && (
        <Box display="flex" gap={1} alignItems="center" flexShrink={0}>
          <SoftBtn
            danger
            disabled={locked || isSelf}
            startIcon={<DeleteOutlineIcon />}
            onClick={onDelete}
          >
            {t("yearDetail.partners.delete", "Supprimer")}
          </SoftBtn>
          <SoftBtn
            disabled={isSelf}
            startIcon={<EditIcon />}
            onClick={onRights}
          >
            {t("yearDetail.partners.rights", "Droits")}
          </SoftBtn>
        </Box>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Partners = ({ id, adminRights }: { id: number | null; adminRights?: boolean | null }) => {
  const { t }    = useTranslation();
  const theme    = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const { authentication } = useAuth();
  /** ID du manager connecté — pour bloquer la modification de ses propres droits */
  const currentManagerId = authentication.managerId ?? null;

  const [managerList, setManagerList] = useState<ManagerEntry[]>([]);
  const [hospitalManagers, setHospitalManagers] = useState<ManagerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [addOpen,     setAddOpen]     = useState(false);
  const [rightsOpen,  setRightsOpen]  = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [selectedMgr, setSelectedMgr] = useState<ManagerEntry | null>(null);

  const fetchYearManagers = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { method, url } = yearsApi.fetchYearManagers();
      const res = await axiosPrivate[method](url + id);
      setManagerList(res?.data ?? []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, id]);

  const fetchHospitalManagers = useCallback(async () => {
    if (!id) return;
    try {
      const { method, url } = managersApi.fetchHospitalManagers(id);
      const res = await axiosPrivate[method](url);
      setHospitalManagers(res?.data ?? []);
    } catch {
      setHospitalManagers([]);
    }
  }, [axiosPrivate, id]);

  useEffect(() => {
    fetchYearManagers();
    fetchHospitalManagers();
  }, [fetchYearManagers, fetchHospitalManagers]);

  // Ajouter un collaborateur
  const handleAddManager = async (guestId: number) => {
    const relation = { year: id, guest: guestId, dataValidation: false };
    try {
      const { method, url } = yearsApi.inviteGuest();
      await axiosPrivate[method](url, relation);
      toast.success(t("yearDetail.partners.added", "Collaborateur ajouté"), toastSuccess);
      fetchYearManagers();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Supprimer un collaborateur
  const handleDelete = async () => {
    if (!selectedMgr) return;
    setDeleteOpen(false);
    toast.success(`${selectedMgr.lastname} ${selectedMgr.firstname} retiré`, toastSuccess);
    // Note: pas d'API delete exposée pour l'instant — appel à implémenter côté backend
    setManagerList((prev) => prev.filter((m) => m.id !== selectedMgr.id));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Carte collaborateurs ──────────────────────────────────────── */}
      <Box sx={{
        bgcolor:      "background.paper",
        border:       `1px solid ${theme.palette.divider}`,
        borderRadius: "18px",
        p:            { xs: "20px", sm: "24px 26px" },
      }}>
        {/* En-tête */}
        <Box
          display="flex"
          alignItems="flex-start"
          gap="18px"
          pb={2.5}
          mb={1}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}`, flexDirection: { xs: "column", sm: "row" } }}
        >
          <Box flex={1}>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>
              {t("yearDetail.partners.title", "Collaborateur·rice·s")}
              {" "}
              <Box component="span" sx={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500,
                color: "primary.main", bgcolor: theme.palette.custom.primarySoft,
                px: "9px", py: "2px", borderRadius: 999, verticalAlign: "3px", ml: "6px",
              }}>
                {managerList.length}
              </Box>
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mt: "5px" }}>
              {adminRights
                ? t("yearDetail.partners.subtitleAdmin", "Ajouter ou gérer vos collaborateurs et leurs droits sur l'année.")
                : t("yearDetail.partners.subtitleNoAdmin", "Consultez les collaborateurs de cette année.")}
            </Typography>
          </Box>
          {adminRights && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
              sx={{ height: 44, px: "22px", fontSize: 14, flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
            >
              {t("yearDetail.partners.add", "Ajouter")}
            </Button>
          )}
        </Box>

        {/* Liste */}
        {managerList.length === 0 ? (
          <Box sx={{ py: "40px", textAlign: "center", color: "text.disabled", fontSize: 13.5 }}>
            Aucun collaborateur sur cette année.
          </Box>
        ) : (
          managerList.map((item, index) => (
            <CollabCard
              key={item.id}
              item={item}
              index={index}
              locked={index === 0}
              isSelf={currentManagerId !== null && item.managerId === currentManagerId}
              adminRights={!!adminRights}
              onDelete={() => { setSelectedMgr(item); setDeleteOpen(true); }}
              onRights={() => { setSelectedMgr(item); setRightsOpen(true); }}
            />
          ))
        )}
      </Box>

      {/* ── Modale ajout (SearchDialog existant) ─────────────────────── */}
      <SearchDialog
        list={hospitalManagers.filter((m) => !managerList.some((linked) => linked.managerId === m.id || linked.id === m.id))}
        setList={setHospitalManagers}
        updateManagerList={fetchYearManagers}
        open={addOpen}
        handleClickOpen={() => setAddOpen(true)}
        handleClose={() => setAddOpen(false)}
        handleListItemClick={handleAddManager}
        id={id}
      />

      {/* ── Modale droits ─────────────────────────────────────────────── */}
      <RightsModal
        open={rightsOpen}
        manager={selectedMgr}
        managerList={managerList}
        setManagerList={setManagerList}
        onClose={() => setRightsOpen(false)}
      />

      {/* ── Modale suppression ────────────────────────────────────────── */}
      <ConfirmDeleteModal
        open={deleteOpen}
        name={selectedMgr ? `${selectedMgr.lastname} ${selectedMgr.firstname}` : ""}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
};

export default Partners;
