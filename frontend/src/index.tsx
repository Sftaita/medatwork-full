import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CustomizedTheme } from "./doc/CustomizedTheme";
import "./index.css";
import * as Sentry from "@sentry/react";
import env from "./env";

import { createTheme, responsiveFontSizes, ThemeProvider } from "@mui/material/styles";

// ── Sentry initialisation ──────────────────────────────────────────────────
// DSN is empty in dev (.env) — no events sent locally.
// Set VITE_SENTRY_DSN in .env.production for production builds.
Sentry.init({
  dsn: env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: env.VITE_APP_VERSION,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (import.meta.env.DEV) return null;
    return event;
  },
});
// ──────────────────────────────────────────────────────────────────────────

let theme = createTheme(CustomizedTheme);
theme = responsiveFontSizes(theme);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
