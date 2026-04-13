import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

const AdminLogsPage = () => {
  return (
    <Box p={4} maxWidth={1200} mx="auto">
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Logs système
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Historique des actions et événements système
        </Typography>
      </Box>

      <Alert severity="info">
        Les logs système seront disponibles dans une prochaine version.
      </Alert>
    </Box>
  );
};

export default AdminLogsPage;
