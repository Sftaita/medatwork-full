import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdate";

/**
 * Persistent non-dismissable banner shown when a new app version is available.
 * Rendered by App.tsx when usePwaUpdate().needRefresh is true.
 * The banner is fixed at the bottom of the viewport and cannot be closed —
 * the user must click "Mettre à jour" to reload with the new version.
 */
export function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        px: { xs: 2, sm: 3 },
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.18)",
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5}>
        <SystemUpdateIcon fontSize="small" sx={{ flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={500}>
          Une nouvelle version de MED@WORK est disponible.
        </Typography>
      </Box>
      <Button
        size="small"
        onClick={onUpdate}
        sx={{
          bgcolor: "white",
          color: "primary.main",
          fontWeight: 700,
          flexShrink: 0,
          px: 2,
          "&:hover": { bgcolor: "grey.100" },
        }}
      >
        Mettre à jour
      </Button>
    </Box>
  );
}
