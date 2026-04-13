import * as Sentry from "@sentry/react";
import { Box, Button, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Global error boundary — catches unhandled React render errors and
 * reports them to Sentry with full component stack context.
 *
 * Wrap the entire app in App.jsx so no crash goes untracked.
 */
function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
      p={4}
    >
      <Typography variant="h5" color="error">
        Une erreur inattendue est survenue.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Notre équipe a été automatiquement notifiée.
      </Typography>
      <Button variant="contained" onClick={resetError}>
        Réessayer
      </Button>
    </Box>
  );
}

const SentryErrorBoundary = ({ children }: { children: ReactNode }) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    showDialog={false}
  >
    {children}
  </Sentry.ErrorBoundary>
);

export default SentryErrorBoundary;
