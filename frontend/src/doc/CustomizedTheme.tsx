import { createTheme } from "@mui/material/styles";
import { typography } from "../theme/typography";
import { breakpoints, spacingExtras } from "../theme/spacing";

// ── Module augmentation TypeScript ────────────────────────────────────────────

declare module "@mui/material/styles" {
  interface Palette {
    custom: {
      surface2:      string;
      primarySoft:   string;
      primarySofter: string;
      borderStrong:  string;
      rowHover:      string;
      text3:         string;
      brandPrimary?: string;
    };
    // Rétrocompatibilité composants existants
    purple:      { main: string };
    white:       { main: string };
    textButton:  { main: string };
    alternate:   { main: string };
  }
  interface PaletteOptions {
    custom?: Partial<Palette["custom"]>;
    purple?:     { main: string };
    white?:      { main: string };
    textButton?: { main: string };
    alternate?:  { main: string };
  }
}

// ── Tokens light ──────────────────────────────────────────────────────────────

export const tokens = {
  primary:        "#9C27B0",   // violet MedAtWork
  primarySoft:    "#F3E8F8",
  primarySofter:  "#FAF3FC",
  primaryHover:   "#7B1FA2",
  primaryActive:  "#6A1B9A",

  bg:             "#FAFAFB",   // neutre — background app
  surface:        "#FFFFFF",   // blanc pur — cards, paper
  surface2:       "#F6F6F8",   // gris léger — inputs, hover backgrounds

  text:           "#1F1A1F",   // light.onBackground
  text2:          "#4D444C",   // light.onSurfaceVariant
  text3:          "#7E747D",   // light.outline
  textOnPrimary:  "#FFFFFF",   // light.onPrimary

  border:         "#D0C3CC",   // light.outlineVariant
  borderStrong:   "#7E747D",   // light.outline

  success:        "#3F7A4E",
  warning:        "#9C6A1C",
  info:           "#3A5FA8",
  danger:         "#BA1A1A",   // light.error

  rowHover:       "#F6F0F9",

  radius:         10,
  radiusSm:       6,
} as const;

// ── Tokens dark ───────────────────────────────────────────────────────────────

export const darkTokens = {
  brandPrimary:   "#9C27B0",   // violet MedAtWork — marque (décoratif)
  primary:        "#CE93D8",   // primary lifté WCAG AA sur sombre
  primaryStrong:  "#BA68C8",
  primarySoft:    "#2D1835",
  primarySofter:  "#201227",

  bg:             "#0F0E12",
  surface:        "#161419",
  surface2:       "#1F1B23",

  text:           "#ECEAF0",
  text2:          "#A39CAD",
  text3:          "#6E677A",
  textOnPrimary:  "#171719",

  border:         "#2A262F",
  borderStrong:   "#3D3744",

  success:        "#6FB37C",
  warning:        "#D8A24A",
  info:           "#7B9CE3",
  danger:         "#E8625A",

  rowHover:       "#231B25",

  radius:         10,
  radiusSm:       6,
} as const;

// ── Thème light ───────────────────────────────────────────────────────────────

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main:         tokens.primary,
      dark:         tokens.primaryHover,
      light:        tokens.primarySoft,
      contrastText: tokens.textOnPrimary,
    },
    secondary: {
      main:         tokens.text2,
      contrastText: tokens.surface,
    },
    success: { main: tokens.success },
    warning: { main: tokens.warning },
    info:    { main: tokens.info },
    error:   { main: tokens.danger },
    background: {
      default: tokens.bg,
      paper:   tokens.surface,
    },
    text: {
      primary:   tokens.text,
      secondary: tokens.text2,
      disabled:  tokens.text3,
    },
    divider: tokens.border,
    custom: {
      surface2:      tokens.surface2,
      primarySoft:   tokens.primarySoft,
      primarySofter: tokens.primarySofter,
      borderStrong:  tokens.borderStrong,
      rowHover:      tokens.rowHover,
      text3:         tokens.text3,
    },
    // Rétrocompatibilité
    purple:     { main: tokens.primary },
    white:      { main: "#FFFFFF" },
    textButton: { main: "#FFFFFF" },
    alternate:  { main: tokens.bg },
  },

  shape: { borderRadius: tokens.radius },

  breakpoints,
  typography,
  ...spacingExtras,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.bg, color: tokens.text },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": { background: tokens.borderStrong, borderRadius: 8 },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: tokens.radiusSm, padding: "8px 16px" },
        containedPrimary: {
          backgroundColor: tokens.primary,
          "&:hover": { backgroundColor: tokens.primaryHover },
        },
        outlined: {
          borderColor: tokens.border,
          color: tokens.text2,
          "&:hover": { borderColor: tokens.borderStrong, backgroundColor: tokens.surface2 },
        },
        text: {
          color: tokens.text2,
          "&:hover": { backgroundColor: tokens.surface2 },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${tokens.border}` },
        indicator: { height: 2, backgroundColor: tokens.primary },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: "12px 2px",
          marginRight: 36,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12.5,
          fontWeight: 600,
          color: tokens.text2,
          "&.Mui-selected": { color: tokens.primary, fontWeight: 700 },
          "&:hover": { color: tokens.text },
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${tokens.border}`,
          borderRadius: tokens.radius,
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.border}`,
          borderRadius: tokens.radius,
          backgroundColor: tokens.surface,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            color: tokens.text3,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderBottom: `1px solid ${tokens.border}`,
            padding: "14px 22px",
            backgroundColor: tokens.surface,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${tokens.border}`,
          padding: "16px 22px",
          fontSize: 13.5,
          color: tokens.text,
          fontVariantNumeric: "tabular-nums",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child .MuiTableCell-root": { borderBottom: "none" },
          "&:hover": { backgroundColor: tokens.rowHover },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          boxShadow: "none",
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderBottom: `1px solid ${tokens.border}`,
          boxShadow: "none",
        },
      },
    },

    MuiChip: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600, fontSize: 12 },
        outlinedPrimary: {
          color: tokens.primary,
          borderColor: tokens.primarySoft,
          backgroundColor: tokens.primarySofter,
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        outlined: {
          // MUI default: translate(14px, 16px). On corrige pour notre padding 9px/12px.
          "&:not(.MuiInputLabel-shrink)": {
            transform: "translate(12px, 9px) scale(1)",
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radiusSm,
          backgroundColor: tokens.surface2,
          fontSize: 13,
          "& fieldset": { borderColor: tokens.border },
          "&:hover fieldset": { borderColor: tokens.borderStrong },
          "&.Mui-focused fieldset": { borderColor: tokens.primary, borderWidth: 1 },
        },
        input: { padding: "9px 12px" },
      },
    },

    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: tokens.radiusSm },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: tokens.border } },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.text,
          color: tokens.surface,
          fontSize: 12,
          borderRadius: 6,
          padding: "6px 10px",
        },
      },
    },
  },
});

// ── Thème dark ────────────────────────────────────────────────────────────────

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main:         darkTokens.primary,
      dark:         darkTokens.primaryStrong,
      light:        darkTokens.primarySoft,
      contrastText: darkTokens.textOnPrimary,
    },
    secondary: {
      main:         darkTokens.text2,
      contrastText: darkTokens.bg,
    },
    success: { main: darkTokens.success },
    warning: { main: darkTokens.warning },
    info:    { main: darkTokens.info },
    error:   { main: darkTokens.danger },
    background: {
      default: darkTokens.bg,
      paper:   darkTokens.surface,
    },
    text: {
      primary:   darkTokens.text,
      secondary: darkTokens.text2,
      disabled:  darkTokens.text3,
    },
    divider: darkTokens.border,
    custom: {
      surface2:      darkTokens.surface2,
      primarySoft:   darkTokens.primarySoft,
      primarySofter: darkTokens.primarySofter,
      borderStrong:  darkTokens.borderStrong,
      rowHover:      darkTokens.rowHover,
      text3:         darkTokens.text3,
      brandPrimary:  darkTokens.brandPrimary,
    },
    // Rétrocompatibilité
    purple:     { main: darkTokens.primary },
    white:      { main: "#FFFFFF" },
    textButton: { main: darkTokens.textOnPrimary },
    alternate:  { main: darkTokens.bg },
  },

  shape: { borderRadius: darkTokens.radius },

  breakpoints,
  typography,
  ...spacingExtras,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: darkTokens.bg, color: darkTokens.text },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": { background: darkTokens.borderStrong, borderRadius: 8 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: darkTokens.radiusSm, padding: "8px 16px" },
        containedPrimary: {
          backgroundColor: darkTokens.primary,
          color: darkTokens.textOnPrimary,
          "&:hover": { backgroundColor: darkTokens.primaryStrong },
        },
        outlined: {
          borderColor: darkTokens.border,
          color: darkTokens.text2,
          "&:hover": { borderColor: darkTokens.borderStrong, backgroundColor: darkTokens.surface2 },
        },
        text: {
          color: darkTokens.text2,
          "&:hover": { backgroundColor: darkTokens.surface2 },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${darkTokens.border}` },
        indicator: { height: 2, backgroundColor: darkTokens.primary },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: "12px 2px",
          marginRight: 36,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12.5,
          fontWeight: 600,
          color: darkTokens.text2,
          "&.Mui-selected": { color: darkTokens.primary, fontWeight: 700 },
          "&:hover": { color: darkTokens.text },
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: darkTokens.surface,
          border: `1px solid ${darkTokens.border}`,
          borderRadius: darkTokens.radius,
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: `1px solid ${darkTokens.border}`,
          borderRadius: darkTokens.radius,
          backgroundColor: darkTokens.surface,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            color: darkTokens.text3,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderBottom: `1px solid ${darkTokens.border}`,
            padding: "14px 22px",
            backgroundColor: darkTokens.surface,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${darkTokens.border}`,
          padding: "16px 22px",
          fontSize: 13.5,
          color: darkTokens.text,
          fontVariantNumeric: "tabular-nums",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child .MuiTableCell-root": { borderBottom: "none" },
          "&:hover": { backgroundColor: darkTokens.rowHover },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: darkTokens.surface,
          borderRight: `1px solid ${darkTokens.border}`,
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: darkTokens.surface,
          borderBottom: `1px solid ${darkTokens.border}`,
          boxShadow: "none",
          backgroundImage: "none",
        },
      },
    },

    MuiChip: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600, fontSize: 12 },
        outlinedPrimary: {
          color: darkTokens.primary,
          borderColor: darkTokens.primarySoft,
          backgroundColor: darkTokens.primarySofter,
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        outlined: {
          "&:not(.MuiInputLabel-shrink)": {
            transform: "translate(12px, 9px) scale(1)",
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: darkTokens.radiusSm,
          backgroundColor: darkTokens.surface2,
          fontSize: 13,
          color: darkTokens.text,
          "& fieldset": { borderColor: darkTokens.border },
          "&:hover fieldset": { borderColor: darkTokens.borderStrong },
          "&.Mui-focused fieldset": { borderColor: darkTokens.primary, borderWidth: 1 },
        },
        input: {
          padding: "9px 12px",
          "&::placeholder": { color: darkTokens.text3, opacity: 1 },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: darkTokens.radiusSm },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: darkTokens.border } },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: darkTokens.surface2,
          color: darkTokens.text,
          fontSize: 12,
          borderRadius: 6,
          padding: "6px 10px",
          border: `1px solid ${darkTokens.border}`,
        },
      },
    },
  },
});

// ── Rétrocompatibilité — index.tsx + tests ────────────────────────────────────
export const CustomizedTheme = lightTheme;
export default lightTheme;
