import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { T, C, statusBadgeSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { MaccsRow, MaccsStatus } from "../../services/hospitalAdminApi";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<MaccsStatus, string> = {
  active: "Actif",
  pending: "En attente",
  not_registered: "Sans compte",
  retired: "Retiré",
};

// ── Page ──────────────────────────────────────────────────────────────────────

const HospitalAdminYearResidentsPage = () => {
  useAxiosPrivate();
  const { yearId } = useParams<{ yearId: string }>();
  const navigate = useNavigate();
  const id = Number(yearId);
  const { density, cycleDensity } = useTableDensity();

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["hospital-admin-year-residents", id],
    queryFn: () => hospitalAdminApi.listYearResidents(id),
    enabled: !isNaN(id),
  });

  return (
    <Box p={3} maxWidth={1100} mx="auto">
      {/* Header */}
      <Box sx={{ ...T.pageHead, alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate("/hospital-admin/dashboard")} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography sx={T.pageTitle}>Résidents de l'année #{id}</Typography>
            <Typography sx={T.pageSub}>MACCS inscrits pour cette année académique</Typography>
          </Box>
        </Box>
        <DensityToggleButton density={density} onCycle={cycleDensity} />
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress sx={{ color: C.brand600 }} /></Box>}

      {isError && (
        <Alert severity="error" sx={{ borderRadius: "10px" }}>Erreur lors du chargement des résidents.</Alert>
      )}

      {!isLoading && !isError && residents.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>Aucun résident inscrit pour cette année.</Alert>
      )}

      {!isLoading && residents.length > 0 && (
        <Box sx={T.card}>
          <Box sx={T.wrap}>
            <Table sx={T.table}>
              <TableHead>
                <TableRow sx={T.headRow}>
                  <TableCell>Nom</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell sx={{ width: 120 }}>Statut</TableCell>
                  <TableCell sx={{ width: 100 }}>Opting-out</TableCell>
                  <TableCell sx={{ width: 120 }}>Ajouté le</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {residents.map((r: MaccsRow) => {
                  const initials = ((r.firstname?.[0] ?? "") + (r.lastname?.[0] ?? "")).toUpperCase() || "?";
                  const badgeVariant =
                    r.status === "active"  ? "active"  :
                    r.status === "pending" ? "pending" : "default";
                  return (
                    <TableRow key={r.yrId} sx={bodyRowSx(density)}>
                      <TableCell>
                        <Box sx={T.person}>
                          <Avatar src={r.avatarUrl ?? undefined} sx={T.avatar}>
                            {!r.avatarUrl && initials}
                          </Avatar>
                          <Box>
                            <Box sx={T.name}>{r.firstname} {r.lastname}</Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: C.ink2 }}>{r.email ?? "—"}</TableCell>
                      <TableCell>
                        <Box component="span" sx={statusBadgeSx(badgeVariant)}>
                          {STATUS_LABEL[r.status]}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={r.optingOut ? "Souhaite ne pas partager ses données" : "Partage autorisé"}>
                          <Box component="span" sx={r.optingOut ? {
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            px: "10px", py: "3px", borderRadius: "999px", fontSize: 11, fontWeight: 600,
                            bgcolor: "#fdf3d8", color: C.warn,
                          } : { fontSize: 13, color: C.ink4 }}>
                            {r.optingOut ? "Oui" : "—"}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: C.ink3 }}>
                        {new Date(r.createdAt).toLocaleDateString("fr-BE")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <Box sx={T.footer}>
            <Typography variant="caption">{residents.length} résident{residents.length !== 1 ? "s" : ""}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default HospitalAdminYearResidentsPage;
