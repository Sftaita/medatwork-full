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
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import adminApi from "../../services/adminApi";
import type { AdminResident } from "../../types/entities";

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusLabel  = (r: AdminResident) => r.validatedAt !== null ? "Actif" : "Non activé";
const statusVariant = (r: AdminResident): "active" | "error" =>
  r.validatedAt !== null ? "active" : "error";

// ── Actions menu ──────────────────────────────────────────────────────────────

const ResidentActionsMenu = ({
  resident, onActivate, onResetPassword, isPending,
}: {
  resident: AdminResident;
  onActivate: () => void;
  onResetPassword: () => void;
  isPending: boolean;
}) => {
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
        {resident.validatedAt === null && (
          <MenuItem
            onClick={() => { setAnchor(null); onActivate(); }}
            sx={{ fontSize: 13, color: "success.main", fontWeight: 600 }}
          >
            Activer manuellement
          </MenuItem>
        )}
        <MenuItem
          onClick={() => { setAnchor(null); onResetPassword(); }}
          sx={{ fontSize: 13 }}
        >
          Réinitialiser le mot de passe
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

type SortCol = "nom" | "email" | "statut";

const AdminResidentsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();
  const { density, cycleDensity } = useTableDensity();

  const search = useTopbarSearch("Nom, email…");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "not_activated">("all");
  const [sortCol, setSortCol]     = useState<SortCol | null>("nom");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc");

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["admin-residents"],
    queryFn: adminApi.listResidents,
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminApi.activateResident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-residents"] });
      toast.success("Compte activé manuellement");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'activation"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (r: AdminResident) => adminApi.resetResidentPassword(r.id),
    onSuccess: (_data, r) =>
      toast.success(`Email de réinitialisation envoyé à ${r.email}`),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'envoi"),
  });

  const isPending = activateMutation.isPending || resetPasswordMutation.isPending;

  // ── Counts pour les chips ──────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:           (residents as AdminResident[]).length,
    active:        (residents as AdminResident[]).filter((r) => r.validatedAt !== null).length,
    not_activated: (residents as AdminResident[]).filter((r) => r.validatedAt === null).length,
  }), [residents]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = (residents as AdminResident[]).filter((r) => {
      if (statusFilter === "active"        && r.validatedAt === null)  return false;
      if (statusFilter === "not_activated" && r.validatedAt !== null)  return false;
      return (
        r.firstname.toLowerCase().includes(q) ||
        r.lastname.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
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
          cmp = statusLabel(a).localeCompare(statusLabel(b), "fr");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [residents, q, statusFilter, sortCol, sortDir]);

  // ── Sort header helper ─────────────────────────────────────────────────────
  const SortHead = ({ col, label, width }: { col: SortCol; label: string; width?: number }) => (
    <TableCell
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

  // ── Filter chip ────────────────────────────────────────────────────────────
  const Chip = ({ label, count, active, onClick }: {
    label: string; count: number; active: boolean; onClick: () => void;
  }) => (
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p={3} maxWidth={1200} mx="auto">

      {/* Header */}
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>MACCS</Typography>
          <Typography sx={T.pageSub}>Médecins en formation clinique et scientifique</Typography>
        </Box>
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "10px", flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Chip label="Tous"         count={counts.all}           active={statusFilter === "all"}           onClick={() => setStatusFilter("all")} />
          <Chip label="Actifs"       count={counts.active}        active={statusFilter === "active"}        onClick={() => setStatusFilter("active")} />
          <Chip label="Non activés"  count={counts.not_activated} active={statusFilter === "not_activated"} onClick={() => setStatusFilter("not_activated")} />
        </Box>

        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: C.ink3 }}>
            {filtered.length} résident{filtered.length !== 1 ? "s" : ""}
          </Typography>
          <DensityToggleButton density={density} onCycle={cycleDensity} />
        </Box>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress sx={{ color: C.brand600 }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          {residents.length === 0 ? "Aucun résident enregistré." : "Aucun résultat pour cette recherche."}
        </Alert>
      ) : (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <SortHead col="nom"    label="Nom" />
                  <SortHead col="email"  label="Email" />
                  <SortHead col="statut" label="Statut" width={130} />
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r: AdminResident) => {
                  const initials = (r.firstname[0] + r.lastname[0]).toUpperCase();
                  return (
                    <TableRow key={r.id} sx={bodyRowSx(density)}>

                      {/* Nom */}
                      <TableCell>
                        <Box sx={T.person}>
                          <Avatar src={r.avatarUrl ?? undefined} sx={T.avatar}>{!r.avatarUrl && initials}</Avatar>
                          <Box>
                            <Box sx={T.name}>{r.lastname} {r.firstname}</Box>
                            <Box sx={T.sub}>@{r.email.split("@")[0]}</Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TableCell sx={{ color: C.ink2 }}>{r.email}</TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Box component="span" sx={statusBadgeSx(statusVariant(r))}>
                          {statusLabel(r)}
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <ResidentActionsMenu
                          resident={r}
                          onActivate={() => activateMutation.mutate(r.id)}
                          onResetPassword={() => resetPasswordMutation.mutate(r)}
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
              {filtered.length} sur {residents.length} résident{residents.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminResidentsPage;
