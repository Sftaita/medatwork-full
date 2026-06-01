import { useEffect, useState } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LockIcon from "@mui/icons-material/Lock";
import useValidationContext from "../../../../../hooks/useValidationContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValidationEntry {
  residentId: number;
  status: string;
  managerComment: string;
  managerCommentAuthorName?: string | null;
  managerCommentAt?: string | null;
  residentNotification: string;
}

interface Props {
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
  notificationType: "ResidentNotification" | "ManagerNotification";
  residentId: number;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function MessageBox({ openDialog, setOpenDialog, notificationType, residentId }: Props) {
  const theme = useTheme();
  const { residentValidationData, setResidentValidationData } = useValidationContext();

  const [message, setMessage] = useState("");

  const isManagerComment  = notificationType === "ManagerNotification";
  const isResidentMessage = notificationType === "ResidentNotification";

  // ── Lire l'entrée courante du store ────────────────────────────────────────
  const entry = (residentValidationData as ValidationEntry[]).find(
    (r) => r.residentId === residentId
  ) ?? null;

  const existingComment = isManagerComment
    ? (entry?.managerComment ?? "")
    : (entry?.residentNotification ?? "");

  // ── Synchroniser le textarea à l'ouverture ─────────────────────────────────
  useEffect(() => {
    if (openDialog) {
      setMessage(existingComment);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDialog, notificationType, residentId]);

  // ── Confirmer ──────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const data = residentValidationData as ValidationEntry[];
    const updated = data.map((r) =>
      r.residentId === residentId
        ? isManagerComment
          ? { ...r, managerComment: message }
          : { ...r, residentNotification: message }
        : r
    );
    setResidentValidationData(updated);
    setOpenDialog(false);
  };

  const handleClose = () => setOpenDialog(false);

  // ── Métadonnées affichées pour le commentaire interne ─────────────────────
  const hasExistingComment = existingComment.trim().length > 0;
  const authorName = entry?.managerCommentAuthorName;
  const commentAt  = entry?.managerCommentAt?.substring(0, 10);

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={openDialog}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", border: "none" } }}
    >
      {/* ── Titre avec badge de visibilité ───────────────────────────────── */}
      <DialogTitle sx={{ pb: 0 }}>
        <Box display="flex" alignItems="flex-start" gap={1.5}>
          {isManagerComment && (
            <Box sx={{
              mt: "2px",
              p: "6px",
              borderRadius: "8px",
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: "warning.main",
              flex: "none",
            }}>
              <LockIcon sx={{ fontSize: 16, display: "block" }} />
            </Box>
          )}
          <Box>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
              {isManagerComment
                ? "Commentaire interne manager"
                : "Message au MACCS"}
            </Typography>
            {/* Badge de visibilité */}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                mt: "6px",
                fontSize: 11,
                fontWeight: 600,
                px: "10px",
                py: "3px",
                borderRadius: 999,
                bgcolor: isManagerComment
                  ? alpha(theme.palette.warning.main, 0.1)
                  : alpha(theme.palette.success.main, 0.1),
                color: isManagerComment ? "warning.main" : "success.main",
              }}
            >
              {isManagerComment
                ? "Non visible par le MACCS"
                : "Visible par le MACCS"}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Description selon le type ─────────────────────────────────── */}
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2, lineHeight: 1.6 }}>
          {isManagerComment
            ? "Visible par les managers autorisés, les RH et l'admin hôpital. Non transmis au MACCS."
            : "Ce message sera inclus dans la notification envoyée au MACCS."}
        </Typography>

        {/* ── Commentaire précédent : auteur + date ─────────────────────── */}
        {isManagerComment && hasExistingComment && authorName && (
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1.5,
            p: "10px 14px",
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            borderRadius: "10px",
          }}>
            <LockIcon sx={{ fontSize: 14, color: "warning.main", flex: "none" }} />
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              Commentaire de{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                {authorName}
              </Box>
              {commentAt && ` le ${commentAt}`}
            </Typography>
          </Box>
        )}

        {/* ── Zone de saisie ────────────────────────────────────────────── */}
        <TextField
          autoFocus
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          label={isManagerComment ? "Commentaire interne" : "Message au MACCS"}
          placeholder={isManagerComment
            ? "Ex. : Vérifié avec le maître de stage — dépassement autorisé."
            : "Ex. : Votre mois d'avril est validé, bravo pour votre investissement."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          inputProps={{ "aria-label": isManagerComment ? "Commentaire interne manager" : "Message au MACCS" }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="text" onClick={handleClose} sx={{ color: "text.secondary" }}>
          Annuler
        </Button>
        <Button variant="contained" onClick={handleConfirm}>
          {isManagerComment ? "Enregistrer le commentaire" : "Enregistrer le message"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
