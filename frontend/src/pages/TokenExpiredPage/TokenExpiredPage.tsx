import { useState } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import publicApi from "../../services/publicApi";

const TokenExpiredPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleResend = async () => {
    if (!email) return;
    setStatus("loading");
    try {
      await publicApi.resendActivation(email);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Box
      position="relative"
      minHeight="calc(100vh - 247px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      paddingTop={12}
    >
      <Box maxWidth={480} px={2} py={2} textAlign={isMd ? "left" : "center"}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }} gutterBottom>
          Lien expiré
        </Typography>

        <Typography variant="h6" component="p" color="text.secondary" gutterBottom>
          Votre lien d'activation a expiré (valable 48 heures).
          <br />
          Entrez votre email pour recevoir un nouveau lien.
        </Typography>

        {status === "done" ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Si cette adresse correspond à un compte non activé, un nouveau lien vous a été envoyé.
          </Alert>
        ) : (
          <Box mt={3} display="flex" flexDirection="column" gap={2}>
            {status === "error" && (
              <Alert severity="error">Une erreur est survenue. Réessayez plus tard.</Alert>
            )}
            <TextField
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleResend}
              disabled={status === "loading" || !email}
            >
              {status === "loading" ? "Envoi en cours…" : "Recevoir un nouveau lien"}
            </Button>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Besoin d'aide ?{" "}
          <a
            href="mailto:support@medatwork.be"
            style={{ color: theme.palette.primary.main, textDecoration: "none" }}
          >
            support@medatwork.be
          </a>
        </Typography>

        <Box mt={4} display="flex" gap={2} justifyContent={{ xs: "center", md: "flex-start" }}>
          <Button variant="outlined" color="primary" onClick={() => navigate("/")}>
            Accueil
          </Button>
          <Button variant="text" color="primary" onClick={() => navigate("/login")}>
            Se connecter
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TokenExpiredPage;
