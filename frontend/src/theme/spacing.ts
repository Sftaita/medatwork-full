// spacing.ts — système d'espacement 4pt pour MED@WORK
import type { ThemeOptions } from "@mui/material/styles";
import { fluid } from "./typography";

// Échelle fixe nommée — aligner les constantes dans le code.
export const space = {
  none: "0",
  xxs:  "2px",
  xs:   "4px",
  sm:   "8px",
  md:   "12px",
  lg:   "16px",
  xl:   "24px",
  "2xl":"32px",
  "3xl":"48px",
  "4xl":"64px",
} as const;

// Tokens fluides — clamp() entre mobile et desktop.
export const fluidSpace = {
  pagePaddingX:    fluid(16, 48),
  pagePaddingY:    fluid(20, 36),
  sectionGap:      fluid(20, 32),
  blockGap:        fluid(16, 24),

  cardPadding:     fluid(16, 24),
  tableCellX:      fluid(14, 22),
  tableCellY:      fluid(12, 16),
  drawerPaddingX:  fluid(14, 22),
  drawerItemX:     fluid(10, 14),
  topbarPaddingX:  fluid(20, 36),
  topbarPaddingY:  fluid(12, 16),

  inlineGap:       fluid(8, 12),
  groupGap:        fluid(12, 16),
} as const;

// Constantes structurelles (largeurs/hauteurs fixes).
export const layout = {
  drawerWidth:      240,
  drawerWidthDense: 72,
  topbarHeight:     64,
  tabsHeight:       44,
  contentMaxWidth:  1280,
} as const;

export const breakpoints: ThemeOptions["breakpoints"] = {
  values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
};

export const spacingExtras = {
  space: { ...fluidSpace, fixed: space },
  layout,
};

// Augmentation TypeScript — donne theme.space.* et theme.layout.* avec autocomplétion.
declare module "@mui/material/styles" {
  interface Theme {
    space: typeof fluidSpace & { fixed: typeof space };
    layout: typeof layout;
  }
  interface ThemeOptions {
    space?: typeof fluidSpace & { fixed: typeof space };
    layout?: typeof layout;
  }
}
