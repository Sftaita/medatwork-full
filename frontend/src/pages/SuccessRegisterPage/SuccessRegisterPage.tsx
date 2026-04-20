import { useState } from "react";
import { useLocation } from "react-router";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import Alert from "@mui/material/Alert";
import Container from "../../components/medium/Container";
import publicApi from "../../services/publicApi";

const SuccessRegisterPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { state } = useLocation();
  const email: string | undefined = state?.email;

  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleResend = async () => {
    if (!email) return;
    setResendStatus("loading");
    try {
      await publicApi.resendActivation(email);
      setResendStatus("done");
    } catch {
      setResendStatus("error");
    }
  };

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <Container paddingX={0} paddingY={0} maxWidth={{ sm: 1, md: 1236 }}>
        <Box display={"flex"} flexDirection={{ xs: "column", md: "row" }} position={"relative"}>
          <Box width={1} order={{ xs: 2, md: 1 }} display={"flex"} alignItems={"center"}>
            <Container>
              <Box>
                <Typography
                  variant="h1"
                  component={"h1"}
                  align={isMd ? "left" : "center"}
                  sx={{ fontWeight: 700 }}
                  color="primary"
                >
                  Bienvenue
                </Typography>

                <Typography
                  variant="h6"
                  component="p"
                  color="text.secondary"
                  align={isMd ? "left" : "center"}
                >
                  Enregistrement réussi. Vous allez recevoir un email de vérification dans les
                  prochaines minutes.
                  <br />
                  En cas de problème, contactez-nous à{" "}
                  <a
                    href="mailto:support@medatwork.be"
                    style={{ color: theme.palette.primary.main, textDecoration: "none" }}
                  >
                    support@medatwork.be
                  </a>
                  .
                </Typography>

                <Box
                  marginTop={4}
                  display="flex"
                  flexWrap="wrap"
                  gap={2}
                  justifyContent={{ xs: "center", md: "flex-start" }}
                  alignItems="center"
                >
                  <Button variant="contained" color="primary" size="large" href={"/"}>
                    Retour à l'accueil
                  </Button>

                  {email && resendStatus !== "done" && (
                    <Button
                      variant="text"
                      color="primary"
                      size="large"
                      onClick={handleResend}
                      disabled={resendStatus === "loading"}
                    >
                      {resendStatus === "loading" ? "Envoi en cours…" : "Renvoyer l'email"}
                    </Button>
                  )}
                </Box>

                {email && resendStatus === "done" && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Un nouvel email a été envoyé à {email}.
                  </Alert>
                )}
                {email && resendStatus === "error" && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Une erreur est survenue. Réessayez ou contactez le support.
                  </Alert>
                )}
              </Box>
            </Container>
          </Box>

          <Box
            sx={{
              flex: { xs: "0 0 100%", md: "0 0 50%" },
              position: "relative",
              maxWidth: { xs: "100%", md: "50%" },
              order: { xs: 1, md: 2 },
              minHeight: { xs: "auto", md: "calc(100vh - 58px)" },
            }}
          >
            <Box sx={{ width: { xs: 1, md: "50vw" }, height: "100%", position: "relative" }}>
              <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <Box
                  sx={{
                    overflow: "hidden",
                    left: "0%",
                    width: 1,
                    height: 1,
                    position: { xs: "relative", md: "absolute" },
                    clipPath: { xs: "none", md: "polygon(10% 0%, 100% 0, 100% 100%, 0% 100%)" },
                    shapeOutside: { xs: "none", md: "polygon(10% 0%, 100% 0, 100% 100%, 0% 100%)" },
                  }}
                >
                  <Box
                    sx={{
                      height: { xs: "auto", md: 1 },
                      "& img": { objectFit: "cover" },
                      "& .lazy-load-image-loaded": { height: 1, width: 1 },
                    }}
                  >
                    <Box
                      component={LazyLoadImage}
                      effect="blur"
                      src={"https://assets.maccarianagency.com/backgrounds/img23.jpg"}
                      height={{ xs: "auto", md: 1 }}
                      maxHeight={{ xs: 300, md: 1 }}
                      width={1}
                      maxWidth={1}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default SuccessRegisterPage;
