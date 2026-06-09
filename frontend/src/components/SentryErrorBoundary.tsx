import * as Sentry from "@sentry/react";
import { Box, Button, Typography } from "@mui/material";
import { type ReactNode, useEffect } from "react";
import { isChunkLoadError, CHUNK_RELOAD_KEY } from "../utils/chunkErrorHandler";

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

// Clears the chunk-reload flag once the app subtree mounts without error.
// This component is only rendered when the ErrorBoundary did NOT catch anything,
// so the effect only fires on a successful load — never when the fallback is shown.
function ChunkReloadGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }, []);
  return <>{children}</>;
}

const SentryErrorBoundary = ({ children }: { children: ReactNode }) => (
  <Sentry.ErrorBoundary
    onError={(error) => {
      if (!isChunkLoadError(error)) return;
      try {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      } catch {
        // Storage unavailable (SecurityError, QuotaExceededError) — skip reload
        // to avoid an unguarded infinite-reload loop.
        return;
      }
      window.location.reload();
    }}
    fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    showDialog={false}
  >
    <ChunkReloadGuard>
      {children}
    </ChunkReloadGuard>
  </Sentry.ErrorBoundary>
);

export default SentryErrorBoundary;
