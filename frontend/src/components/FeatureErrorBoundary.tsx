import * as Sentry from "@sentry/react";
import { Box, Button, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import type { ReactNode } from "react";

/**
 * Inline error boundary for page-level content.
 *
 * Unlike SentryErrorBoundary (which is fullscreen), this renders an inline
 * error card so the sidebar and navigation remain functional when a single
 * page crashes.
 *
 * Usage:
 *   <FeatureErrorBoundary>
 *     <SomePage />
 *   </FeatureErrorBoundary>
 */
function InlineFallback({ resetError }: { resetError: () => void }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="50vh"
      gap={2}
      p={4}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6" color="error" align="center">
        Cette page a rencontré une erreur.
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        Notre équipe a été notifiée automatiquement.
      </Typography>
      <Button variant="outlined" color="primary" onClick={resetError}>
        Réessayer
      </Button>
    </Box>
  );
}

const FeatureErrorBoundary = ({ children }: { children: ReactNode }) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => <InlineFallback resetError={resetError} />}
    showDialog={false}
  >
    {children}
  </Sentry.ErrorBoundary>
);

export default FeatureErrorBoundary;
