import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import { LoadingButton } from "@mui/lab";

interface Props {
  open: boolean;
  saving: boolean;
  /** L'utilisateur annule et reste sur la période/l'onglet courant. */
  onCancel: () => void;
  /** L'utilisateur quitte sans sauvegarder — modifications perdues. */
  onDiscard: () => void;
  /** L'utilisateur demande à sauvegarder puis naviguer. */
  onSaveAndContinue: () => void;
}

export default function ConfirmLeaveDialog({ open, saving, onCancel, onDiscard, onSaveAndContinue }: Props) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          maxWidth:     420,
          width:        "100%",
          p:            0,
          border:       "none",
        },
      }}
      BackdropProps={{ sx: { backdropFilter: "blur(2px)", background: "rgba(38,30,46,.42)" } }}
    >
      <Box sx={{ p: "28px" }}>
        <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600, mb: 1 }}>
          Modifications non sauvegardées
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
          Vous avez des validations non enregistrées sur ce mois. Que souhaitez-vous faire ?
        </Typography>

        <Box display="flex" flexDirection="column" gap={1.25}>
          {/* Enregistrer puis continuer */}
          <LoadingButton
            variant="contained"
            loading={saving}
            onClick={onSaveAndContinue}
            fullWidth
            sx={{ height: 44, fontWeight: 600 }}
          >
            Enregistrer puis continuer
          </LoadingButton>

          {/* Quitter sans enregistrer */}
          <Box
            component="button"
            onClick={onDiscard}
            disabled={saving}
            sx={{
              width:        "100%",
              height:       44,
              border:       `1px solid ${theme.palette.error.main}`,
              borderRadius: "11px",
              bgcolor:      "transparent",
              color:        "error.main",
              fontWeight:   600,
              fontSize:     13.5,
              fontFamily:   "inherit",
              cursor:       "pointer",
              transition:   theme.transitions.create(["background"]),
              "&:hover:not(:disabled)": { bgcolor: alpha(theme.palette.error.main, 0.06) },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            Quitter sans enregistrer
          </Box>

          {/* Annuler */}
          <Box
            component="button"
            onClick={onCancel}
            disabled={saving}
            sx={{
              width:     "100%",
              height:    40,
              border:    "none",
              bgcolor:   "transparent",
              color:     "text.secondary",
              fontWeight:600,
              fontSize:  13.5,
              fontFamily:"inherit",
              cursor:    "pointer",
              borderRadius: "11px",
              "&:hover:not(:disabled)": { bgcolor: "background.default" },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            Annuler
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
