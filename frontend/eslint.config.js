import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

// ── Globals shared across JS and TS ──────────────────────────────────────────
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  fetch: "readonly",
  URL: "readonly",
  FormData: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  alert: "readonly",
  confirm: "readonly",
  location: "readonly",
  Promise: "readonly",
  JSON: "readonly",
  Math: "readonly",
  Date: "readonly",
  Error: "readonly",
  File: "readonly",
  Blob: "readonly",
  atob: "readonly",
  btoa: "readonly",
  console: "readonly",
  AbortController: "readonly",
  MutationObserver: "readonly",
  ResizeObserver: "readonly",
  IntersectionObserver: "readonly",
};

// ── Shared rules applied to both JS and TS files ──────────────────────────────
const sharedRules = {
  // Hooks (classic rules only — React Compiler rules are opt-in, app not using compiler)
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",

  // React
  "react/react-in-jsx-scope": "off",
  "react/prop-types": "off", // TypeScript covers this
  "react/display-name": "warn",
  "react/no-unescaped-entities": "off", // French content uses apostrophes — handled at dev discretion
  "react/no-unknown-property": ["error", { ignore: ["sx"] }],
  "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

  // Unused imports — auto-removable
  "unused-imports/no-unused-imports": "error",

  // Quality
  "no-console": "error",
  "no-debugger": "error",
  eqeqeq: ["error", "always"],
  "no-var": "error",
  "prefer-const": "warn",
};

export default [
  // ── Base JS recommended ────────────────────────────────────────────────────
  js.configs.recommended,

  // ── JS / JSX files ────────────────────────────────────────────────────────
  {
    ...reactPlugin.configs.flat.recommended,
    files: ["src/**/*.{js,jsx}"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: browserGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...sharedRules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // ── TypeScript / TSX files ─────────────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "unused-imports": unusedImports,
      react: reactPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: browserGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...sharedRules,
      // TypeScript's compiler handles undefined variables and DOM types
      "no-undef": "off",
      // Use TS-aware unused vars rule instead of base rule
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // ── Test files — relax rules ───────────────────────────────────────────────
  {
    files: ["src/**/*.test.{js,jsx,ts,tsx}", "src/tests/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
      "no-console": "off",
    },
  },

  // ── Generated / legacy files ───────────────────────────────────────────────
  {
    files: ["src/serviceWorkerRegistration.js", "src/reportWebVitals.js"],
    rules: { "no-console": "off" },
  },

  // ── Prettier — must be last to disable conflicting formatting rules ─────────
  prettierConfig,

  // ── Playwright E2E tests — TypeScript but no React rules needed ───────────
  {
    files: ["e2e/**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: { parser: tsParser, globals: browserGlobals },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
    },
  },

  // ── Ignores ───────────────────────────────────────────────────────────────
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];
