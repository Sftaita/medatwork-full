/**
 * Shared UI for the Communication management page.
 * Used by both AdminCommunicationPage and HospitalAdminCommunicationPage.
 *
 * The `api` prop lets the parent inject the correct set of API calls
 * (admin vs hospital-admin endpoints).
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

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
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";

import type { CommunicationMessage, CommUserTarget, Hospital } from "../../types/entities";
import type { ApiCall } from "../../services/api.types";

interface ApiSet {
  list(): ApiCall;
  create(): ApiCall;
  update?(id: number): ApiCall;
  delete?(id: number): ApiCall;
  toggleActive(id: number): ApiCall;
  duplicate(id: number): ApiCall;
  listUsers(): ApiCall;
}

interface Props {
  queryKey: readonly string[];
  api: ApiSet;
  /** If true, show hospital column (super admin only) */
  showHospital?: boolean;
}

type FilterType = "all" | "notification" | "modal" | "active" | "inactive";

const SKELETON_ROWS = 5;

const TYPE_LABEL: Record<string, string> = {
  notification: "Notification",
  modal: "Modal",
};

const SCOPE_LABEL: Record<string, string> = {
  all: "Tous",
  role: "Par rôle",
  user: "Utilisateur spécifique",
};

const ROLE_LABEL: Record<string, string> = {
  manager: "Manager",
  resident: "MACCS",
  hospital_admin: "Admin hôpital",
};

interface FormState {
  type: "notification" | "modal";
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
  targetUrl: string;
  priority: string;
  scopeType: "all" | "role" | "user";
  targetRole: string;
  targetUserId: string;
  targetUserType: string;
}

const EMPTY_FORM: FormState = {
  type: "notification",
  title: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  buttonLabel: "",
  targetUrl: "",
  priority: "",
  scopeType: "all",
  targetRole: "",
  targetUserId: "",
  targetUserType: "",
};

// ── Help dialog ───────────────────────────────────────────────────────────────

const HelpDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Comment utiliser les messages ?</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" gutterBottom>
        Les messages vous permettent d'envoyer des communications ciblées aux utilisateurs de votre
        hôpital — résidents, managers ou administrateurs.
      </Typography>

      <Typography variant="subtitle2" mt={2} mb={0.5}>Types de message</Typography>
      <List dense disablePadding>
        {[
          ["Notification", "Apparaît dans la cloche en haut à droite. L'utilisateur peut la lire et la marquer comme lue depuis son centre de notifications."],
          ["Modal (connexion)", "S'affiche automatiquement en popup à la prochaine connexion de l'utilisateur. Idéal pour des annonces importantes."],
        ].map(([label, desc]) => (
          <ListItem key={label} disableGutters sx={{ alignItems: "flex-start", mb: 0.5 }}>
            <ListItemText
              primary={label}
              secondary={desc}
              primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="subtitle2" mb={0.5}>Ciblage</Typography>
      <List dense disablePadding>
        {[
          ["Tous les utilisateurs", "Envoie le message à tous les membres de votre hôpital."],
          ["Par rôle", "Cible uniquement les MACCS, les managers, ou les admins hôpital."],
          ["Utilisateur spécifique", "Envoie à une seule personne identifiée par son nom."],
        ].map(([label, desc]) => (
          <ListItem key={label} disableGutters sx={{ alignItems: "flex-start", mb: 0.5 }}>
            <ListItemText
              primary={label}
              secondary={desc}
              primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="subtitle2" mb={0.5}>Champs optionnels utiles</Typography>
      <List dense disablePadding>
        {[
          ["URL cible au clic", "Pour les notifications : redirige l'utilisateur vers une page de l'application quand il clique sur le message. Ex : /hospital-admin/dashboard"],
          ["Priorité (modal uniquement)", "Si plusieurs modals sont en attente, celui avec la valeur la plus basse s'affiche en premier."],
        ].map(([label, desc]) => (
          <ListItem key={label} disableGutters sx={{ alignItems: "flex-start", mb: 0.5 }}>
            <ListItemText
              primary={label}
              secondary={desc}
              primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="body2" color="text.secondary">
        Un message peut être <strong>désactivé</strong> à tout moment sans le supprimer — il ne sera
        plus visible par les utilisateurs. Vous pouvez aussi le <strong>dupliquer</strong> pour
        réutiliser sa structure.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">Fermer</Button>
    </DialogActions>
  </Dialog>
);

// ── Main component ────────────────────────────────────────────────────────────

const CommunicationPageContent = ({ queryKey, api, showHospital = false }: Props) => {
  const axiosPrivate = useAxiosPrivate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<CommunicationMessage | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedUser, setSelectedUser] = useState<CommUserTarget | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // ── Fetch messages ────────────────────────────────────────────────────────────
  const { data: messages = [], isLoading } = useQuery<CommunicationMessage[]>({
    queryKey,
    queryFn: async () => {
      const { method, url } = api.list();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
  });

  // ── Fetch users for autocomplete ──────────────────────────────────────────────
  const { data: userOptions = [] } = useQuery<CommUserTarget[]>({
    queryKey: [...queryKey, "users"],
    queryFn: async () => {
      const { method, url } = api.listUsers();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
    enabled: dialogOpen && form.scopeType === "user",
  });

  // ── Fetch hospitals list (super-admin only) ───────────────────────────────────
  const { data: hospitals = [] } = useQuery<Hospital[]>({
    queryKey: ["hospitals-for-comm"],
    queryFn: async () => {
      const res = await axiosPrivate.get("admin/hospitals");
      return res?.data ?? [];
    },
    enabled: showHospital && dialogOpen,
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { method, url } = api.create();
      const res = await axiosPrivate[method](url, payload);
      return res.data;
    },
    onMutate: async (payload) => {
      // Ferme le dialog immédiatement — feedback instantané
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      setSelectedHospital(null);

      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CommunicationMessage[]>(queryKey);

      const optimistic: CommunicationMessage = {
        id: -Date.now(), // ID temporaire négatif
        type: payload.type as "notification" | "modal",
        title: payload.title as string,
        body: payload.body as string,
        imageUrl: (payload.imageUrl as string | null) ?? null,
        linkUrl: (payload.linkUrl as string | null) ?? null,
        buttonLabel: (payload.buttonLabel as string | null) ?? null,
        targetUrl: (payload.targetUrl as string | null) ?? null,
        scopeType: payload.scopeType as "all" | "role" | "user",
        targetRole: (payload.targetRole as string | null) ?? null,
        targetUserId: (payload.targetUserId as number | null) ?? null,
        targetUserType: (payload.targetUserType as string | null) ?? null,
        hospital: selectedHospital ? { id: selectedHospital.id, name: selectedHospital.name } : null,
        isActive: true,
        authorType: "hospital_admin",
        authorId: 0,
        readCount: 0,
        createdAt: new Date().toISOString(),
      };

      qc.setQueryData<CommunicationMessage[]>(queryKey, (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _payload, context) => {
      // Rollback
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
      toast.error("Impossible de créer le message.");
    },
    onSuccess: () => {
      toast.success("Message créé.");
    },
    onSettled: () => {
      // Synchronise avec le serveur dans tous les cas
      qc.invalidateQueries({ queryKey });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const { method, url } = api.toggleActive(id);
      await axiosPrivate[method](url);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CommunicationMessage[]>(queryKey);
      qc.setQueryData<CommunicationMessage[]>(queryKey, (old = []) =>
        old.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
      toast.error("Impossible de modifier le statut.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const { method, url } = api.duplicate(id);
      const res = await axiosPrivate[method](url);
      return res.data;
    },
    onSuccess: (newMessage: CommunicationMessage) => {
      toast.success("Message dupliqué.");
      qc.setQueryData<CommunicationMessage[]>(queryKey, (old = []) => [newMessage, ...old]);
    },
    onError: () => toast.error("Impossible de dupliquer le message."),
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const call = api.update!(id);
      const res = await axiosPrivate[call.method](call.url, payload);
      return res.data as CommunicationMessage;
    },
    onMutate: async ({ id, payload }) => {
      setDialogOpen(false);
      setEditingMessage(null);
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      setSelectedHospital(null);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CommunicationMessage[]>(queryKey);
      qc.setQueryData<CommunicationMessage[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.id === id
            ? {
                ...m,
                type:           payload.type as "notification" | "modal",
                title:          payload.title as string,
                body:           payload.body as string,
                imageUrl:       (payload.imageUrl as string | null) ?? null,
                linkUrl:        (payload.linkUrl as string | null) ?? null,
                buttonLabel:    (payload.buttonLabel as string | null) ?? null,
                targetUrl:      (payload.targetUrl as string | null) ?? null,
                scopeType:      payload.scopeType as "all" | "role" | "user",
                targetRole:     (payload.targetRole as string | null) ?? null,
                targetUserId:   (payload.targetUserId as number | null) ?? null,
                targetUserType: (payload.targetUserType as string | null) ?? null,
              }
            : m
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
      toast.error("Impossible de modifier le message.");
    },
    onSuccess: () => {
      toast.success("Message modifié.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const call = api.delete!(id);
      await axiosPrivate[call.method](call.url);
    },
    onMutate: async (id) => {
      setConfirmDeleteId(null);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CommunicationMessage[]>(queryKey);
      qc.setQueryData<CommunicationMessage[]>(queryKey, (old = []) => old.filter((m) => m.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
      toast.error("Impossible de supprimer le message.");
    },
    onSuccess: () => {
      toast.success("Message supprimé.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (filter) {
      case "notification": return messages.filter((m) => m.type === "notification");
      case "modal":        return messages.filter((m) => m.type === "modal");
      case "active":       return messages.filter((m) => m.isActive);
      case "inactive":     return messages.filter((m) => !m.isActive);
      default:             return messages;
    }
  }, [messages, filter]);

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleOpenEdit = (m: CommunicationMessage) => {
    setEditingMessage(m);
    setForm({
      type:           m.type,
      title:          m.title,
      body:           m.body,
      imageUrl:       m.imageUrl ?? "",
      linkUrl:        m.linkUrl ?? "",
      buttonLabel:    m.buttonLabel ?? "",
      targetUrl:      m.targetUrl ?? "",
      priority:       "",
      scopeType:      m.scopeType,
      targetRole:     m.targetRole ?? "",
      targetUserId:   m.targetUserId?.toString() ?? "",
      targetUserType: m.targetUserType ?? "",
    });
    setSelectedHospital(m.hospital ? { id: m.hospital.id, name: m.hospital.name } : null);
    setSelectedUser(null); // autocomplete reset — user must reselect if needed
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Titre et contenu sont obligatoires.");
      return;
    }
    const payload: Record<string, unknown> = {
      type:        form.type,
      title:       form.title.trim(),
      body:        form.body.trim(),
      imageUrl:    form.imageUrl  || null,
      linkUrl:     form.linkUrl   || null,
      buttonLabel: form.buttonLabel || null,
      targetUrl:   form.targetUrl  || null,
      priority:    form.priority ? parseInt(form.priority, 10) : null,
      scopeType:   form.scopeType,
      targetRole:  form.scopeType === "role" ? form.targetRole : null,
      targetUserId:   form.scopeType === "user" ? (selectedUser?.id ?? null) : null,
      targetUserType: form.scopeType === "user" ? (selectedUser?.type ?? null) : null,
    };
    if (showHospital && selectedHospital) {
      payload.hospitalId = selectedHospital.id;
    }

    if (editingMessage && api.update) {
      updateMutation.mutate({ id: editingMessage.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Scope description ─────────────────────────────────────────────────────────
  const scopeDescription = (m: CommunicationMessage): string => {
    if (m.scopeType === "all") return showHospital && m.hospital ? m.hospital.name : "Tous les utilisateurs";
    if (m.scopeType === "role") return ROLE_LABEL[m.targetRole ?? ""] ?? m.targetRole ?? "-";
    return `Utilisateur #${m.targetUserId} (${ROLE_LABEL[m.targetUserType ?? ""] ?? m.targetUserType})`;
  };

  return (
    <Box p={4} maxWidth={1200} mx="auto">
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Communication</Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez vos notifications et modals envoyés aux utilisateurs
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nouveau message
        </Button>
      </Box>

      {/* Filters */}
      <Box mb={2}>
        <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => v && setFilter(v)} size="small">
          <ToggleButton value="all">Tous ({messages.length})</ToggleButton>
          <ToggleButton value="notification">Notifications</ToggleButton>
          <ToggleButton value="modal">Modals</ToggleButton>
          <ToggleButton value="active">Actifs</ToggleButton>
          <ToggleButton value="inactive">Inactifs</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!isLoading && filtered.length === 0 && (
        <Alert severity="info">Aucun message dans cette catégorie.</Alert>
      )}

      {(isLoading || filtered.length > 0) && (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Cible</TableCell>
                  {showHospital && <TableCell>Hôpital</TableCell>}
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Lectures</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: showHospital ? 8 : 7 }).map((__, j) => (
                          <TableCell key={j}><Skeleton variant="text" width="80%" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Chip
                            label={TYPE_LABEL[m.type]}
                            size="small"
                            color={m.type === "notification" ? "primary" : "secondary"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <Tooltip title={m.title}>
                            <span>{m.title}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{scopeDescription(m)}</Typography>
                        </TableCell>
                        {showHospital && (
                          <TableCell>
                            <Typography variant="caption">{m.hospital?.name ?? "Global"}</Typography>
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip
                            label={m.isActive ? "Actif" : "Inactif"}
                            size="small"
                            color={m.isActive ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell align="right">{m.readCount}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {new Date(m.createdAt).toLocaleDateString("fr-BE")}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5} justifyContent="center">
                            {api.update && (
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => handleOpenEdit(m)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={m.isActive ? "Cliquer pour désactiver" : "Cliquer pour activer"}>
                              <IconButton
                                size="small"
                                onClick={() => toggleMutation.mutate(m.id)}
                                sx={{
                                  color: m.isActive ? "success.main" : "text.disabled",
                                  "&:hover": {
                                    bgcolor: m.isActive ? "error.50" : "success.50",
                                    color: m.isActive ? "error.main" : "success.main",
                                  },
                                }}
                              >
                                {m.isActive
                                  ? <ToggleOnIcon sx={{ fontSize: 26 }} />
                                  : <ToggleOffIcon sx={{ fontSize: 26 }} />
                                }
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Dupliquer">
                              <IconButton size="small" onClick={() => duplicateMutation.mutate(m.id)}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {api.delete && (
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={() => setConfirmDeleteId(m.id)}
                                  sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer ce message ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est irréversible. Le message sera définitivement supprimé et ne sera plus
            visible par les utilisateurs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDeleteId !== null && deleteMutation.mutate(confirmDeleteId)}
            disabled={deleteMutation.isPending}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help dialog */}
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingMessage(null); setForm(EMPTY_FORM); setSelectedUser(null); setSelectedHospital(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <span>{editingMessage ? "Modifier le message" : "Nouveau message"}</span>
            <Tooltip title="Comment ça fonctionne ?">
              <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: "text.secondary" }}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* Type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "notification" | "modal" }))}
              >
                <MenuItem value="notification">Notification</MenuItem>
                <MenuItem value="modal">Modal (connexion)</MenuItem>
              </Select>
            </FormControl>

            {/* Scope */}
            <FormControl size="small" fullWidth>
              <InputLabel>Ciblage</InputLabel>
              <Select
                value={form.scopeType}
                label="Ciblage"
                onChange={(e) => {
                  setForm((p) => ({ ...p, scopeType: e.target.value as "all" | "role" | "user", targetRole: "", targetUserId: "", targetUserType: "" }));
                  setSelectedUser(null);
                }}
              >
                <MenuItem value="all">Tous les utilisateurs</MenuItem>
                <MenuItem value="role">Par rôle</MenuItem>
                <MenuItem value="user">Utilisateur spécifique</MenuItem>
              </Select>
            </FormControl>

            {form.scopeType === "role" && (
              <FormControl size="small" fullWidth>
                <InputLabel>Rôle cible</InputLabel>
                <Select
                  value={form.targetRole}
                  label="Rôle cible"
                  onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))}
                >
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="resident">MACCS</MenuItem>
                  <MenuItem value="hospital_admin">Admin hôpital</MenuItem>
                </Select>
              </FormControl>
            )}

            {form.scopeType === "user" && (
              <Autocomplete
                options={userOptions}
                getOptionLabel={(u) => `${u.firstname} ${u.lastname} (${ROLE_LABEL[u.type] ?? u.type})`}
                value={selectedUser}
                onChange={(_, v) => setSelectedUser(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Utilisateur cible" size="small" />
                )}
              />
            )}

            {showHospital && (
              <Autocomplete
                options={hospitals}
                getOptionLabel={(h) => h.name}
                value={selectedHospital}
                onChange={(_, v) => setSelectedHospital(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Hôpital cible (optionnel)"
                    size="small"
                    helperText="Laisser vide pour un message global toutes institutions"
                  />
                )}
              />
            )}

            <TextField label="Titre *" size="small" value={form.title} onChange={set("title")} inputProps={{ maxLength: 255 }} />
            <TextField label="Contenu *" size="small" multiline rows={4} value={form.body} onChange={set("body")} />
            <TextField label="URL image (optionnel)" size="small" value={form.imageUrl} onChange={set("imageUrl")} />
            <TextField label="URL lien (optionnel)" size="small" value={form.linkUrl} onChange={set("linkUrl")} />
            <TextField label="Libellé bouton (optionnel)" size="small" value={form.buttonLabel} onChange={set("buttonLabel")} inputProps={{ maxLength: 100 }} />
            {form.type === "notification" && (
              <TextField label="URL cible au clic (optionnel)" size="small" value={form.targetUrl} onChange={set("targetUrl")} helperText="Ex: /hospital-admin/dashboard" />
            )}
            {form.type === "modal" && (
              <TextField label="Priorité (optionnel)" size="small" type="number" value={form.priority} onChange={set("priority")} helperText="Ordre d'affichage — plus petit = affiché en premier" />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setEditingMessage(null); setForm(EMPTY_FORM); setSelectedUser(null); setSelectedHospital(null); }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingMessage ? "Enregistrer" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationPageContent;
