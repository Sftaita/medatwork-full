import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import adminApi from "../../services/adminApi";
import type { ContactMessage, ContactCcConfig } from "../../services/adminApi";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import AddIcon from "@mui/icons-material/Add";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (dt: string) =>
  new Date(dt).toLocaleString("fr-BE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

// ── Message detail dialog ─────────────────────────────────────────────────────

const MessageDialog = ({
  msg,
  onClose,
  onTreat,
  treating,
}: {
  msg: ContactMessage | null;
  onClose: () => void;
  onTreat: (id: number) => void;
  treating: boolean;
}) => {
  if (!msg) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Message de {msg.lastname} {msg.firstname}
        <Typography variant="caption" color="text.secondary" display="block">
          {fmt(msg.createdAt)} — <a href={`mailto:${msg.email}`}>{msg.email}</a>
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{msg.message}</Typography>
        {msg.treated && (
          <Box mt={2} p={1.5} bgcolor="success.50" borderRadius={1}>
            <Typography variant="caption" color="success.main" fontWeight={600}>
              Traité le {fmt(msg.treatedAt!)} par {msg.treatedBy}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {!msg.treated && (
          <Button
            variant="contained"
            color="success"
            onClick={() => onTreat(msg.id)}
            disabled={treating}
            startIcon={treating ? <CircularProgress size={14} /> : <CheckCircleIcon />}
          >
            Marquer comme traité
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── Messages tab ──────────────────────────────────────────────────────────────

const MessagesTab = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "untreated" | "treated">("all");
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["admin-contact-messages", filter],
    queryFn: () => adminApi.listContactMessages(filter === "all" ? undefined : filter),
    refetchOnWindowFocus: false,
  });

  const treatMut = useMutation({
    mutationFn: adminApi.treatContactMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-contact-stats"] });
      setSelected((prev) => prev ? { ...prev, treated: true } : null);
      toast.success("Message marqué comme traité");
    },
    onError: () => toast.error("Erreur lors du traitement"),
  });

  const deleteMut = useMutation({
    mutationFn: adminApi.deleteContactMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast.success("Message supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filtre</InputLabel>
          <Select value={filter} label="Filtre" onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="untreated">Non traités</MenuItem>
            <MenuItem value="treated">Traités</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">{data.length} message(s)</Typography>
      </Box>

      {isLoading && <CircularProgress size={24} />}
      {isError && <Alert severity="error">Erreur de chargement</Alert>}
      {!isLoading && !isError && data.length === 0 && (
        <Alert severity="info">Aucun message{filter !== "all" ? " dans cette catégorie" : ""}.</Alert>
      )}

      {data.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Expéditeur</TableCell>
                <TableCell>Aperçu</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((msg) => (
                <TableRow
                  key={msg.id}
                  hover
                  sx={{ cursor: "pointer", opacity: msg.treated ? 0.65 : 1 }}
                  onClick={() => setSelected(msg)}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(msg.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{msg.lastname} {msg.firstname}</Typography>
                    <Typography variant="caption" color="text.secondary">{msg.email}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" color="text.secondary">{truncate(msg.message, 80)}</Typography>
                  </TableCell>
                  <TableCell>
                    {msg.treated
                      ? <Chip label="Traité" color="success" size="small" />
                      : <Chip label="Non traité" color="warning" size="small" />}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {!msg.treated && (
                      <Tooltip title="Marquer traité">
                        <IconButton size="small" color="success" onClick={() => treatMut.mutate(msg.id)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm("Supprimer ce message ?")) deleteMut.mutate(msg.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <MessageDialog
        msg={selected}
        onClose={() => setSelected(null)}
        onTreat={(id) => treatMut.mutate(id)}
        treating={treatMut.isPending}
      />
    </Box>
  );
};

// ── CC config tab ─────────────────────────────────────────────────────────────

const CcTab = () => {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const { data: ccs = [], isLoading } = useQuery({
    queryKey: ["admin-contact-cc"],
    queryFn: adminApi.listContactCc,
  });

  const createMut = useMutation({
    mutationFn: adminApi.createContactCc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-cc"] });
      setEmail(""); setName("");
      toast.success("Destinataire ajouté");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.updateContactCc(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contact-cc"] }),
  });

  const deleteMut = useMutation({
    mutationFn: adminApi.deleteContactCc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-cc"] });
      toast.success("Destinataire supprimé");
    },
  });

  return (
    <Box maxWidth={600}>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Ces destinataires reçoivent une copie (CC) de chaque message envoyé via le formulaire de contact.
        Seuls les destinataires actifs sont inclus dans l'envoi.
      </Typography>

      {isLoading && <CircularProgress size={24} />}

      {ccs.map((cc: ContactCcConfig) => (
        <Paper key={cc.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
          <MailOutlineIcon color={cc.isActive ? "primary" : "disabled"} />
          <Box flex={1}>
            <Typography variant="body2" fontWeight={600}>{cc.name}</Typography>
            <Typography variant="caption" color="text.secondary">{cc.email}</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={cc.isActive}
                size="small"
                onChange={() => toggleMut.mutate({ id: cc.id, isActive: !cc.isActive })}
              />
            }
            label={cc.isActive ? "Actif" : "Inactif"}
            sx={{ mr: 0 }}
          />
          <Tooltip title="Supprimer">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (window.confirm(`Supprimer ${cc.email} des destinataires CC ?`)) deleteMut.mutate(cc.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      ))}

      {ccs.length === 0 && !isLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>Aucun destinataire CC configuré.</Alert>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" fontWeight={600} mb={2}>Ajouter un destinataire</Typography>
      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          label="Nom"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ flex: 1, minWidth: 150 }}
        />
        <TextField
          label="Email"
          size="small"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ flex: 2, minWidth: 200 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!email || !name || createMut.isPending}
          onClick={() => createMut.mutate({ email, name })}
        >
          Ajouter
        </Button>
      </Box>
    </Box>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const AdminContactPage = () => {
  const [tab, setTab] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ["admin-contact-stats"],
    queryFn: adminApi.getContactStats,
    refetchInterval: 60_000,
  });

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Messages contact
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Messages reçus via le formulaire de contact public.
          {stats && stats.untreated > 0 && (
            <Chip
              label={`${stats.untreated} non traité${stats.untreated > 1 ? "s" : ""}`}
              color="warning"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Messages" />
        <Tab label="Destinataires CC" />
      </Tabs>

      {tab === 0 && <MessagesTab />}
      {tab === 1 && <CcTab />}
    </Box>
  );
};

export default AdminContactPage;
