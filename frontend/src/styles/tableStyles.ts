/**
 * Design system partagé pour les tableaux de données.
 * Basé sur le design "Gestion des managers" — palette violet de l'app (#a439b6).
 *
 * Usage :
 *   import { T, statusBadgeSx } from '../../styles/tableStyles';
 *   <TableContainer sx={T.card}>
 *     <Table sx={T.table}>
 *       <TableHead><TableRow sx={T.headRow}>...
 */

import type { SxProps, Theme } from "@mui/material/styles";
import type { Density } from "../hooks/useTableDensity";

// ── Palette (aligned with app primary #a439b6) ────────────────────────────────
export const C = {
  brand50:  "#faf5fb",
  brand100: "#f3e5f5",
  brand200: "#e8c9f0",
  brand300: "#d49de2",
  brand500: "#b84dca",
  brand600: "#a439b6",   // app primary
  brand700: "#8a2e99",
  ink:      "#1a1620",
  ink2:     "#4a4452",
  ink3:     "#7a7484",
  ink4:     "#a8a2b0",
  bg:       "#faf8fc",
  surface:  "#ffffff",
  surface2: "#f6f2f9",
  line:     "#ece8f1",
  line2:    "#e0d9e8",
  ok:       "#0f7a52",
  okBg:     "#e6f4ee",
  warn:     "#a16207",
  warnBg:   "#fdf3d8",
  err:      "#b42318",
  errBg:    "#fdecea",
  shadow:   "0 4px 12px -2px rgba(26, 14, 30, 0.07), 0 1px 3px -1px rgba(26,14,30,0.04)",
  shadowSm: "0 1px 3px rgba(26, 14, 30, 0.05), 0 1px 2px rgba(26,14,30,0.04)",
} as const;

// ── Table atoms ───────────────────────────────────────────────────────────────

/** Carte englobante avec bords arrondis et ombre */
export const tableCard: SxProps<Theme> = {
  border: `1px solid ${C.line}`,
  borderRadius: "12px",
  boxShadow: C.shadowSm,
  overflow: "hidden",
  bgcolor: C.surface,
};

/** Wrapper pour overflow-x */
export const tableWrap: SxProps<Theme> = {
  overflowX: "auto",
};

/** Table principale */
export const table: SxProps<Theme> = {
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 13,
};

/** En-tête : fond légèrement teinté, texte uppercase small */
export const headRow: SxProps<Theme> = {
  bgcolor: C.surface2,
  "& th": {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: C.ink3,
    borderBottom: `1px solid ${C.line}`,
    py: "11px",
    px: "18px",
    whiteSpace: "nowrap",
    userSelect: "none",
    bgcolor: C.surface2,
  },
};

const DENSITY_CELL: Record<Density, { py: string; height: number; fontSize: number }> = {
  compact:     { py: "5px",  height: 40, fontSize: 12 },
  normal:      { py: "13px", height: 60, fontSize: 13 },
  comfortable: { py: "18px", height: 76, fontSize: 14 },
};

/** Ligne de données — densité configurable */
export function bodyRowSx(density: Density = "normal"): SxProps<Theme> {
  const { py, height, fontSize } = DENSITY_CELL[density];
  return {
    transition: "background 0.1s",
    cursor: "pointer",
    "&:hover": { bgcolor: C.surface2 },
    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: `${C.brand50} !important` },
    "& td": {
      fontSize,
      color: C.ink,
      borderBottom: `1px solid ${C.line}`,
      py,
      px: "18px",
      height,
      verticalAlign: "middle",
    },
    "&:last-child td": { borderBottom: "none" },
  };
}

/** Ligne de données — densité normale (raccourci rétrocompat) */
export const bodyRow: SxProps<Theme> = bodyRowSx("normal");

/** Pied de tableau */
export const tableFooter: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  px: "18px",
  py: "11px",
  borderTop: `1px solid ${C.line}`,
  bgcolor: C.surface2,
  fontSize: 12,
  color: C.ink3,
};

// ── Cell helpers (inline sx) ─────────────────────────────────────────────────

/** Cellule personne : avatar + nom + sous-titre */
export const personCell: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
};

/** Avatar rond avec initiales, couleur brand */
export const avatarSx: SxProps<Theme> = {
  width: 34,
  height: 34,
  fontSize: 12,
  fontWeight: 700,
  bgcolor: C.brand100,
  color: C.brand700,
  border: `1px solid ${C.line}`,
};

/** Nom de la personne */
export const personName: SxProps<Theme> = {
  fontWeight: 600,
  color: C.ink,
  fontSize: 13,
};

/** Email/sous-titre sous le nom */
export const personSub: SxProps<Theme> = {
  fontSize: 11,
  color: C.ink3,
  mt: "1px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

// ── Status badge ──────────────────────────────────────────────────────────────

type BadgeVariant = "active" | "pending" | "error" | "default";

export function statusBadgeSx(variant: BadgeVariant): SxProps<Theme> {
  const map: Record<BadgeVariant, { bg: string; color: string }> = {
    active:  { bg: C.okBg,   color: C.ok   },
    pending: { bg: C.warnBg, color: C.warn  },
    error:   { bg: C.errBg,  color: C.err   },
    default: { bg: C.surface2, color: C.ink3 },
  };
  const { bg, color } = map[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    px: "10px",
    py: "3px",
    borderRadius: "999px",
    fontSize: 11,
    fontWeight: 600,
    bgcolor: bg,
    color,
    "&::before": {
      content: '""',
      width: 6,
      height: 6,
      borderRadius: "50%",
      bgcolor: color,
      flexShrink: 0,
    },
  };
}

// ── Year pill ─────────────────────────────────────────────────────────────────

export function yearPillSx(count: number): SxProps<Theme> {
  const veteran = count >= 8;
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 24,
    px: "8px",
    borderRadius: "12px",
    bgcolor: veteran ? C.brand600 : C.brand100,
    color: veteran ? "#fff" : C.brand700,
    fontSize: 12,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  };
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export const toolbarSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  mb: "14px",
  flexWrap: "wrap",
};

export const searchSx: SxProps<Theme> = {
  flex: 1,
  minWidth: 260,
  maxWidth: 420,
  "& .MuiOutlinedInput-root": {
    fontSize: 13,
    height: 38,
    bgcolor: C.surface,
    borderRadius: "8px",
    "& fieldset": { borderColor: C.line2 },
    "&:hover fieldset": { borderColor: C.ink4 },
    "&.Mui-focused fieldset": { borderColor: C.brand600, borderWidth: 1.5 },
  },
};

// ── Page header ───────────────────────────────────────────────────────────────

export const pageHeadSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 3,
  mb: 3,
  flexWrap: "wrap",
};

export const pageTitleSx: SxProps<Theme> = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: C.ink,
  mb: "3px",
};

export const pageSubtitleSx: SxProps<Theme> = {
  fontSize: 13,
  color: C.ink3,
};

// ── Convenience shorthand ─────────────────────────────────────────────────────
export const T = {
  card:     tableCard,
  wrap:     tableWrap,
  table,
  headRow,
  bodyRow,
  footer:   tableFooter,
  person:   personCell,
  avatar:   avatarSx,
  name:     personName,
  sub:      personSub,
  toolbar:  toolbarSx,
  search:   searchSx,
  pageHead: pageHeadSx,
  pageTitle: pageTitleSx,
  pageSub:  pageSubtitleSx,
};
