import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import type { MaccsRow, MaccsStatus } from "../../services/hospitalAdminApi";

// ── Status helpers ────────────────────────────────────────────────────────────

type ChipColor = "success" | "warning" | "error" | "default";

const STATUS_LABEL: Record<MaccsStatus, string> = {
  active: "Actif",
  pending: "En attente",
  incomplete: "Incomplet",
  retired: "Retiré",
};

const STATUS_COLOR: Record<MaccsStatus, ChipColor> = {
  active: "success",
  pending: "warning",
  incomplete: "error",
  retired: "default",
};

// ── Page ──────────────────────────────────────────────────────────────────────

const HospitalAdminYearResidentsPage = () => {
  useAxiosPrivate();
  const { yearId } = useParams<{ yearId: string }>();
  const navigate = useNavigate();
  const id = Number(yearId);

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["hospital-admin-year-residents", id],
    queryFn: () => hospitalAdminApi.listYearResidents(id),
    enabled: !isNaN(id),
  });

  return (
    <Box p={4} maxWidth={1100} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate("/hospital-admin/dashboard")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Résidents de l'année
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Année #{id}
          </Typography>
        </Box>
      </Box>

      {isLoading && <CircularProgress size={24} />}

      {isError && (
        <Alert severity="error">Erreur lors du chargement des résidents.</Alert>
      )}

      {!isLoading && !isError && residents.length === 0 && (
        <Alert severity="info">Aucun résident inscrit pour cette année.</Alert>
      )}

      {!isLoading && residents.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Opting out</TableCell>
                <TableCell>Ajouté le</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {residents.map((r: MaccsRow) => (
                <TableRow key={r.yrId} hover>
                  <TableCell>
                    <Typography fontWeight={600} variant="body2">
                      {r.firstname} {r.lastname}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {r.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABEL[r.status]}
                      color={STATUS_COLOR[r.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={r.optingOut ? "Souhaite ne pas partager ses données" : "Partage autorisé"}>
                      <Chip
                        label={r.optingOut ? "Oui" : "Non"}
                        size="small"
                        variant="outlined"
                        color={r.optingOut ? "warning" : "default"}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString("fr-BE")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default HospitalAdminYearResidentsPage;
