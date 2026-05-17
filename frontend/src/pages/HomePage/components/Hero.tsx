import React from "react";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import logoLg from "../../../images/logoLg.png";
import { TypeAnimation } from "react-type-animation";

const Hero = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gridTemplateRows: "1fr",
        height: { xs: "84vh", md: "70vh" },
        padding: 2,
        alignItems: "center",
      }}
    >
      {/* Colonne gauche — contenu texte */}
      <Box
        data-aos={isMd ? "fade-right" : "fade-up"}
        sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        {/* Hauteur fixe + overflow hidden : le TypeAnimation ne déborde jamais */}
        <Box
          sx={{
            height: { xs: theme.spacing(16), md: theme.spacing(20) },
            overflow: "hidden",
            mb: isMd ? 2 : 0,
          }}
        >
          <Typography variant="h3" color="text.primary" sx={{ fontWeight: 700 }}>
            Gestionnaire de temps de travail pour{" "}
            <Typography
              color={"primary"}
              component={"span"}
              variant={"inherit"}
              sx={{
                background: `linear-gradient(180deg, transparent 82%, ${alpha(
                  theme.palette.secondary.main,
                  0.3
                )} 0%)`,
              }}
            >
              <TypeAnimation
                sequence={["maître de stage.", 1000, "MACCS.", 1000, "ressources humaines.", 1000]}
                repeat={Infinity}
                deletionSpeed={99}
              />
            </Typography>
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" component="p" color="text.secondary">
            Enregistrement facile et rapide.
            <br />
            Economie de temps et de ressource.
          </Typography>
        </Box>

        <Box display="flex" mt={1}>
          <Box component={Avatar} bgcolor={"primary.main"} width={{ xs: 40, sm: 50 }} height={{ xs: 40, sm: 50 }}>
            <Box component={"img"} src={"https://assets.maccarianagency.com/svg/icons/app-store-icon.svg"} alt={"app store"} width={{ xs: 15, md: 20 }} />
          </Box>
          <Box component={Avatar} bgcolor={"primary.main"} ml={1} width={{ xs: 40, sm: 50 }} height={{ xs: 40, sm: 50 }}>
            <Box component={"img"} src={"https://assets.maccarianagency.com/svg/icons/play-store-icon.svg"} alt={"play store"} sx={{ filter: "brightness(0) invert(1)" }} width={{ xs: 15, md: 20 }} />
          </Box>
        </Box>
      </Box>

      {/* Colonne droite — logo : isolée du contenu gauche par CSS Grid */}
      <Box
        display="flex"
        justifyContent={{ xs: "center", md: "flex-end" }}
        alignItems="center"
      >
        <Box
          component="img"
          src={logoLg}
          alt="Logo Medatwork"
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "30vh", md: "50vh" },
            objectFit: "contain",
          }}
        />
      </Box>
    </Box>
  );
};

export default Hero;
