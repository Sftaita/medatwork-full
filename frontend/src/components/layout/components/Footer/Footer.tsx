import React from "react";
import Logo from "../../../../images/logo.png";
import { NavLink } from "react-router-dom";

// Material UI
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

const Footer = () => {
  return (
    <Grid container spacing={0}>
      <Grid item xs={12}>
        <Box
          display={"flex"}
          justifyContent={"space-between"}
          alignItems={{ xs: "flex-start", sm: "center" }}
          flexDirection={{ xs: "column", sm: "row" }}
          gap={{ xs: 2, sm: 0 }}
          paddingY={{ xs: 2, sm: 3 }}
        >
          <Box display={"flex"} alignItems={"center"} color={"primary.dark"}>
            <Box
              component="img"
              sx={{ height: 30 }}
              alt="Your logo."
              src={Logo}
            />
            <Typography fontWeight={700} marginLeft={1}>
              MED@WORK
            </Typography>
          </Box>

          <Box display={"flex"} alignItems={"center"} gap={2}>
            <NavLink to={"/terms"} style={{ textDecoration: "none" }}>
              <Typography color="primary">
                Conditions générales
              </Typography>
            </NavLink>
            <NavLink to={"/contactUs"} style={{ textDecoration: "none" }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    viewBox="0 0 20 20"
                    fill="currentColor"
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

        <Divider />

        <Box paddingY={{ xs: 1.5, sm: 2 }}>
          <Typography align={"center"} variant={"subtitle2"} color="text.secondary" gutterBottom sx={{ wordBreak: "keep-all" }}>
            &copy; MED@WORK. 2021, Brussels. All rights reserved — version 3.1
          </Typography>
          <Typography align={"center"} variant={"caption"} color="text.secondary" component={"p"} sx={{ wordBreak: "break-word" }}>
            Lorsque vous visitez ou interagissez avec notre site, services ou outils, nous pouvons
            utiliser des cookies pour stocker des informations afin de vous offrir une meilleure
            expérience utilisateur, plus rapide et plus sûre.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Footer;
