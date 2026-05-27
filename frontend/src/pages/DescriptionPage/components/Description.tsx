import React from "react";
import { useTranslation } from "react-i18next";
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

const ITEM_LINKS = ["/jobDetail/Residents", "/jobDetail/Managers", "/jobDetail/HR"];
const ILLUSTRATIONS = [
  <Encoder width={"100%"} height={"100%"} />,
  <Stats width={"100%"} height={"100%"} />,
  <HumanResouce width={"100%"} height={"100%"} />,
];

const Description = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const mock = [
    { title: t("desc.description.item0Title"), description: t("desc.description.item0Desc"), illustration: ILLUSTRATIONS[0], link: ITEM_LINKS[0] },
    { title: t("desc.description.item1Title"), description: t("desc.description.item1Desc"), illustration: ILLUSTRATIONS[1], link: ITEM_LINKS[1] },
    { title: t("desc.description.item2Title"), description: t("desc.description.item2Desc"), illustration: ILLUSTRATIONS[2], link: ITEM_LINKS[2] },
  ];

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
            {t("desc.description.tag")}
          </Typography>
          <Typography variant={"h4"} sx={{ fontWeight: 700 }} align={"center"}>
            {t("desc.description.title")}
          </Typography>
          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            align={isMd ? "center" : "justify"}
          >
            {t("desc.description.subtitle")}
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
                {t("desc.description.contactUs")}
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
                  {t("desc.description.learnMore")}
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
