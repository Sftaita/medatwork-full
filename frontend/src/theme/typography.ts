// typography.ts — échelle responsive pour MED@WORK
// Importé dans CustomizedTheme.tsx (light ET dark) — source unique.

import type { ThemeOptions } from "@mui/material/styles";

// Rampe linéaire entre 600px (sm) et 1440px (lg+).
const fluid = (minPx: number, maxPx: number, minVw = 600, maxVw = 1440) => {
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  return `clamp(${minPx}px, calc(${intercept.toFixed(3)}px + ${(slope * 100).toFixed(4)}vw), ${maxPx}px)`;
};

export const typography: ThemeOptions["typography"] = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',

  h1: { fontSize: fluid(28, 40), lineHeight: 1.1,  fontWeight: 700, letterSpacing: "-0.015em" },
  h2: { fontSize: fluid(24, 32), lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.01em"  },
  h3: { fontSize: fluid(24, 36), lineHeight: 1.2,  fontWeight: 700, letterSpacing: "-0.01em"  },
  h4: { fontSize: fluid(18, 22), lineHeight: 1.3,  fontWeight: 600 },
  h5: { fontSize: fluid(16, 18), lineHeight: 1.35, fontWeight: 600 },
  h6: { fontSize: fluid(14, 16), lineHeight: 1.4,  fontWeight: 600 },

  subtitle1: { fontSize: fluid(15, 16), lineHeight: 1.5,  fontWeight: 500 },
  subtitle2: { fontSize: fluid(13, 14), lineHeight: 1.5,  fontWeight: 600 },
  body1:     { fontSize: fluid(14, 15), lineHeight: 1.6,  fontWeight: 400 },
  body2:     { fontSize: fluid(13, 14), lineHeight: 1.55, fontWeight: 400 },

  button:   { fontSize: fluid(13, 14), fontWeight: 600, letterSpacing: "0.02em", textTransform: "none" },
  caption:  { fontSize: fluid(11, 12), lineHeight: 1.4,  fontWeight: 500 },
  overline: { fontSize: fluid(10.5, 11.5), fontWeight: 600, letterSpacing: "0.14em", lineHeight: 1.4 },
};

// Échelle UI compacte (tableaux, sidebar, onglets).
export const uiScale = {
  tableCell:   fluid(12.5, 13.5),
  tableHeader: fluid(11,   11.5),
  navItem:     fluid(11,   11.5),
  tabLabel:    fluid(12,   12.5),
  searchInput: fluid(13,   13.5),
};

export { fluid };
