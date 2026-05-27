import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";
import { toastSuccess } from "../../../../doc/ToastParams";
import dayjs from "@/lib/dayjs";
import { C } from "../../../../styles/tableStyles";
import { tokens as themeTokens } from "../../../../doc/CustomizedTheme";
import type { YearStatus } from "../ManagerYears";

// Icons
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";

// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";

import ConfirmationDialog from "./ConfirmationDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#9c27b0","#e91e63","#2196f3","#009688",
  "#ff9800","#4caf50","#607d8b","#795548",
];

const residentColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

const getInitials = (first: string, last: string) =>
  ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase();

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<YearStatus, { bg: string; fg: string; dot: string; key: string }> = {
  current:  { bg: themeTokens.primarySoft,  fg: themeTokens.primary, dot: themeTokens.primary, key: "years.statusCurrent"  },
  upcoming: { bg: "#FFF6E6", fg: "#B07023", dot: "#E8A23B", key: "years.statusUpcoming" },
  archived: { bg: C.surface2, fg: C.ink3,   dot: C.ink4,   key: "years.statusArchived" },
};

function StatusPill({ status }: { status: YearStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CFG[status];
  return (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      bgcolor: cfg.bg, color: cfg.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
      px: "10px", py: "4px", borderRadius: "999px",
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: cfg.dot }} />
      {t(cfg.key)}
    </Box>
  );
}

// ── Resident avatar ───────────────────────────────────────────────────────────

function ResidentAvatar({ resident, size = 28, ring }: { resident: any; size?: number; ring?: string }) {
  const color = residentColor(resident.residentId ?? 0);
  const initials = getInitials(resident.firstname, resident.lastname);
  return (
    <Tooltip title={resident.firstname + " " + resident.lastname} arrow>
      <Avatar sx={{
        width: size, height: size, fontSize: size * 0.4, fontWeight: 700,
        bgcolor: color, color: "#fff",
        ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
      }}>
        {initials}
      </Avatar>
    </Tooltip>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Box
      component="button"
      onClick={handleCopy}
      sx={{
        display: "inline-flex", alignItems: "center", gap: 1,
        bgcolor: copied ? C.ink : "background.paper",
        color: copied ? "#fff" : C.ink,
        border: `1px solid ${copied ? C.ink : C.line}`,
        borderRadius: "8px",
        px: "12px", py: "6px",
        fontSize: 13, fontWeight: 700, letterSpacing: ".08em",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        cursor: "pointer",
        transition: "all .15s",
        "&:hover": { borderColor: C.ink },
      }}
    >
      <span>{code}</span>
      <Box sx={{
        width: 22, height: 22, borderRadius: "6px",
        bgcolor: copied ? "rgba(255,255,255,.18)" : C.surface2,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11,
      }}>
        {copied ? <CheckIcon sx={{ fontSize: 12 }} /> : <ContentCopyIcon sx={{ fontSize: 11 }} />}
      </Box>
    </Box>
  );
}

// ── Excel download modal ──────────────────────────────────────────────────────

interface ExcelDownloadModalProps {
  open: boolean;
  onClose: () => void;
  residents: any[];
  onDownload: (residentId: number, name: string) => Promise<void>;
}

function ExcelDownloadModal({ open, onClose, residents, onDownload }: ExcelDownloadModalProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState<number | null>(null);
  const allowed = residents.filter(r => r.allowed);

  const handleDownload = async (r: any) => {
    setDownloading(r.residentId);
    try {
      await onDownload(r.residentId, r.lastname);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", boxShadow: C.shadow },
      }}
    >
      <DialogTitle sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontWeight: 700, fontSize: 17, pb: 0.5,
      }}>
        {t("years.excelModalTitle")}
        <IconButton size="small" onClick={onClose} sx={{ color: C.ink3 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Typography sx={{ fontSize: 13, color: C.ink2, mb: 2 }}>
          {t("years.excelModalSubtitle")}
        </Typography>

        {allowed.length === 0 ? (
          <Box sx={{
            textAlign: "center", py: 3,
            color: C.ink3, fontSize: 13,
            bgcolor: C.surface2, borderRadius: "10px",
            border: `1px dashed ${C.line}`,
          }}>
            {t("years.excelModalEmpty")}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {allowed.map(r => (
              <Box
                key={r.residentId}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  p: "10px 12px", borderRadius: "10px",
                  border: `1px solid ${C.line}`, bgcolor: "background.paper",
                  transition: "background .15s",
                  "&:hover": { bgcolor: themeTokens.primarySoft },
                }}
              >
                <ResidentAvatar resident={r} size={34} />
                <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.ink }}>
                  {r.firstname} {r.lastname}
                </Typography>
                <Tooltip title={t("years.excelDownload")} arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(r)}
                    disabled={downloading !== null}
                    sx={{
                      color: themeTokens.primary,
                      border: `1px solid ${C.line}`,
                      borderRadius: "8px",
                      width: 32, height: 32,
                      "&:hover": { bgcolor: themeTokens.primarySoft },
                    }}
                  >
                    {downloading === r.residentId
                      ? <CircularProgress size={14} color="inherit" />
                      : <FileDownloadIcon sx={{ fontSize: 16 }} />
                    }
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600, color: C.ink2 }}>
          {t("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── More menu ─────────────────────────────────────────────────────────────────

interface MoreMenuProps {
  year: any;
  onEdit?: () => void;
  onDelete: () => void;
}

function MoreMenu({ year, onEdit, onDelete }: MoreMenuProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={e => setAnchor(e.currentTarget)}
        sx={{
          width: 36, height: 36, border: `1px solid ${C.line}`,
          borderRadius: "8px", bgcolor: "background.paper",
          color: C.ink2,
          "&:hover": { bgcolor: C.surface2 },
        }}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180, borderRadius: "10px",
              border: `1px solid ${C.line}`,
              boxShadow: C.shadow, mt: 0.5,
            },
          },
        }}
      >
        {onEdit && (
          <MenuItem onClick={() => { onEdit(); setAnchor(null); }} sx={{ fontSize: 13, gap: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 13 }}>{t("years.menuEdit")}</ListItemText>
          </MenuItem>
        )}

        {onEdit && <Divider sx={{ my: 0.5 }} />}

        <MenuItem
          onClick={() => { onDelete(); setAnchor(null); }}
          sx={{ fontSize: 13, color: themeTokens.danger, gap: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 28, color: themeTokens.danger }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 13 }}>{t("years.menuDelete")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

// ── Meta line ─────────────────────────────────────────────────────────────────

function MetaLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <Typography sx={{ fontSize: 10.5, color: C.ink3, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>
        {children}
      </Typography>
    </Box>
  );
}

// ── Large card (current years) ────────────────────────────────────────────────

function YearCardLarge({ year, onManage, onEdit, onDelete, onExcel }: {
  year: any;
  onManage: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onExcel: (id: number, name: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [excelOpen, setExcelOpen] = useState(false);
  const residents: any[] = year.residents ?? [];
  const importedCount = residents.filter(r => r.allowed).length;

  return (
    <Box sx={{
      bgcolor: "background.paper",
      border: `1px solid ${C.line}`,
      borderRadius: "18px",
      overflow: "hidden",
      boxShadow: `0 1px 2px rgba(0,0,0,.02), 0 10px 30px rgba(123,63,160,.06)`,
      position: "relative",
    }}>
      {/* Accent strip */}
      <Box sx={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${themeTokens.primary} 0%, #b07ad2 100%)`,
      }} />

      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.4fr auto 1fr" },
      }}>
        {/* LEFT */}
        <Box sx={{ p: { xs: "20px 20px", md: "26px 28px 24px" }, pt: { xs: "24px !important", md: "26px !important" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
            <StatusPill status="current" />
            <Typography sx={{ fontSize: 11, color: C.ink3, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" }}>
              {t("years.sectionLabel")}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-.01em", mb: "12px" }}>
            {year.title}{" "}
            <Box component="span" sx={{ color: C.ink3, fontWeight: 600 }}>{year.period}</Box>
          </Typography>

          <Box sx={{ display: "flex", gap: "24px", flexWrap: "wrap", mb: "18px" }}>
            <MetaLine label={t("years.period")}>
              {dayjs(year.dateOfStart).format("DD/MM/YYYY")} – {dayjs(year.dateOfEnd).format("DD/MM/YYYY")}
            </MetaLine>
            <MetaLine label={t("years.supervisor")}>
              {year.masterLastname
                ? `${year.masterLastname} ${year.masterFirstname ?? ""}`
                : t("years.supervisorNotDefined")}
            </MetaLine>
          </Box>

          {/* Team */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: ".12em", textTransform: "uppercase" }}>
                {t("years.team")}{" "}
                <Box component="span" sx={{ color: C.ink3, fontWeight: 600 }}>· {residents.length}</Box>
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {residents.length > 0 && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: "5px", fontSize: 11.5, color: C.ink3 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: themeTokens.success }} />
                    {importedCount}/{residents.length} {t("years.importedOf")}
                  </Box>
                )}
                {importedCount > 0 && (
                  <Tooltip title={t("years.excelModalTitle")} arrow>
                    <IconButton
                      size="small"
                      onClick={() => setExcelOpen(true)}
                      sx={{
                        width: 26, height: 26,
                        border: `1px solid ${C.line}`,
                        borderRadius: "6px",
                        color: themeTokens.primary,
                        bgcolor: themeTokens.primarySoft,
                        "&:hover": { bgcolor: themeTokens.primarySoft, borderColor: themeTokens.primary },
                      }}
                    >
                      <FileDownloadIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {residents.map((r: any) => (
                <Box key={r.residentId} sx={{
                  display: "inline-flex", alignItems: "center", gap: 1,
                  bgcolor: C.surface2, border: `1px solid ${C.line}`,
                  borderRadius: "999px", px: "10px", py: "3px", pl: "3px",
                  fontSize: 13, color: C.ink,
                }}>
                  <ResidentAvatar resident={r} size={24} />
                  <Typography sx={{ fontSize: 13, fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.firstname} {r.lastname}
                  </Typography>
                  {r.allowed ? (
                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: themeTokens.success, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckIcon sx={{ fontSize: 9, color: "#fff" }} />
                    </Box>
                  ) : null}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Divider */}
        <Box sx={{ display: { xs: "none", md: "block" }, width: "1px", bgcolor: C.line }} />

        {/* RIGHT */}
        <Box sx={{
          p: { xs: "20px", md: "26px 28px 24px" },
          background: { xs: "none", md: "linear-gradient(180deg, rgba(250,245,252,.8) 0%, transparent 100%)" },
          display: "flex", flexDirection: "column", gap: 2,
          borderTop: { xs: `1px solid ${C.line}`, md: "none" },
        }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: ".12em", textTransform: "uppercase", mb: 1 }}>
              {t("years.codeLabel")}
            </Typography>
            <CopyButton code={year.token} />
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={onManage}
              sx={{
                flex: 1, fontWeight: 700, letterSpacing: ".06em",
                borderRadius: "10px", py: 1.5,
              }}
            >
              {t("years.manage")}
            </Button>
            <MoreMenu year={year} onEdit={onEdit} onDelete={onDelete} />
          </Box>
        </Box>
      </Box>

      <ExcelDownloadModal
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        residents={residents}
        onDownload={onExcel}
      />
    </Box>
  );
}

// ── Compact card (upcoming / archived) ───────────────────────────────────────

const MAX_AVATARS = 5;

function YearCardCompact({ year, status, onManage, onEdit, onDelete }: {
  year: any;
  status: YearStatus;
  onManage: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const residents: any[] = year.residents ?? [];
  const importedCount = residents.filter(r => r.allowed).length;
  const overflow = Math.max(0, residents.length - MAX_AVATARS);

  return (
    <Box sx={{
      bgcolor: "background.paper",
      border: `1px solid ${C.line}`,
      borderRadius: "14px",
      p: "20px",
      display: "flex", flexDirection: "column", gap: "14px",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      {/* Top row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <StatusPill status={status} />
        <CopyButton code={year.token} />
      </Box>

      {/* Title */}
      <Box>
        <Typography sx={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: "-.005em" }}>
          {year.title}{" "}
          <Box component="span" sx={{ color: C.ink3, fontWeight: 600 }}>{year.period}</Box>
        </Typography>
        <Box sx={{ mt: "6px", fontSize: 12.5, color: C.ink2, display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <span>
            <Box component="span" sx={{ color: C.ink3 }}>{t("years.period")} </Box>
            {dayjs(year.dateOfStart).format("DD/MM/YYYY")} – {dayjs(year.dateOfEnd).format("DD/MM/YYYY")}
          </span>
          <span>
            <Box component="span" sx={{ color: C.ink3 }}>{t("years.supervisor")} </Box>
            {year.masterLastname
              ? `${year.masterLastname} ${year.masterFirstname ?? ""}`
              : t("years.supervisorNotDefined")}
          </span>
        </Box>
      </Box>

      {/* Avatar stack */}
      {residents.length > 0 && (
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
          p: "10px 12px",
          bgcolor: C.surface2, border: `1px solid ${C.line}`, borderRadius: "10px",
        }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {residents.slice(0, MAX_AVATARS).map((r: any, i: number) => (
              <Box key={r.residentId} sx={{
                ml: i === 0 ? 0 : "-8px", zIndex: MAX_AVATARS - i,
                position: "relative", borderRadius: "50%",
                boxShadow: `0 0 0 2px ${C.surface2}`,
              }}>
                <ResidentAvatar resident={r} size={30} />
              </Box>
            ))}
            {overflow > 0 && (
              <Box sx={{
                width: 30, height: 30, borderRadius: "50%",
                bgcolor: "background.paper", color: C.ink2,
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${C.surface2}`,
                boxShadow: `inset 0 0 0 1px ${C.line}`,
                ml: "-8px", position: "relative",
              }}>
                +{overflow}
              </Box>
            )}
          </Box>
          <Box sx={{ fontSize: 11.5, color: C.ink3, textAlign: "right" }}>
            <Typography sx={{ fontWeight: 700, color: C.ink, fontSize: 11.5 }}>
              {residents.length} MACCs
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: themeTokens.success }} />
              {importedCount}/{residents.length} {t("years.importedOf")}
            </Box>
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={onManage}
          sx={{ flex: 1, fontWeight: 700, letterSpacing: ".06em", borderRadius: "10px", py: 1.25 }}
        >
          {t("years.manage")}
        </Button>
        <MoreMenu year={year} onEdit={onEdit} onDelete={onDelete} />
      </Box>
    </Box>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface YearCardProps {
  year: any;
  status: YearStatus;
  handleLoading: (s: boolean) => void;
  setYears: (u: any) => void;
  years: any[];
}

const YearCard = ({ year, status, handleLoading, setYears, years }: YearCardProps) => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleManage = () =>
    navigate("/manager/year-detail", {
      state: { id: year.id, title: year.title, adminRights: year.admin },
    });

  const handleEdit = year.admin
    ? () => navigate("/manager/year-parameters", { state: { yearId: year.id, haveAdminRights: year.admin } })
    : undefined;

  const handleExcel = async (residentId: number, residentName: string) => {
    handleLoading(true);
    try {
      const response = await axiosPrivate({
        url: `managers/ExcelGenerator/${year.id}/${residentId}`,
        method: "GET",
        responseType: "blob",
        withCredentials: false,
        headers: { Accept: "application/vnd.ms-excel" },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Horaire-${residentName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      handleApiError(error);
    } finally {
      handleLoading(false);
    }
  };

  const sharedProps = {
    year,
    onManage: handleManage,
    onEdit: handleEdit,
    onDelete: () => setDeleteOpen(true),
  };

  return (
    <>
      {status === "current"
        ? <YearCardLarge {...sharedProps} onExcel={handleExcel} />
        : <YearCardCompact {...sharedProps} status={status} />
      }
      <ConfirmationDialog
        open={deleteOpen}
        handleClose={() => setDeleteOpen(false)}
        yearId={year.id}
        years={years}
        setYears={setYears}
      />
    </>
  );
};

export default YearCard;
