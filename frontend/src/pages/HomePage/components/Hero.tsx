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
    <Grid container spacing={0} height={isMd ? "70vh" : "84vh"} padding={theme.spacing(2)}>
      <Grid item container alignItems={"center"} xs={12} md={6}>
        <Box data-aos={isMd ? "fade-right" : "fade-up"}>
          <Box marginBottom={isMd ? 2 : 0} height={isMd ? theme.spacing(20) : theme.spacing(16)}>
            <Typography
              variant="h3"
              color="text.primary"
              sx={{
                fontWeight: 700,
              }}
            >
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
                  sequence={[
                    "maître de stage.",
                    1000,
                    "MACCS.",
                    1000,
                    "ressources humaines.",
                    1000,
                  ]}
                  repeat={Infinity}
                  color={"primary"}
                  deletionSpeed={99}
                />
              </Typography>
            </Typography>
          </Box>
          <Box marginBottom={3}>
            <Typography variant="h6" component="p" color="text.secondary">
              Enregistrement facile et rapide.
              <br />
              Economie de temps et de ressource.
            </Typography>
          </Box>
          <Box display="flex" marginTop={1}>
            <Box
              component={Avatar}
              bgcolor={"primary.main"}
              width={{ xs: 40, sm: 50 }}
              height={{ xs: 40, sm: 50 }}
            >
              <Box
                component={"img"}
                src={"https://assets.maccarianagency.com/svg/icons/app-store-icon.svg"}
                alt={"app store"}
                width={{ xs: 15, md: 20 }}
              />
            </Box>
            <Box
              component={Avatar}
              bgcolor={"primary.main"}
              marginLeft={1}
              width={{ xs: 40, sm: 50 }}
              height={{ xs: 40, sm: 50 }}
            >
              <Box
                component={"img"}
                src={"https://assets.maccarianagency.com/svg/icons/play-store-icon.svg"}
                alt={"play store"}
                sx={{ filter: "brightness(0) invert(1)" }}
                width={{ xs: 15, md: 20 }}
              />
            </Box>
          </Box>
        </Box>
      </Grid>

      <Grid
        item
        xs={12}
        md={6}
        sx={{
          marginTop: isMd ? "20vh" : "10vh",
          display: "flex",
          justifyContent: isMd ? "right" : "center",
        }}
      >
        <Box>
          <Box
            component="img"
            position={"relative"}
            zIndex={2}
            maxWidth={1}
            height={isMd ? "auto" : "30vh"}
            sx={{ verticalAlign: "middle" }}
            alt="The house from the offer."
            src={logoLg}
          ></Box>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Hero;
