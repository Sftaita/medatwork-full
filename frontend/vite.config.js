import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";
import path from "path";

// ─── MUI circular-dep fix ────────────────────────────────────────────────────
//
// Problem chain:
//   @mui/material/Box/Box.js   calls createTheme() at module level (line 9)
//   @mui/system/esm/index.js   re-exports Box  ← creates the cycle
//   esbuild wraps createTheme in __esm(lazy-init) because of that cycle
//   → createTheme_default is undefined when Box.js initialises → TypeError
//
// Fix (two surgical patches):
//
//  1. Box.js  — remove the module-level createTheme() call entirely.
//     Instead call createTheme() lazily inside a React component wrapper
//     that renders once init has completed.
//
//  2. createBox.js — stop destructuring `defaultTheme` from options at call
//     time (which would still fire before __esm inits). Instead, read
//     `options.defaultTheme` inside the render function closure where it is
//     already used, deferring the access to first render.
//
// Both patches are applied during Vite's esbuild pre-bundling phase AND
// during the Rollup build phase so the behaviour is consistent.

function patchMuiBox(code) {
  if (!code.includes("const defaultTheme = createTheme()")) return null;
  // 1. Add React import (Box.js doesn't import it directly)
  // 2. Replace module-level createTheme() + createBox() with a lazy
  //    forwardRef wrapper that defers init to first render, by which
  //    time all esbuild __esm inits have completed.
  return code
    .replace(
      `import { createBox } from '@mui/system';`,
      `import * as React from 'react';\nimport { createBox } from '@mui/system';`
    )
    .replace(
      `const defaultTheme = createTheme();
const Box = createBox({
  themeId: THEME_ID,
  defaultTheme,
  defaultClassName: boxClasses.root,
  generateClassName: ClassNameGenerator.generate
});`,
      `let _MuiBox;
const Box = React.forwardRef(function Box(props, ref) {
  if (!_MuiBox) {
    _MuiBox = createBox({
      themeId: THEME_ID,
      defaultTheme: createTheme(),
      defaultClassName: boxClasses.root,
      generateClassName: ClassNameGenerator.generate,
    });
  }
  return React.createElement(_MuiBox, Object.assign({}, props, { ref }));
});`
    );
}

function patchCreateBox(code) {
  // createBox destructures defaultTheme from options immediately, which
  // triggers our Box.js getter before __esm inits are done.
  // Fix: remove defaultTheme from the destructure; read options.defaultTheme
  // inside the render closure where it was already being used.
  if (!code.includes("defaultTheme,\n    defaultClassName")) return null;
  return code
    .replace(
      "    defaultTheme,\n    defaultClassName",
      "    defaultClassName"
    )
    .replace(
      "const theme = useTheme(defaultTheme);",
      "const theme = useTheme(options.defaultTheme);"
    );
}

function applyPatch(code, id) {
  // Normalize to forward slashes so checks work on Windows too
  const nid = id.replace(/\\/g, "/");
  if (nid.includes("@mui")) {
    if (nid.includes("Box/Box.js")) return patchMuiBox(code);
    if (nid.includes("createBox.js")) return patchCreateBox(code);
  }
  return null;
}

// Vite plugin — Rollup build + serve for non-pre-bundled files
function muiBoxPatchPlugin() {
  return {
    name: "mui-box-patch",
    transform(code, id) {
      const patched = applyPatch(code, id);
      if (!patched) return null;
      return { code: patched, map: null };
    },
  };
}

// esbuild plugin — Vite dep pre-bundling phase (dev server)
const muiBoxPatchEsbuild = {
  name: "mui-box-patch-esbuild",
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, (args) => {
      // Normalize backslashes → forward slashes for Windows compatibility
      const npath = args.path.replace(/\\/g, "/");
      if (!npath.includes("@mui")) return null;
      if (!npath.includes("Box/Box.js") && !npath.includes("createBox.js"))
        return null;
      const code = readFileSync(args.path, "utf8");
      const patched = applyPatch(code, args.path);
      if (!patched) return null;
      return { contents: patched, loader: "js" };
    });
  },
};

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    muiBoxPatchPlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo192.png", "logo512.png", "robots.txt"],
      manifest: {
        name: "MED@WORK",
        short_name: "MED@WORK",
        description: "Gestionnaire de temps de travail",
        lang: "fr",
        scope: "/",
        categories: ["productivity", "business"],
        prefer_related_applications: false,
        theme_color: "#9155FD",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "logo192.png", sizes: "192x192", type: "image/png" },
          { src: "logo512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "logo-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          { src: "/screenshot-narrow.png", sizes: "540x720", type: "image/png", form_factor: "narrow", label: "Saisie des horaires" },
          { src: "/screenshot-wide.png", sizes: "1280x720", type: "image/png", form_factor: "wide", label: "Tableau de bord temps réel" },
        ],
        shortcuts: [
          { name: "Temps réel", url: "/realTime", description: "Voir les statistiques en temps réel" },
          { name: "Validations", url: "/year_detail", description: "Historique de validation des périodes" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [muiBoxPatchEsbuild],
    },
  },
  server: {
    port: 3000,
    open: false,
    watch: {
      // Required on Windows + Docker: inotify events don't cross the volume boundary
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    outDir: "build",
    sourcemap: false,
    // MUI is inherently > 500 KB — it's in a long-term vendor chunk so this is acceptable
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — always needed, cache separately
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // MUI — largest vendor, isolate completely
          "vendor-mui": [
            "@mui/material",
            "@mui/icons-material",
            "@mui/lab",
            "@mui/system",
            "@mui/x-data-grid",
            "@mui/x-date-pickers",
            "@mui/x-date-pickers-pro",
            "@emotion/react",
            "@emotion/styled",
          ],

          // FullCalendar — only used on calendar pages
          "vendor-calendar": [
            "@fullcalendar/core",
            "@fullcalendar/react",
            "@fullcalendar/daygrid",
            "@fullcalendar/timegrid",
            "@fullcalendar/interaction",
            "@fullcalendar/list",
            "@fullcalendar/bootstrap5",
            "@fullcalendar/resource",
            "@fullcalendar/resource-timeline",
          ],

          // Chart libraries — only used on statistics pages
          "vendor-charts": [
            "chart.js",
            "react-chartjs-2",
            "recharts",
            "chartjs-plugin-annotation",
          ],

          // Date utilities
          "vendor-date": ["dayjs"],

          // Form validation — used on signup / settings pages
          "vendor-forms": ["formik", "yup", "@date-io/dayjs"],

          // Sentry — error tracking
          "vendor-sentry": ["@sentry/react"],

          // Small utilities bundled together
          "vendor-utils": [
            "axios",
            "jwt-decode",
            "uuid",
            "aos",
            "react-toastify",
            "react-countup",
            "react-type-animation",
            "react-content-loader",
            "react-copy-to-clipboard",
            "react-lazy-load-image-component",
            "web-vitals",
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
