import React from "react";
import { useTheme } from "@mui/material/styles";
import { NavLink } from "react-router-dom";

// Material UI
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

// Images
import Encoder from "../../../images/Encoder";
import Stats from "../../../images/Stats";
import HumanResouce from "../../../images/HumanRessource";

const mock = [
  {
    title: "MACCS",
    description:
      "L'application s'intalle facilement sur smartphone et permet un encodage rapide des heures prestées, gardes effectuées et jours de congé disponibles. L'assistant Med@Work peut être activé afin de vous avertir en cas d'oubli d'encodage. Vous restez ainsi à jour.",
    illustration: <Encoder width={"100%"} height={"100%"} />,
    link: "/jobDetail/Residents",
  },
  {
    title: "Maître de stage et collaborateurs",
    description:
      "Permettre une gestion des horaires en temps réel afin de respecter le cadre légal. Assurer la rotation des MACCS afin de maintenir l'équilibre. Faire participer votre service des Ressources Humaines pour la validation à temps des horaires. Eviter ainsi la signature à l'aveugle de feuilles horaires illisibles.",
    illustration: <Stats width={"100%"} height={"100%"} />,
    link: "/jobDetail/Managers",
  },
  {
    title: "Ressources Humaines",
    description:
      "Recevez une notification de la validation mensuelle par les maîtres de stage. Le générateur de tableau horaire vous permettra d'encoder facilement et sans incohérence les horaires à facturer. Vous pourrez ensuite les stocker dans vos archives.",
    illustration: <HumanResouce width={"100%"} height={"100%"} />,
    link: "/jobDetail/HR",
  },
];

const Description = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Grid container spacing={4}>
      <Grid item>
        <Box marginBottom={4}>
          <Typography
            sx={{
              textTransform: "uppercase",
              fontWeight: "medium",
            }}
            gutterBottom
            color={"secondary"}
            align={"center"}
          >
            Notre philosophie
          </Typography>
          <Typography variant={"h4"} sx={{ fontWeight: 700 }} align={"center"}>
            Une coopération entre MACCS, maîtres de stage & RH
          </Typography>
          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            align={isMd ? "center" : "justify"}
          >
            Nous pensons qu'un outil de gestion horaire idéal permet une diminution de la charge
            mentale liée aux horaires. Il doit également permettre de réduire les ressources en
            temps et en coûts.
          </Typography>
          <Box marginTop={2} display={"flex"} justifyContent={"center"}>
            <NavLink to={"/contactUs"} style={{ textDecoration: "none" }}>
              <Button
                color={"primary"}
                variant={"contained"}
                size={"large"}
                startIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width={20}
                    height={20}
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                }
              >
                Contactez-nous
              </Button>
            </NavLink>
          </Box>
        </Box>
      </Grid>
      {mock.map((item, i) => (
        <Grid
          data-aos="fade-up"
          data-aos-delay={i * 100}
          data-aos-offset={100}
          data-aos-duration={600}
          key={i}
          item
          container
          xs={12}
          spacing={4}
          direction={i % 2 === 1 ? "row-reverse" : "row"}
        >
          <Grid item xs={12} md={6}>
            <Box data-aos={isMd ? "fade-right" : "fade-up"}>
              <Box marginBottom={2}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
              <Box marginBottom={3}>
                <Typography variant="h6" component="p" color="text.secondary" align="justify">
                  {item.description}
                </Typography>
              </Box>
              <NavLink to={item.link} style={{ textDecoration: "none" }}>
                <Button
                  size={"large"}
                  sx={{ marginTop: 2 }}
                  endIcon={
                    <Box
                      component={"svg"}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      width={24}
                      height={24}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </Box>
                  }
                >
                  En savoir plus
                </Button>
              </NavLink>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box height={1} width={1} display={"flex"} justifyContent={"center"}>
              <Box height={1} width={1} maxWidth={450}>
                {item.illustration}
              </Box>
            </Box>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
};

export default Description;
