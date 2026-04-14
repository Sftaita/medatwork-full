import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Pagination from "@mui/material/Pagination";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";

import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import communicationsApi from "../../services/communicationsApi";
import { commUnreadCountQueryKey } from "../../hooks/useCommNotifications";
import useAuth from "../../hooks/useAuth";
import type { CommNotification } from "../../types/entities";

const QUERY_KEY = ["ha-comm-notifications"] as const;
const SKELETON_ROWS = 5;
const PAGE_SIZE = 20;

const HospitalAdminNotificationsPage = () => {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [selectedNotif, setSelectedNotif] = useState<CommNotification | null>(null);
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authentication } = useAuth();

  const { data: notifications = [], isLoading } = useQuery<CommNotification[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { method, url } = communicationsApi.getNotifications();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: number) => {
      const { method, url } = communicationsApi.markNotificationRead(id);
      await axiosPrivate[method](url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: commUnreadCountQueryKey(authentication.role) });
    },
    onError: () => toast.error("Impossible de marquer la notification comme lue."),
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (id: number) => {
      const { method, url } = communicationsApi.markNotificationUnread(id);
      await axiosPrivate[method](url);
    },
    onSuccess: (_, id) => {
      // Update the dialog notif state immediately
      setSelectedNotif((prev) => (prev?.id === id ? { ...prev, isRead: false } : prev));
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: commUnreadCountQueryKey(authentication.role) });
    },
    onError: () => toast.error("Impossible de marquer la notification comme non lue."),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const { method, url } = communicationsApi.markAllNotificationsRead();
      await axiosPrivate[method](url);
    },
    onSuccess: () => {
      toast.success("Toutes les notifications ont été marquées comme lues.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: commUnreadCountQueryKey(authentication.role) });
    },
    onError: () => toast.error("Une erreur est survenue."),
  });

  const handleRowClick = (n: CommNotification) => {
    if (!n.isRead) markOneMutation.mutate(n.id);
    setSelectedNotif(n);
  };

  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter]
  );
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedNotifs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Box p={4} maxWidth={1100} mx="auto">
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Messages reçus depuis la plateforme
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => { if (v) { setFilter(v); setPage(1); } }}
            size="small"
          >
            <ToggleButton value="all">Toutes ({notifications.length})</ToggleButton>
            <ToggleButton value="unread">Non lues ({unreadCount})</ToggleButton>
          </ToggleButtonGroup>

          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              Tout marquer comme lu
            </Button>
          )}
        </Box>
      </Box>

      {!isLoading && filtered.length === 0 && (
        <Alert severity="info">
          {filter === "unread" ? "Aucune notification non lue." : "Aucune notification."}
        </Alert>
      )}

      {(isLoading || filtered.length > 0) && (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Titre</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" width="80%" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagedNotifs.map((n) => (
                      <TableRow
                        key={n.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          fontWeight: n.isRead ? "normal" : "bold",
                          bgcolor: n.isRead ? undefined : "action.hover",
                        }}
                        onClick={() => handleRowClick(n)}
                      >
                        <TableCell sx={{ fontWeight: n.isRead ? 400 : 700 }}>
                          {n.title}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.body}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {new Date(n.createdAt).toLocaleDateString("fr-BE")}
                        </TableCell>
                        <TableCell>
                          {n.isRead ? (
                            <Chip label="Lu" size="small" color="default" />
                          ) : (
                            <Chip label="Non lu" size="small" color="primary" />
                          )}
                        </TableCell>
                        <TableCell>
                          {n.targetUrl && (
                            <Tooltip title="Ouvrir le lien">
                              <OpenInNewIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      {/* ── Notification detail dialog ─────────────────────────────────────── */}
      <Dialog
        open={selectedNotif !== null}
        onClose={() => setSelectedNotif(null)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="notif-dialog-title"
      >
        {selectedNotif && (
          <>
            <DialogTitle id="notif-dialog-title" sx={{ pr: 6 }}>
              {selectedNotif.title}
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {new Date(selectedNotif.createdAt).toLocaleDateString("fr-BE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Typography variant="body1" whiteSpace="pre-wrap">
                {selectedNotif.body}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
              <Box display="flex" gap={1}>
                {selectedNotif.targetUrl && (
                  <Button
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => {
                      setSelectedNotif(null);
                      navigate(selectedNotif.targetUrl!);
                    }}
                  >
                    Ouvrir le lien
                  </Button>
                )}
                {selectedNotif.isRead && (
                  <Button
                    size="small"
                    startIcon={<MarkEmailUnreadIcon />}
                    onClick={() => markUnreadMutation.mutate(selectedNotif.id)}
                    disabled={markUnreadMutation.isPending}
                  >
                    Marquer non lu
                  </Button>
                )}
              </Box>
              <Button
                size="small"
                startIcon={<CloseIcon />}
                onClick={() => setSelectedNotif(null)}
              >
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default HospitalAdminNotificationsPage;
