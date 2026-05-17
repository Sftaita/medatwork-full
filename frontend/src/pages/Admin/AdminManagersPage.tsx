import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useTopbarSearch } from "../../hooks/useTopbarSearch";
import { T, C, statusBadgeSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import adminApi from "../../services/adminApi";
import type { AdminManager } from "../../types/entities";

// ── Status helpers ─────────────────────────────────────────────────────────────

const chipLabel = (m: AdminManager): string =>
  m.validatedAt === null ? "Non activé" : (
    m.status === "active" ? "Actif" :
    m.status === "inactive" ? "Inactif" : m.status
  );

const badgeVariant = (m: AdminManager): "active" | "pending" | "error" | "default" =>
  m.validatedAt === null ? "error" :
  m.status === "active"  ? "active" :
  m.status === "inactive" ? "default" : "pending";

// ── KPI card ──────────────────────────────────────────────────────────────────

const KpiCard = ({
  label, value, meta, accent,
}: { label: string; value: number | string; meta?: string; accent?: boolean }) => (
  <Box sx={{
    bgcolor: C.surface,
    border: `1px solid ${accent ? C.brand600 + "40" : C.line}`,
    borderRadius: "10px",
    p: "16px 18px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.15s, box-shadow 0.15s",
    "&:hover": { borderColor: C.line2, boxShadow: C.shadowSm },
  }}>
    <Typography sx={{ fontSize: 12, color: C.ink3, fontWeight: 500, mb: "10px" }}>
      {label}
    </Typography>
    <Typography sx={{
      fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em",
      color: accent ? C.brand600 : C.ink, lineHeight: 1,
    }}>
      {value}
    </Typography>
    <Box sx={{ mt: "auto", pt: "8px", minHeight: "20px" }}>
      {meta && (
        <Typography sx={{ fontSize: 12, color: C.ink3 }}>
          {meta}
        </Typography>
      )}
    </Box>
  </Box>
);

// ── Filter chip ───────────────────────────────────────────────────────────────

const FilterChip = ({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      height: 32, px: "12px", borderRadius: "999px",
      border: `1px solid ${active ? C.brand700 : C.line2}`,
      bgcolor: active ? C.brand600 : C.surface,
      color: active ? "#fff" : C.ink2,
      fontSize: 12, fontWeight: 500, cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: "6px",
      fontFamily: "inherit",
      transition: "all 0.15s",
      "&:hover": { bgcolor: active ? C.brand700 : C.surface2, color: active ? "#fff" : C.ink },
    }}
  >
    {label}
    <Box component="span" sx={{
      fontSize: 11,
      bgcolor: active ? "rgba(255,255,255,0.22)" : C.surface2,
      color: active ? "#fff" : C.ink3,
      px: "6px", borderRadius: "4px", lineHeight: "18px",
      fontVariantNumeric: "tabular-nums",
    }}>
      {count}
    </Box>
  </Box>
);

// ── Actions menu ──────────────────────────────────────────────────────────────

interface ManagerActionsMenuProps {
  manager: AdminManager;
  onToggle: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onResendActivation: () => void;
  isPending: boolean;
}

const ManagerActionsMenu = ({
  manager, onToggle, onResetPassword, onDelete, onActivate, onResendActivation, isPending,
}: ManagerActionsMenuProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
        disabled={isPending}
        sx={{ color: C.ink3, "&:hover": { bgcolor: C.surface2 } }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 210, borderRadius: "10px", boxShadow: C.shadow, border: `1px solid ${C.line}` } }}
      >
        {manager.validatedAt === null && (
          <MenuItem onClick={() => { setAnchor(null); onActivate(); }} sx={{ fontSize: 13, color: "success.main", fontWeight: 600 }}>
            Activer manuellement
          </MenuItem>
        )}
        {manager.validatedAt === null && (
          <MenuItem onClick={() => { setAnchor(null); onResendActivation(); }} sx={{ fontSize: 13 }}>
            Renvoyer l'email d'activation
          </MenuItem>
        )}
        <MenuItem
          onClick={() => { setAnchor(null); onToggle(); }}
          disabled={manager.status === "pending_hospital" || manager.validatedAt === null}
          sx={{ fontSize: 13 }}
        >
          Activer / Désactiver
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onResetPassword(); }} sx={{ fontSize: 13 }}>
          Réinitialiser le mot de passe
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchor(null); onDelete(); }} sx={{ fontSize: 13, color: "error.main" }}>
          Supprimer le compte
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

type SortCol = "nom" | "email" | "statut" | "hopitaux";
type StatusFilter = "all" | "active" | "inactive" | "not_activated";

const AdminManagersPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const search = useTopbarSearch("Nom, email, hôpital…");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortCol, setSortCol] = useState<SortCol | null>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteTarget, setDeleteTarget] = useState<AdminManager | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-manager-stats"],
    queryFn: adminApi.getManagerStats,
  });

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["admin-managers"],
    queryFn: adminApi.listManagers,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-managers"] });
    qc.invalidateQueries({ queryKey: ["admin-manager-stats"] });
  };

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleManagerStatus(id),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de la mise à jour du statut"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (m: AdminManager) => adminApi.resetManagerPassword(m.id),
    onSuccess: (_data, m) => toast.success(`Email de réinitialisation envoyé à ${m.email}`),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteManager(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de la suppression"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminApi.activateManager(id),
    onSuccess: () => { invalidate(); toast.success("Compte activé manuellement"); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'activation"),
  });

  const resendActivationMutation = useMutation({
    mutationFn: (m: AdminManager) => adminApi.resendManagerActivation(m.id),
    onSuccess: (_data, m) => toast.success(`Email d'activation renvoyé à ${m.email}`),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi"),
  });

  const isPending =
    toggleMutation.isPending || resetPasswordMutation.isPending ||
    deleteMutation.isPending || activateMutation.isPending || resendActivationMutation.isPending;

  // ── Filter counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:           (managers as AdminManager[]).length,
    active:        (managers as AdminManager[]).filter((m) => m.validatedAt !== null && m.status === "active").length,
    inactive:      (managers as AdminManager[]).filter((m) => m.validatedAt !== null && m.status === "inactive").length,
    not_activated: (managers as AdminManager[]).filter((m) => m.validatedAt === null).length,
  }), [managers]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = (managers as AdminManager[]).filter((m) => {
      if (statusFilter === "active"        && !(m.validatedAt !== null && m.status === "active"))   return false;
      if (statusFilter === "inactive"      && !(m.validatedAt !== null && m.status === "inactive")) return false;
      if (statusFilter === "not_activated" && m.validatedAt !== null) return false;
      return (
        m.firstname.toLowerCase().includes(q) ||
        m.lastname.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.hospitals.some((h) => h.name.toLowerCase().includes(q))
      );
    });

    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "nom":
          cmp = a.lastname.localeCompare(b.lastname, "fr", { sensitivity: "base" });
          if (cmp === 0) cmp = a.firstname.localeCompare(b.firstname, "fr");
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "statut":
          cmp = chipLabel(a).localeCompare(chipLabel(b), "fr");
          break;
        case "hopitaux":
          cmp = a.hospitals.length - b.hospitals.length;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [managers, q, statusFilter, sortCol, sortDir]);

  // ── Sort header helper ─────────────────────────────────────────────────────
  const SortHead = ({ col, label, width, align }: { col: SortCol; label: string; width?: number; align?: "center" | "right" }) => (
    <TableCell
      align={align}
      onClick={() => handleSort(col)}
      sx={{ width, cursor: "pointer", "&:hover": { color: C.ink } }}
    >
      <Box display="inline-flex" alignItems="center" gap="4px">
        {label}
        {sortCol === col
          ? sortDir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 11 }} /> : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
          : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
        }
      </Box>
    </TableCell>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>Gestion des managers</Typography>
          <Typography sx={T.pageSub}>Comptes managers enregistrés sur la plateforme</Typography>
        </Box>
      </Box>

      {/* KPI cards */}
      {loadingStats ? (
        <CircularProgress size={22} sx={{ color: C.brand600, mb: "32px" }} />
      ) : stats && (
        <Box mb="32px">
          <Grid container spacing={1.5} alignItems="stretch">
            {([
              { label: "Total managers",  value: stats.total,        meta: undefined,       accent: false },
              { label: "Actifs",          value: stats.active,       meta: `${Math.round((stats.active / (stats.total || 1)) * 100)} % du total`, accent: true },
              { label: "Inactifs",        value: stats.inactive,     meta: undefined,       accent: false },
              { label: "Non activés",     value: stats.notActivated, meta: "Invitation en attente", accent: false },
            ] as const).map(({ label, value, meta, accent }) => (
              <Grid item xs={6} sm={3} key={label}>
                <KpiCard label={label} value={value} meta={meta} accent={accent} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Toolbar — chips + densité */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "14px", flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <FilterChip label="Tous"        count={counts.all}           active={statusFilter === "all"}           onClick={() => setStatusFilter("all")} />
          <FilterChip label="Actifs"      count={counts.active}        active={statusFilter === "active"}        onClick={() => setStatusFilter("active")} />
          <FilterChip label="Inactifs"    count={counts.inactive}      active={statusFilter === "inactive"}      onClick={() => setStatusFilter("inactive")} />
          <FilterChip label="Non activés" count={counts.not_activated} active={statusFilter === "not_activated"} onClick={() => setStatusFilter("not_activated")} />
        </Box>

        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: C.ink3 }}>
            {filtered.length} manager{filtered.length !== 1 ? "s" : ""}
          </Typography>
          <DensityToggleButton density={density} onCycle={cycleDensity} />
        </Box>
      </Box>

      {/* Table */}
      {loadingManagers ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress sx={{ color: C.brand600 }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {managers.length === 0 ? "Aucun manager enregistré." : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <SortHead col="nom"      label="Nom" />
                  <SortHead col="email"    label="Email" />
                  <SortHead col="statut"   label="Statut"   width={130} />
                  <SortHead col="hopitaux" label="Hôpitaux" width={200} />
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((m: AdminManager) => {
                  const initials = (m.firstname[0] + m.lastname[0]).toUpperCase();
                  return (
                    <TableRow key={m.id} sx={bodyRowSx(density)}>

                      {/* Nom */}
                      <TableCell>
                        <Box sx={T.person}>
                          <Avatar
                            src={m.avatarUrl ?? undefined}
                            alt={`${m.firstname} ${m.lastname}`}
                            sx={T.avatar}
                          >
                            {!m.avatarUrl && initials}
                          </Avatar>
                          <Box>
                            <Box sx={T.name}>{m.lastname} {m.firstname}</Box>
                            <Box sx={T.sub}>@{m.email.split("@")[0]}</Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TableCell sx={{ color: C.ink2 }}>{m.email}</TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Box component="span" sx={statusBadgeSx(badgeVariant(m))}>
                          {chipLabel(m)}
                        </Box>
                      </TableCell>

                      {/* Hôpitaux */}
                      <TableCell>
                        {m.hospitals.length === 0 ? (
                          <Typography sx={{ fontSize: 13, color: C.ink4 }}>—</Typography>
                        ) : (
                          <Tooltip title={m.hospitals.map((h) => h.name).join(", ")} arrow disableHoverListener={m.hospitals.length <= 1}>
                            <Typography sx={{ fontSize: 13, color: C.ink2 }} noWrap>
                              {m.hospitals.length === 1
                                ? m.hospitals[0].name
                                : `${m.hospitals[0].name} +${m.hospitals.length - 1}`}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <ManagerActionsMenu
                          manager={m}
                          onToggle={() => toggleMutation.mutate(m.id)}
                          onResetPassword={() => resetPasswordMutation.mutate(m)}
                          onDelete={() => setDeleteTarget(m)}
                          onActivate={() => activateMutation.mutate(m.id)}
                          onResendActivation={() => resendActivationMutation.mutate(m)}
                          isPending={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Footer */}
          <Box sx={T.footer}>
            <Typography variant="caption">
              {filtered.length} sur {managers.length} manager{managers.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Supprimer le compte</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le compte de{" "}
            <strong>{deleteTarget?.lastname} {deleteTarget?.firstname}</strong> ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button
            variant="contained" color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagersPage;
