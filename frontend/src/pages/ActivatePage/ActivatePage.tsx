import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import publicApi from "../../services/publicApi";

type ActivateStatus = "loading" | "success" | "expired" | "error";

const ActivatePage = () => {
  const { type, token } = useParams<{ type: string; token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ActivateStatus>("loading");

  useEffect(() => {
    if (!token || (type !== "manager" && type !== "resident")) {
      setStatus("error");
      return;
    }

    publicApi
      .activateAccount(type, token)
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        const code = err?.response?.status;
        if (code === 410) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      });
  }, [type, token, navigate]);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="calc(100vh - 247px)"
      px={2}
    >
      <Box maxWidth={480} textAlign="center">
        {status === "loading" && (
          <>
            <CircularProgress sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.secondary">
              Activation en cours…
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              Votre compte est activé ! Redirection vers la page de connexion…
            </Alert>
            <Button variant="contained" component={Link} to="/login">
              Se connecter maintenant
            </Button>
          </>
        )}

        {status === "expired" && (
          <>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Ce lien a expiré (valable 48 heures). Demandez un nouveau lien ci-dessous.
            </Alert>
            <Button variant="contained" component={Link} to="/token-expired">
              Recevoir un nouveau lien
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <Alert severity="error" sx={{ mb: 3 }}>
              Ce lien est invalide ou a déjà été utilisé. Si votre compte est déjà actif,
              connectez-vous directement.
            </Alert>
            <Box display="flex" gap={2} justifyContent="center">
              <Button variant="contained" component={Link} to="/login">
                Se connecter
              </Button>
              <Button variant="outlined" component={Link} to="/token-expired">
                Nouveau lien d'activation
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ActivatePage;
