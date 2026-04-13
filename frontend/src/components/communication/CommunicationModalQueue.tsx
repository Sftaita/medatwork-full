import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import communicationsApi from "../../services/communicationsApi";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { commUnreadCountQueryKey } from "../../hooks/useCommNotifications";
import useAuth from "../../hooks/useAuth";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import type { CommNotification } from "../../types/entities";

interface Props {
  modals: CommNotification[];
  /** Called when all modals have been acknowledged */
  onAllDone: () => void;
}

/**
 * Displays pending modals one at a time, in order.
 * Each modal can only be closed by clicking "J'ai compris".
 * Marks each modal as read before showing the next one.
 */
const CommunicationModalQueue = ({ modals, onAllDone }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marking, setMarking] = useState(false);
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { authentication } = useAuth();

  const current = modals[currentIndex] ?? null;

  const handleAcknowledge = useCallback(async () => {
    if (!current || marking) return;
    setMarking(true);
    try {
      const { method, url } = communicationsApi.markModalRead(current.id);
      await axiosPrivate[method](url);
      // Invalidate comm unread count so badge updates
      queryClient.invalidateQueries({
        queryKey: commUnreadCountQueryKey(authentication.role),
      });
    } catch {
      // Silent — don't block user from dismissing even on network error
    } finally {
      setMarking(false);
      const next = currentIndex + 1;
      if (next >= modals.length) {
        onAllDone();
      } else {
        setCurrentIndex(next);
      }
    }
  }, [current, marking, currentIndex, modals.length, axiosPrivate, queryClient, authentication.role, onAllDone]);

  if (!current) return null;

  return (
    <Dialog
      open
      disableEscapeKeyDown
      onClose={() => {}} // prevent backdrop close
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {current.title}
      </DialogTitle>

      <DialogContent dividers>
        {current.imageUrl && (
          <Box
            component="img"
            src={current.imageUrl}
            alt="illustration"
            sx={{ width: "100%", borderRadius: 1, mb: 2, maxHeight: 280, objectFit: "cover" }}
          />
        )}

        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {current.body}
        </Typography>

        {current.linkUrl && (
          <Box mt={2}>
            <Button
              variant="text"
              href={current.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              {current.buttonLabel ?? "En savoir plus"}
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "flex-end", px: 3, py: 2 }}>
        {modals.length > 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>
            {currentIndex + 1} / {modals.length}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleAcknowledge}
          disabled={marking}
        >
          J'ai compris
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommunicationModalQueue;
