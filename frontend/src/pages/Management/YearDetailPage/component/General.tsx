import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import { LoadingButton } from "@mui/lab";
import SearchIcon from "@mui/icons-material/Search";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MessageIcon from "@mui/icons-material/Message";
import GroupsIcon from "@mui/icons-material/Groups";
import { toast } from "react-toastify";

import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useValidationContext from "../../../../hooks/useValidationContext";
import periodsApi from "../../../../services/periodsApi";
import managersApi from "../../../../services/managersApi";
import { monthList, warningList } from "../../../../doc/lists";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";
import MessageBox from "./ValidationView/MessageBox";
import ConfirmLeaveDialog from "./ValidationView/ConfirmLeaveDialog";
import UserAvatar from "../../../../components/small/UserAvatar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Period {
  id: number;
  label: string;   // "Avril 2026"
  monthNum: number;
  year: number;
}

interface Warning {
  warningType: "minLimit" | "maxLimit" | "overruns" | "smoothing";
  NumberOfHours?: number;
  week?: number;
  startDate?: string;
  endDate?: string;
  period?: number;
}

// ── Erreurs API différenciées ─────────────────────────────────────────────────

export function parseValidationError(error: unknown): string {
  const status = (error as { response?: { status?: number; data?: { message?: string; error?: string; code?: string } } })?.response?.status;
  const body   = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  const msg    = body?.message || body?.error || "";

  if (status === 403) return "Vous n'avez pas les droits pour valider cette période.";
  if (status === 422) return `Période verrouillée — ${msg || "impossible de modifier."}`;
  if (status === 404) return "Période introuvable. Rechargez la page.";
  if (status === 400) {
    if (typeof msg === "string" && msg.toLowerCase().includes("droit")) {
      return "Vous n'avez pas les droits pour valider.";
    }
    if (typeof msg === "string" && msg.toLowerCase().includes("invalid")) {
      return `Données invalides — ${msg}`;
    }
    return `Erreur de validation — ${msg || "vérifiez les informations."}`;
  }
  if (status === 500) return "Erreur serveur. Contactez l'administrateur.";
  return "Erreur lors de l'enregistrement. Réessayez dans un instant.";
}

// ── Handle exposé au parent (save, dirty) ─────────────────────────────────────

export interface GeneralHandle {
  /** Déclenche la sauvegarde. Retourne true si succès. */
  save: () => Promise<boolean>;
}

interface PeriodInfo {
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
}

export interface ResidentReport {
  residentId: number;
  residentFirstname: string;
  residentLastname: string;
  /** Chemin de la photo de profil (null si aucune photo) */
  avatarPath?: string | null;
  /** true = compte résident activé (validatedAt set côté backend) */
  accountActivated?: boolean;
  /** true = au moins une donnée encodée sur la période (timesheet, garde ou absence) */
  hasActivity?: boolean;
  validationInformation: {
    validated: boolean;
    validatedBy?: unknown;
    validationHistory?: Array<Record<string, unknown>>;
    /**
     * Dernier commentaire INTERNE manager.
     * Endpoint /api/managers/periodReport — ROLE_MANAGER requis.
     * JAMAIS exposé aux résidents.
     */
    lastManagerComment?: string | null;
    lastManagerCommentAuthorId?: number | null;
    lastManagerCommentAuthorName?: string | null;
    lastManagerCommentAt?: string | null;
    /** Dernière notification résident — champ DISTINCT du commentaire interne. */
    lastResidentNotification?: string | null;
  };
  optingOut: boolean;
  limits: { limit: number; highLimit: number };
  periodsinfo: PeriodInfo[];
  smoothedHours: boolean;
  warningHours: Record<string, unknown>;
  IllegalHours: Record<string, unknown>;
  callable: number;
  hospital: number;
  shiftOverlap: number;
  daysOfLeaves: Record<string, number>;
  warnings: Warning[];
}

interface ValidationEntry {
  residentId: number;
  status: "validate" | "invalidate";
  /** Commentaire interne manager — jamais transmis au résident. */
  managerComment: string;
  /** Auteur du dernier commentaire interne (dénormalisé depuis l'historique). */
  managerCommentAuthorName?: string | null;
  /** Date du dernier commentaire interne ("YYYY-MM-DD HH:mm:ss"). */
  managerCommentAt?: string | null;
  /** Message distinct destiné au résident — affiché/transmis au MACCS. */
  residentNotification: string;
}

// ── Constants & helpers ───────────────────────────────────────────────────────

const AV_COLORS = [
  "#7B3FA0","#2f7fc4","#1f9d57","#d9803a",
  "#c4477f","#5b54c9","#2a9d9d","#b5852a",
];

export function getInitials(first: string, last: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase();
}

/** Initiales depuis un nom complet "Prénom Nom" (prend 1ᵉʳ + dernier mot). */
export function getInitialsFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * Trouve la date du dernier item d'historique avec `action: "validated"`.
 * Retourne null si l'historique est vide ou si l'état courant est "invalidated".
 */
export function findLastValidatedAt(
  history?: Array<Record<string, unknown>> | null
): string | null {
  if (!history || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].action === "validated") {
      return (history[i].actionAt as string) ?? null;
    }
  }
  return null;
}

/**
 * Formate un timestamp "YYYY-MM-DD HH:mm:ss" en date courte française "28 mars".
 * Utilise l'API Intl du navigateur — pas de dépendance dayjs.
 */
export function formatValidationDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  } catch {
    return null;
  }
}

export function hasLegalAlert(warnings: Warning[]): boolean {
  return warnings.some((w) => w.warningType !== "minLimit");
}

export function legalAlertCount(warnings: Warning[]): number {
  return warnings.filter((w) => w.warningType !== "minLimit").length;
}

/** Un résident est éligible à la validation uniquement s'il a activé son compte ET encodé des données. */
export function isEligibleForValidation(r: ResidentReport): boolean {
  return !!r.accountActivated && !!r.hasActivity;
}

export function priority(report: ResidentReport, validationData: ValidationEntry[]): 0 | 1 | 2 {
  if (hasLegalAlert(report.warnings)) return 0;
  const entry = validationData.find((d) => d.residentId === report.residentId);
  if (!entry || entry.status === "invalidate") return 1;
  return 2;
}

export function matchesFilter(
  report: ResidentReport,
  filter: string,
  validationData: ValidationEntry[]
): boolean {
  // Les filtres alert/todo/done n'affichent que les résidents éligibles à la validation
  if (filter === "alert") return isEligibleForValidation(report) && hasLegalAlert(report.warnings);
  if (filter === "todo") {
    if (!isEligibleForValidation(report)) return false;
    const entry = validationData.find((d) => d.residentId === report.residentId);
    return !entry || entry.status === "invalidate";
  }
  if (filter === "done") {
    if (!isEligibleForValidation(report)) return false;
    const entry = validationData.find((d) => d.residentId === report.residentId);
    return entry?.status === "validate";
  }
  return true; // "all" — affiche tout le monde
}

// ResidentAvatar — utilise UserAvatar (photo si disponible, sinon initiales)
function ResidentAvatar({ first, last, avatarPath, index }: { first: string; last: string; avatarPath?: string | null; index: number }) {
  return (
    <UserAvatar
      firstname={first}
      lastname={last}
      avatarPath={avatarPath}
      size={38}
      color={AV_COLORS[index % AV_COLORS.length]}
      fontSize={13}
    />
  );
}

// ── Custom toggle (matches design) ────────────────────────────────────────────

function ValidateToggle({
  validated,
  onChange,
}: {
  validated: boolean;
  onChange: () => void;
}) {
  const theme = useTheme();
  return (
    <Box
      component="button"
      role="switch"
      aria-checked={validated}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onChange(); }}
      sx={{
        display: "flex", alignItems: "center", gap: 1,
        border: "none", background: "transparent", cursor: "pointer",
        fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        color: validated ? theme.palette.success.main : "text.secondary",
        p: 0, flexShrink: 0,
        "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2, borderRadius: 4 },
      }}
    >
      <Box
        sx={{
          width: 46, height: 26, borderRadius: 999,
          bgcolor: validated ? theme.palette.success.main : alpha(theme.palette.text.disabled, 0.3),
          position: "relative",
          transition: theme.transitions.create("background-color"),
          flex: "none",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      >
        <Box
          sx={{
            position: "absolute", top: 3, width: 20, height: 20,
            borderRadius: 999, bgcolor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,.25)",
            left: validated ? 23 : 3,
            transition: theme.transitions.create("left"),
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        />
      </Box>
      {validated ? "Validé" : "Valider"}
    </Box>
  );
}

// ── Compliance report (expanded) ──────────────────────────────────────────────

function ComplianceReport({ report }: { report: ResidentReport }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const surfaceColor = isDark ? theme.palette.custom.primarySofter : "#faf6fd";
  const legalAlerts = report.warnings.filter((w) => w.warningType !== "minLimit");
  const infoAlerts  = report.warnings.filter((w) => w.warningType === "minLimit");
  const allAlerts   = [...legalAlerts, ...infoAlerts]; // legal first

  const kv = (label: string, value: React.ReactNode) => (
    <Box display="flex" justifyContent="space-between" alignItems="center"
      sx={{ py: "8px", borderBottom: `1px dashed ${theme.palette.divider}`, "&:last-child": { borderBottom: "none" } }}>
      <Typography fontSize={12.5} color="text.secondary">{label}</Typography>
      {value}
    </Box>
  );

  const badge = (ok: boolean) => (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      fontSize: 11, fontWeight: 700, px: "10px", py: "3px",
      borderRadius: 999, letterSpacing: ".03em",
      bgcolor: ok ? theme.palette.success.main : theme.palette.error.main,
      color: "#fff",
    }}>
      {ok ? <CheckIcon sx={{ fontSize: 12 }} /> : <CloseIcon sx={{ fontSize: 12 }} />}
      {ok ? "OUI" : "NON"}
    </Box>
  );

  const monoVal = (v: string | number) => (
    <Typography component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "primary.main" }}>
      {v}
    </Typography>
  );

  const cardSx = {
    bgcolor: surfaceColor, border: `1px solid ${theme.palette.divider}`,
    borderRadius: "14px", p: "16px 18px",
  };

  const cardTitle = (title: string) => (
    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
      <Box sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: "primary.main", flex: "none" }} />
      <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}>
        {title}
      </Typography>
    </Box>
  );

  const totalLeaves = Object.values(report.daysOfLeaves ?? {}).reduce((s: number, v) => s + (Number(v) || 0), 0);

  // ── Traçabilité du validateur ─────────────────────────────────────────────
  const serverValidated = report.validationInformation?.validated ?? false;
  const validatedByObj  = report.validationInformation?.validatedBy as { name?: string } | null | undefined;
  const validatedByName = serverValidated ? (validatedByObj?.name ?? null) : null;
  const validatedAt     = serverValidated ? findLastValidatedAt(report.validationInformation?.validationHistory) : null;
  const validatedAtFmt  = formatValidationDate(validatedAt);
  const validatedByIni  = validatedByName ? getInitialsFromFullName(validatedByName) : null;

  return (
    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: { xs: "6px 14px 18px", md: "6px 20px 22px" } }}>

      {/* ── Bandeau "Validé par X le JJ MMM" ───────────────────────────── */}
      {serverValidated && validatedByName && (
        <Box
          display="flex" alignItems="center" gap={1.5}
          sx={{
            mb: 2, p: "12px 16px",
            bgcolor: alpha(theme.palette.success.main, 0.08),
            border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
            borderRadius: "12px",
          }}
        >
          {/* Avatar rond du validateur */}
          <Box sx={{
            width: 24, height: 24, borderRadius: 999, flex: "none",
            bgcolor: theme.palette.success.main,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 9, fontWeight: 700,
          }}>
            {validatedByIni}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: "success.main", fontWeight: 500 }}>
            Validé par{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>{validatedByName}</Box>
            {validatedAtFmt && ` le ${validatedAtFmt}`}
          </Typography>
        </Box>
      )}

      <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "14px" }}>
        {/* Informations générales */}
        <Box sx={cardSx}>
          {cardTitle("Informations générales")}
          {kv("Opting out", (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 11, fontWeight: 700, px: "10px", py: "3px", borderRadius: 999, bgcolor: "primary.main", color: "#fff" }}>
              {report.optingOut ? "OUI" : "NON"}
            </Box>
          ))}
          {kv("Temps de travail maximum", monoVal(`${report.limits?.limit ?? "—"}h`))}
          {kv("Temps de travail maximum absolu", monoVal(`${report.limits?.highLimit ?? "—"}h`))}
          {kv("Nombre d'intervalles", monoVal(report.periodsinfo?.length ?? 0))}
          {(report.periodsinfo ?? []).length > 0 && (
            <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "10px", mt: 1.5 }}>
              {report.periodsinfo.map((p) => (
                <Box key={p.periodNumber} sx={{ bgcolor: "background.paper", border: `1px solid ${theme.palette.divider}`, borderRadius: "11px", p: "12px 14px" }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "primary.main", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    Période n°{p.periodNumber}
                  </Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "text.secondary", mt: "6px", lineHeight: 1.7 }}>
                    Début : {dayjs(p.periodStart).format("DD-MM-YYYY")}<br />
                    Fin&nbsp;&nbsp;&nbsp;: {dayjs(p.periodEnd).format("DD-MM-YYYY")}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Heures prestées + Absences & gardes */}
        <Box sx={cardSx}>
          {cardTitle("Heures prestées")}
          {kv("Lissage des heures respecté ?", badge(!!report.smoothedHours))}
          {kv("Respect des heures maximum autorisé ?", badge(Object.keys(report.warningHours ?? {}).length <= 1))}
          {kv("Respect des heures maximum absolu ?", badge(Object.keys(report.IllegalHours ?? {}).length === 0))}
          <Box mt={2}>{cardTitle("Absences & gardes")}</Box>
          {kv("Absences (jours)", monoVal(totalLeaves))}
          {kv("Gardes appelables", monoVal(report.callable ?? 0))}
          {kv("Gardes sur place", monoVal(report.hospital ?? 0))}
          {kv("Conflit de garde ?", badge((report.shiftOverlap ?? 0) === 0))}
        </Box>

        {/* Alertes — pleine largeur */}
        {allAlerts.length > 0 ? (
          <Box sx={{ ...cardSx, gridColumn: "1 / -1" }}>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}>Alertes</Typography>
              <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, bgcolor: alpha(theme.palette.error.main, 0.12), color: "error.main", px: "9px", py: "3px", borderRadius: 999, fontWeight: 600 }}>
                {allAlerts.length}
              </Box>
            </Box>
            {allAlerts.map((a, i) => {
              const isErr = a.warningType !== "minLimit";
              return (
                <Box key={i} display="flex" gap={1.5} sx={{
                  p: "13px 15px", borderRadius: "12px", mb: 1,
                  bgcolor: isErr ? alpha(theme.palette.error.main, 0.07) : alpha(theme.palette.warning.main, 0.08),
                  border: `1px solid ${isErr ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.warning.main, 0.2)}`,
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 600 }}>
                      {warningList[a.warningType] ?? a.warningType}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontFamily: "'JetBrains Mono', monospace", mt: 0.5 }}>
                      {a.week != null && `Semaine ${a.week}`}
                      {a.startDate && ` · ${dayjs(a.startDate).format("DD-MM-YYYY")} → ${dayjs(a.endDate).format("DD-MM-YYYY")}`}
                      {a.period != null && ` · Période n°${a.period}`}
                    </Typography>
                  </Box>
                  {a.NumberOfHours != null && (
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: isErr ? "error.main" : "warning.main", flex: "none" }}>
                      {Math.floor(a.NumberOfHours)}h{String(Math.round((a.NumberOfHours % 1) * 60)).padStart(2, "0")}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ ...cardSx, gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 1.5, bgcolor: alpha(theme.palette.success.main, 0.08), borderColor: alpha(theme.palette.success.main, 0.25) }}>
            <CheckIcon sx={{ color: "success.main", fontSize: 18 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "success.main" }}>
              Aucune alerte sur cette période — conformité complète.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── MACC card ─────────────────────────────────────────────────────────────────

interface MaccCardProps {
  report: ResidentReport;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  validationData: ValidationEntry[];
  onValidationChange: (residentId: number) => void;
}

export function MaccCard({ report, index, isOpen, onToggle, validationData, onValidationChange }: MaccCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const entry = validationData.find((d) => d.residentId === report.residentId);
  const isValidated = entry?.status === "validate";
  const alertCount  = legalAlertCount(report.warnings);
  const isLegal     = alertCount > 0;

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifType, setNotifType] = useState<"ResidentNotification" | "ManagerNotification">("ResidentNotification");

  const hasResidentMsg = !!entry?.residentNotification;
  const hasManagerMsg  = !!entry?.managerComment;

  // (la traçabilité du validateur est lue dans ComplianceReport, pas ici)

  return (
    <Box
      data-testid={`macc-card-${report.residentId}`}
      sx={{
        bgcolor: "background.paper",
        border: `1px solid ${isOpen ? theme.palette.divider : theme.palette.divider}`,
        borderRadius: "16px",
        mb: 1.5,
        overflow: "hidden",
        boxShadow: isOpen ? `0 8px 28px -16px ${alpha(theme.palette.common.black, 0.28)}` : "none",
        transition: theme.transitions.create(["box-shadow", "border-color"]),
      }}
    >
      {/* Row */}
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        data-testid={`macc-row-${report.residentId}`}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        display="flex" alignItems="center" gap={1.75}
        sx={{
          p:        { xs: "14px", sm: "16px 18px" },
          cursor:   "pointer",
          flexWrap: { xs: "wrap", sm: "nowrap" },
        }}
      >
        {/* Chevron */}
        <Box sx={{
          width: 28, height: 28, borderRadius: "8px", flex: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${isOpen ? "transparent" : theme.palette.divider}`,
          bgcolor: isOpen ? theme.palette.custom.primarySoft : "background.paper",
          color: isOpen ? "primary.main" : "text.secondary",
          transition: theme.transitions.create(["transform", "background"]),
          transform: isOpen ? "rotate(90deg)" : "none",
        }}>
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Box>

        {/* Avatar */}
        <ResidentAvatar first={report.residentFirstname} last={report.residentLastname} avatarPath={report.avatarPath} index={index} />

        {/* Name + email */}
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={600} fontSize={14.5} noWrap>
            {report.residentFirstname} {report.residentLastname}
          </Typography>
          <Typography
            component="span"
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "text.disabled", display: "block", mt: "2px" }}
            noWrap
          >
            {`${report.residentFirstname?.toLowerCase()}.${report.residentLastname?.toLowerCase()}@medwork.be`}
          </Typography>
        </Box>

        {/* Status chips — pleine largeur sous le nom sur mobile (order:5) */}
        <Box
          display="flex" gap="7px" alignItems="center" flexWrap="wrap"
          onClick={(e) => e.stopPropagation()}
          sx={{ order: { xs: 5, sm: 0 }, flexBasis: { xs: "100%", sm: "auto" }, ml: { xs: 0, sm: "4px" } }}
        >
          {!report.accountActivated ? (
            <Box component="span" data-testid={`chip-invited-${report.residentId}`} sx={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 11, fontWeight: 600, px: "9px", py: "4px", borderRadius: 999,
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: "info.main",
            }}>
              Invitation envoyée
            </Box>
          ) : !report.hasActivity ? (
            <Box component="span" data-testid={`chip-no-activity-${report.residentId}`} sx={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 11, fontWeight: 600, px: "9px", py: "4px", borderRadius: 999,
              bgcolor: alpha(theme.palette.text.secondary, 0.06),
              border: `1px dashed ${theme.palette.divider}`,
              color: "text.disabled",
            }}>
              Aucun encodage
            </Box>
          ) : isLegal ? (
            <Box component="span" data-testid={`chip-alert-${report.residentId}`} sx={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 11, fontWeight: 600, px: "9px", py: "4px", borderRadius: 999,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: "error.main",
            }}>
              {alertCount} alerte{alertCount > 1 ? "s" : ""}
            </Box>
          ) : (
            <Box component="span" data-testid={`chip-conforme-${report.residentId}`} sx={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 11, fontWeight: 600, px: "9px", py: "4px", borderRadius: 999,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: "success.main",
            }}>
              <CheckIcon sx={{ fontSize: 12 }} />
              Conforme
            </Box>
          )}
          {report.optingOut && (
            <Box component="span" data-testid={`chip-opting-${report.residentId}`} sx={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 11, fontWeight: 600, px: "9px", py: "4px", borderRadius: 999,
              border: `1px solid ${theme.palette.divider}`,
              color: "text.secondary",
            }}>
              Opting out
            </Box>
          )}
        </Box>

        {/* Notification buttons — order:6 sur mobile */}
        <Box display="flex" gap={1} alignItems="center" onClick={(e) => e.stopPropagation()}
          sx={{ order: { xs: 6, sm: 0 } }}
        >
          {/* Bouton message MACCS */}
          <Tooltip title={hasResidentMsg ? "Message MACCS saisi" : "Message au MACCS"}>
            <IconButton
              size="small"
              aria-label="Message au MACCS"
              onClick={() => { setNotifType("ResidentNotification"); setNotifOpen(true); }}
              sx={{ borderRadius: "10px", border: `1px solid ${theme.palette.divider}`, color: hasResidentMsg ? "primary.main" : "text.disabled" }}
            >
              <MessageIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          {/* Bouton commentaire interne manager */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title={hasManagerMsg ? `Commentaire interne — ${entry?.managerCommentAuthorName ?? "manager"}` : "Commentaire interne manager"}>
              <IconButton
                size="small"
                aria-label="Commentaire interne manager"
                data-testid={`btn-internal-comment-${report.residentId}`}
                onClick={() => { setNotifType("ManagerNotification"); setNotifOpen(true); }}
                sx={{ borderRadius: "10px", border: `1px solid ${theme.palette.divider}`, color: hasManagerMsg ? "warning.main" : "text.disabled" }}
              >
                <GroupsIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            {/* Auteur du dernier commentaire interne */}
            {hasManagerMsg && entry?.managerCommentAuthorName && (
              <Typography
                sx={{ fontSize: 9, color: "text.disabled", lineHeight: 1, mt: "2px", maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={`${entry.managerCommentAuthorName} · ${entry.managerCommentAt?.substring(0, 10) ?? ""}`}
              >
                {entry.managerCommentAuthorName?.split(" ")[0]}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Validate toggle — masqué pour les non-éligibles (invitation envoyée ou sans encodage).
            La traçabilité (qui a validé) est dans le détail déplié uniquement. */}
        {isEligibleForValidation(report) && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ order: { xs: 7, sm: 0 }, ml: { xs: "auto", sm: 0 } }}
          >
            <ValidateToggle
              validated={isValidated}
              onChange={() => onValidationChange(report.residentId)}
            />
          </Box>
        )}
      </Box>

      {/* Compliance report */}
      <Collapse in={isOpen} timeout={200} unmountOnExit>
        <ComplianceReport report={report} />
      </Collapse>

      <MessageBox
        openDialog={notifOpen}
        setOpenDialog={setNotifOpen}
        notificationType={notifType}
        residentId={report.residentId}
      />
    </Box>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({
  label, count, active, countVariant = "neutral",
  onClick,
}: {
  label: string; count: number; active: boolean;
  countVariant?: "neutral" | "danger" | "ok";
  onClick: () => void;
}) {
  const theme = useTheme();
  const badgeBg =
    active      ? alpha("#fff", 0.22) :
    countVariant === "danger" ? alpha(theme.palette.error.main, 0.1) :
    countVariant === "ok"     ? alpha(theme.palette.success.main, 0.1) :
    theme.palette.background.default;
  const badgeColor =
    active      ? "#fff" :
    countVariant === "danger" ? theme.palette.error.main :
    countVariant === "ok"     ? theme.palette.success.main :
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
      <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, px: "6px", py: "1px", borderRadius: 999, bgcolor: badgeBg, color: badgeColor }}>
        {count}
      </Box>
    </Box>
  );
}

// ── Month rail item ───────────────────────────────────────────────────────────

type MonthStatus = "alert" | "ok" | "pending";

function MonthRailItem({
  period, position, isActive, status, subLabel, onClick,
}: {
  period: Period; position: number; isActive: boolean;
  status: MonthStatus | null; subLabel?: string; onClick: () => void;
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Fond SOLIDE du nœud — obligatoire pour masquer la ligne derrière
  const nodeBg =
    isActive       ? theme.palette.primary.main :
    status === "ok"? (isDark ? "#1a3020" : "#e8f6ee") :
                     (isDark ? "#2a2030" : "#efecf3");

  const nodeColor =
    isActive       ? "#fff" :
    status === "ok"? theme.palette.success.dark :
                     theme.palette.text.secondary;

  const dotColors: Record<MonthStatus, string> = {
    alert:   theme.palette.error.main,
    ok:      theme.palette.success.main,
    pending: theme.palette.warning.main,
  };

  return (
    <Box
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      display="flex" alignItems="center" gap={1.5}
      sx={{
        p:            "9px 12px",
        borderRadius: "11px",
        position:     "relative",
        minWidth:     { xs: "170px", md: "unset" },
        flex:         { xs: "0 0 auto", md: "unset" },
        bgcolor:      isActive ? theme.palette.custom.primarySoft : "transparent",
        cursor:       "pointer",
        "&:hover":    { bgcolor: isActive ? theme.palette.custom.primarySoft : theme.palette.background.default },
        "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      {/* Nœud — fond solide + z-index 2 pour passer AU-DESSUS de la ligne */}
      <Box sx={{
        width: 30, height: 30, borderRadius: 999, flex: "none",
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
        bgcolor: nodeBg, color: nodeColor,
        transition: theme.transitions.create(["background", "color"]),
      }}>
        {status === "ok" ? <CheckIcon sx={{ fontSize: 14 }} /> : position}
      </Box>

      {/* Label + sous-libellé */}
      <Box flex={1} minWidth={0}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", lineHeight: 1.2 }} noWrap>
          {period.label}
        </Typography>
        {subLabel && (
          <Typography sx={{ fontSize: 10.5, color: "text.disabled", mt: "1px", lineHeight: 1.3 }} noWrap>
            {subLabel}
          </Typography>
        )}
      </Box>

      {status && (
        <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: dotColors[status], flex: "none" }} />
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GeneralProps {
  yearId: number | null;
  _adminRights?: boolean | null;
  /** Le parent est notifié quand l'état dirty change. */
  onDirtyChange?: (dirty: boolean) => void;
}

const General = forwardRef<GeneralHandle, GeneralProps>(function General({ yearId, _adminRights, onDirtyChange }, ref) {
  const { t } = useTranslation();
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const { periodId, setPeriodId, residentValidationData, setResidentValidationData } = useValidationContext();

  // ── Periods list ───────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true);
  const [periods, setPeriods]     = useState<Period[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ── Period report ──────────────────────────────────────────────────────────
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodReport, setPeriodReport]   = useState<ResidentReport[]>([]);
  const [periodStatuses, setPeriodStatuses] = useState<Map<number, MonthStatus>>(new Map());

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filter,    setFilter]    = useState<"all" | "alert" | "todo" | "done">("all");
  const [query,     setQuery]     = useState("");
  const [openCards, setOpenCards] = useState<Set<number>>(new Set());
  const [saveLoading,       setSaveLoading]       = useState(false);
  const [dirty,             setDirty]             = useState(false);
  // Confirmation avant changement de mois
  const [confirmOpen,       setConfirmOpen]       = useState(false);
  const [pendingMonthIndex, setPendingMonthIndex] = useState<number | null>(null);

  // Stable ref vers handleSave pour useImperativeHandle
  const handleSaveRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  // ── Fetch periods list ─────────────────────────────────────────────────────
  const fetchPeriods = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const { method, url } = periodsApi.fetchPeriod();
      const res = await axiosPrivate[method](url + yearId);
      const raw: { id: number; month: number; year: number }[] = res.data ?? [];
      raw.sort((a, b) => {
        const dA = new Date(a.year, a.month - 1);
        const dB = new Date(b.year, b.month - 1);
        return dB.getTime() - dA.getTime();
      });
      const transformed: Period[] = raw.map((item) => ({
        id:       item.id,
        label:    `${monthList[item.month as keyof typeof monthList] ?? ""} ${item.year}`,
        monthNum: item.month,
        year:     item.year,
      }));
      setPeriods(transformed);
      if (transformed[0]) {
        getPeriodSummary(transformed[0].id);
        setPeriodId(transformed[0].id);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  // ── Fetch period report ────────────────────────────────────────────────────
  const getPeriodSummary = useCallback(async (pid: number) => {
    setPeriodLoading(true);
    setOpenCards(new Set());
    try {
      const { method, url } = periodsApi.getPeriodReport();
      const res = await axiosPrivate[method](url + pid);
      const data: ResidentReport[] = res?.data ?? [];
      setPeriodReport(data);

      // Init validation context — pré-renseigne commentaires internes et notifications résidents
      setResidentValidationData(
        data.map((r) => ({
          residentId:              r.residentId,
          status:                  r.validationInformation?.validated ? "validate" : "invalidate",
          // Commentaire interne manager (jamais transmis au résident)
          managerComment:          r.validationInformation?.lastManagerComment ?? "",
          managerCommentAuthorName:r.validationInformation?.lastManagerCommentAuthorName ?? null,
          managerCommentAt:        r.validationInformation?.lastManagerCommentAt ?? null,
          // Notification destinée au MACCS (champ distinct)
          residentNotification:    r.validationInformation?.lastResidentNotification ?? "",
        }))
      );

      // Compute status for rail dot — seuls les résidents éligibles entrent dans le calcul
      const eligibleData = data.filter(isEligibleForValidation);
      const hasLegal = eligibleData.some((r) => hasLegalAlert(r.warnings));
      const allDone  = eligibleData.length > 0 && eligibleData.every((r) => r.validationInformation?.validated);
      const status: MonthStatus = hasLegal ? "alert" : allDone ? "ok" : "pending";
      setPeriodStatuses((prev) => new Map(prev).set(pid, status));
    } catch (error) {
      handleApiError(error);
    } finally {
      setPeriodLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axiosPrivate]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  // ── Changement de mois effectif (après confirmation ou sans dirty) ───────────
  const doSelectMonth = useCallback((index: number) => {
    setSelectedIndex(index);
    setFilter("all");
    setQuery("");
    setDirty(false);
    onDirtyChange?.(false);
    const pid = periods[index]?.id;
    if (pid !== undefined) {
      setPeriodId(pid);
      getPeriodSummary(pid);
    }
  }, [periods, setPeriodId, getPeriodSummary, onDirtyChange]);

  // ── Sélection de mois avec protection dirty ───────────────────────────────
  const handleSelectMonth = useCallback((index: number) => {
    if (saveLoading) return; // bloque pendant une sauvegarde en cours
    if (dirty) {
      setPendingMonthIndex(index);
      setConfirmOpen(true);
      return;
    }
    doSelectMonth(index);
  }, [saveLoading, dirty, doSelectMonth]);

  // ── Validation toggle (mise à jour fonctionnelle → pas de bug double-clic) ──
  const handleValidationChange = useCallback((residentId: number) => {
    setResidentValidationData((prev) =>
      (prev as ValidationEntry[]).map((d) =>
        d.residentId === residentId
          ? { ...d, status: d.status === "validate" ? "invalidate" : "validate" }
          : d
      )
    );
    setDirty(true);
    onDirtyChange?.(true);
  }, [setResidentValidationData, onDirtyChange]);

  // ── Card open/close ────────────────────────────────────────────────────────
  const toggleCard = (residentId: number) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(residentId)) next.delete(residentId);
      else next.add(residentId);
      return next;
    });
  };

  // ── Valider les conformes (état local seulement — Enregistrer pour sauvegarder) ─
  const handleBulkValidate = useCallback(() => {
    const data = residentValidationData as ValidationEntry[];
    let count = 0;
    const updated = data.map((d) => {
      const report = periodReport.find((r) => r.residentId === d.residentId);
      if (!report || !isEligibleForValidation(report)) return d;
      if (!hasLegalAlert(report.warnings) && d.status === "invalidate") {
        count++;
        return { ...d, status: "validate" as const };
      }
      return d;
    });
    setResidentValidationData(updated);
    setDirty(true);
    onDirtyChange?.(true);
    toast.success(
      `${count} conforme${count > 1 ? "s" : ""} marqué${count > 1 ? "s" : ""} — cliquez sur Enregistrer pour sauvegarder`,
      toastSuccess
    );
  }, [residentValidationData, periodReport, setResidentValidationData, onDirtyChange, t]);

  // ── Save validations → retourne true si succès ────────────────────────────
  const handleSave = useCallback(async (): Promise<boolean> => {
    const activePeriodId = periodId ?? periods[selectedIndex]?.id;

    if (!activePeriodId) {
      toast.error("Aucune période sélectionnée — réessayez dans un instant.", toastError);
      return false;
    }

    setSaveLoading(true);
    try {
      const { method, url } = managersApi.updateResidentValidationPeriod();
      await axiosPrivate[method](url + activePeriodId, residentValidationData);
      setDirty(false);
      onDirtyChange?.(false);
      toast.success(t("yearDetail.validation.saved", "Validations enregistrées avec succès"), toastSuccess);
      return true;
    } catch (error) {
      handleApiError(error);
      toast.error(parseValidationError(error), toastError);
      return false;
    } finally {
      setSaveLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, periods, selectedIndex, residentValidationData, axiosPrivate, onDirtyChange, t]);

  // Mise à jour de la ref stable pour useImperativeHandle
  handleSaveRef.current = handleSave;

  // ── Exposer save() au parent via ref ──────────────────────────────────────
  useImperativeHandle(ref, () => ({
    save: () => handleSaveRef.current(),
  }));

  // ── Handlers dialogue confirmation de changement de mois ─────────────────
  const handleConfirmCancel = useCallback(() => {
    setConfirmOpen(false);
    setPendingMonthIndex(null);
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    const idx = pendingMonthIndex;
    setPendingMonthIndex(null);
    if (idx !== null) doSelectMonth(idx);
  }, [pendingMonthIndex, doSelectMonth]);

  const handleConfirmSaveAndContinue = useCallback(async () => {
    const ok = await handleSaveRef.current();
    setConfirmOpen(false);
    const idx = pendingMonthIndex;
    setPendingMonthIndex(null);
    if (ok && idx !== null) doSelectMonth(idx);
    // Si save échoue : toast d'erreur déjà affiché, on reste sur le mois courant
  }, [pendingMonthIndex, doSelectMonth]);

  // ── Derived counts & filtered list ────────────────────────────────────────
  const validationData = residentValidationData as ValidationEntry[];

  // Résidents éligibles à la validation : compte activé ET données encodées
  const validationEligible = useMemo(
    () => periodReport.filter(isEligibleForValidation),
    [periodReport]
  );

  const counts = useMemo(() => ({
    all:   periodReport.length,
    // Les compteurs alert/todo/done n'incluent que les résidents éligibles
    alert: validationEligible.filter((r) => hasLegalAlert(r.warnings)).length,
    todo:  validationEligible.filter((r) => {
      const e = validationData.find((d) => d.residentId === r.residentId);
      return !e || e.status === "invalidate";
    }).length,
    done:  validationEligible.filter((r) => {
      const e = validationData.find((d) => d.residentId === r.residentId);
      return e?.status === "validate";
    }).length,
  }), [periodReport, validationEligible, validationData]);

  const validatedCount = counts.done;
  const eligibleCount  = validationEligible.length;
  const total          = counts.all;

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return periodReport
      .filter((r) => {
        if (q && !`${r.residentFirstname} ${r.residentLastname}`.toLowerCase().includes(q)) return false;
        return matchesFilter(r, filter, validationData);
      })
      .sort((a, b) =>
        `${a.residentLastname} ${a.residentFirstname}`
          .localeCompare(`${b.residentLastname} ${b.residentFirstname}`, "fr", { sensitivity: "base" })
      );
  }, [periodReport, filter, query, validationData]);

  // Conformes non encore validés — seuls les éligibles comptent
  const conformesLeft = validationEligible.filter((r) => {
    const e = validationData.find((d) => d.residentId === r.residentId);
    return !hasLegalAlert(r.warnings) && (!e || e.status === "invalidate");
  }).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
        <CircularProgress />
      </Box>
    );
  }

  if (periods.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
        <Typography color="text.secondary">{t("yearDetail.noPeriods", "Aucune période disponible.")}</Typography>
      </Box>
    );
  }

  const selectedPeriod = periods[selectedIndex] ?? periods[0];

  // ── Sous-libellé pour chaque mois du rail ─────────────────────────────────
  const getRailSubLabel = (idx: number, pid: number): string => {
    if (idx === selectedIndex && periodReport.length > 0) {
      const alertCount = counts.alert;
      if (alertCount > 0) return `${eligibleCount} MACCS · ${alertCount} alerte${alertCount > 1 ? "s" : ""}`;
      if (counts.done === eligibleCount && eligibleCount > 0) return `${eligibleCount} validé${eligibleCount > 1 ? "s" : ""}`;
      return `${counts.done} / ${eligibleCount} validé${counts.done > 1 ? "s" : ""}`;
    }
    const s = periodStatuses.get(pid);
    if (s === "alert")   return "Alertes";
    if (s === "ok")      return "Validé";
    if (s === "pending") return "En attente";
    return "";
  };

  return (
    <>
    <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", md: "232px 1fr" }, gap: { xs: "16px", md: "22px" }, alignItems: "start" }}>
      {/* ── Month rail ──────────────────────────────────────────────────── */}
      <Box
        role="listbox"
        aria-label={t("yearDetail.validation.railLabel", "Sélection du mois")}
        sx={{
          minWidth:      0,          // empêche la colonne de grille de déborder
          position:      { xs: "static", md: "sticky" },
          top:           { md: 71 + 62 },
          bgcolor:       "background.paper",
          border:        `1px solid ${theme.palette.divider}`,
          borderRadius:  "16px",
          p:             1,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1.5, pb: 1.25 }}>
          <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}>Mois</Typography>
          {periods.length > 0 && (
            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "text.disabled" }}>
              {periods[periods.length - 1]?.year}–{String(periods[0]?.year).slice(-2)}
            </Typography>
          )}
        </Box>

        {/* Rail : vertical sur desktop, scroller horizontal sur tablet/mobile */}
        <Box
          sx={{
            position:     { xs: "static", md: "relative" },
            display:      { xs: "flex", md: "block" },
            flexDirection:{ xs: "row",  md: "column" },
            overflowX:    { xs: "auto", md: "visible" },
            gap:          { xs: "8px", md: 0 },
            pb:           { xs: "4px", md: 0 },
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            // Ligne verticale : masquée sur mobile (display:none),
            // visible sur desktop (::before positionné dans .rail-track)
            "&::before": {
              content:  '""',
              display:  { xs: "none", md: "block" },  // masqué sur mobile
              position: "absolute",
              left:     27,
              top:      26,
              bottom:   26,
              width:    2,
              bgcolor:  theme.palette.mode === "dark" ? alpha(theme.palette.primary.main, 0.18) : "#e2dee8",
              zIndex:   1,
            },
          }}
        >
          {periods.map((period, i) => (
            <MonthRailItem
              key={period.id}
              period={period}
              position={i + 1}
              isActive={i === selectedIndex}
              status={periodStatuses.get(period.id) ?? null}
              subLabel={getRailSubLabel(i, period.id)}
              onClick={() => handleSelectMonth(i)}
            />
          ))}
        </Box>
      </Box>

      {/* ── Workspace ───────────────────────────────────────────────────── */}
      <Box sx={{ minWidth: 0 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1.75} mb={1.75} flexWrap="wrap">
          <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, fontWeight: 600 }}>
            {selectedPeriod?.label ?? ""}
          </Typography>
          <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "text.secondary", border: `1px solid ${theme.palette.divider}`, borderRadius: 999, px: "10px", py: "4px" }}>
            {total} MACCS
          </Box>
          <Box flex={1} />
          {eligibleCount > 0 && (
            <Box
              display="flex" alignItems="center" gap={1}
              fontSize={12.5} color="text.secondary" fontWeight={500}
              sx={{ width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "space-between", sm: "flex-start" } }}
            >
              <Typography fontSize="inherit" color="inherit" fontWeight="inherit">Validés</Typography>
              <Box sx={{ height: 6, flex: 1, minWidth: 80, maxWidth: { xs: "unset", sm: 120 }, borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.12), overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${(validatedCount / eligibleCount) * 100}%`, bgcolor: theme.palette.success.main, borderRadius: 999, transition: theme.transitions.create("width") }} />
              </Box>
              <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "inherit", color: "inherit", flex: "none" }}>
                {validatedCount} / {eligibleCount}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Toolbar */}
        <Box display="flex" flexWrap="wrap" gap={{ xs: 1, sm: 1.5 }} mb={2}>
          {/* Filtres — scroll horizontal sur mobile */}
          <Box
            role="radiogroup"
            aria-label={t("yearDetail.validation.filterLabel", "Filtres")}
            sx={{
              display:        "flex",
              gap:            "6px",
              width:          { xs: "100%", sm: "auto" },
              overflowX:      { xs: "auto", sm: "visible" },
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
              pb:             { xs: "2px", sm: 0 },
              flexShrink:     0,
            }}
          >
            <FilterChip label="Tous"      count={counts.all}   active={filter === "all"}   onClick={() => setFilter("all")}   />
            <FilterChip label="Alertes"   count={counts.alert} active={filter === "alert"} onClick={() => setFilter("alert")} countVariant="danger" />
            <FilterChip label="À valider" count={counts.todo}  active={filter === "todo"}  onClick={() => setFilter("todo")}  />
            <FilterChip label="Validés"   count={counts.done}  active={filter === "done"}  onClick={() => setFilter("done")}  countVariant="ok" />
          </Box>

          {/* Spacer — uniquement sur desktop */}
          <Box sx={{ flex: { xs: 0, sm: 1 } }} />

          {/* Recherche — pleine largeur sur mobile */}
          <Box
            display="flex" alignItems="center" gap={1}
            sx={{
              height:  40,
              px:      1.75,
              width:   { xs: "100%", sm: "auto" },
              bgcolor: "background.paper",
              border:  `1px solid ${theme.palette.divider}`,
              borderRadius: "12px",
              "&:focus-within": { borderColor: "primary.main", boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` },
            }}
          >
            <SearchIcon sx={{ color: "text.disabled", fontSize: 17 }} />
            <InputBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("yearDetail.validation.searchPlaceholder", "Rechercher un MACCS…")}
              inputProps={{ "aria-label": t("yearDetail.validation.searchPlaceholder", "Rechercher un MACCS…") }}
              sx={{ fontSize: 13.5, width: { xs: "100%", sm: 220 } }}
            />
          </Box>

          {/* Valider les conformes — pleine largeur sur mobile */}
          <Box
            component="button"
            data-testid="btn-bulk-validate"
            disabled={conformesLeft === 0}
            onClick={handleBulkValidate}
            sx={{
              display:         "flex",
              alignItems:      "center",
              justifyContent:  { xs: "center", sm: "flex-start" },
              gap:             "7px",
              height:          40,
              px:              2,
              width:           { xs: "100%", sm: "auto" },
              borderRadius:    "11px",
              border:          `1px solid ${theme.palette.divider}`,
              bgcolor:         "background.paper",
              color:           "text.primary",
              fontWeight:      600,
              fontSize:        13,
              fontFamily:      "inherit",
              cursor:          "pointer",
              opacity:         conformesLeft === 0 ? 0.5 : 1,
              "&:disabled":    { cursor: "not-allowed" },
              "&:hover:not(:disabled)": { bgcolor: "background.default" },
            }}
          >
            <CheckIcon sx={{ fontSize: 16 }} />
            Valider les conformes
          </Box>

          {/* Indicateur modifications non sauvegardées */}
          {dirty && (
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              fontSize: 12, fontWeight: 600, color: "warning.main",
              "&::before": { content: '""', width: 7, height: 7, borderRadius: 999, bgcolor: "warning.main", display: "inline-block" },
            }}>
              Non sauvegardé
            </Box>
          )}

          {/* Enregistrer */}
          <LoadingButton
            variant="contained"
            size="small"
            loading={saveLoading}
            onClick={handleSave}
            sx={{
              height: 40, px: 2, width: { xs: "100%", sm: "auto" },
              // Plus visible quand des changements attendent d'être sauvegardés
              ...(dirty && { boxShadow: `0 4px 14px -4px ${alpha(theme.palette.primary.main, 0.5)}` }),
            }}
          >
            {t("yearDetail.validation.save", "Enregistrer")}
          </LoadingButton>
        </Box>

        {/* MACC list */}
        {periodLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
            <CircularProgress />
          </Box>
        ) : filteredSorted.length === 0 ? (
          <Box sx={{ p: "40px", textAlign: "center", color: "text.disabled", fontSize: 13.5, border: `1px dashed ${theme.palette.divider}`, borderRadius: "16px" }}>
            {t("yearDetail.validation.empty", "Aucun MACCS ne correspond à ce filtre.")}
          </Box>
        ) : (
          filteredSorted.map((report, i) => (
            <MaccCard
              key={report.residentId}
              report={report}
              index={i}
              isOpen={openCards.has(report.residentId)}
              onToggle={() => toggleCard(report.residentId)}
              validationData={validationData}
              onValidationChange={handleValidationChange}
            />
          ))
        )}
      </Box>
    </Box>

    {/* ── Dialogue confirmation changement de mois ─────────────────────── */}
    <ConfirmLeaveDialog
      open={confirmOpen}
      saving={saveLoading}
      onCancel={handleConfirmCancel}
      onDiscard={handleConfirmDiscard}
      onSaveAndContinue={handleConfirmSaveAndContinue}
    />
    </>
  );
});

export default General;
