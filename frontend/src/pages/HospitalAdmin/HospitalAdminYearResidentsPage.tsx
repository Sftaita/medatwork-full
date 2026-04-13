import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import adminApi from "../../services/adminApi";
import type { HospitalYearResident } from "../../types/entities";

const HospitalAdminYearResidentsPage = () => {
  useAxiosPrivate();
  const { yearId } = useParams<{ yearId: string }>();
  const navigate = useNavigate();
  const id = Number(yearId);

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["hospital-admin-year-residents", id],
    queryFn: () => adminApi.listYearResidents(id),
    enabled: !isNaN(id),
  });

  return (
    <Box p={4} maxWidth={1100} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate("/hospital-admin/dashboard")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          Résidents de l'année
        </Typography>
      </Box>

      {isLoading && <CircularProgress size={24} />}

      {!isLoading && residents.length === 0 && (
        <Alert severity="info">Aucun résident inscrit pour cette année.</Alert>
      )}

      <Grid container spacing={2}>
        {residents.map((r: HospitalYearResident) => (
          <Grid item xs={12} sm={6} md={4} key={r.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600}>
                  {r.firstname} {r.lastname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.email}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HospitalAdminYearResidentsPage;
