import React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";

import Container from "../../components/medium/Container";
import Hero from "./components/Hero";

const HomePage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box
      position={"relative"}
      minHeight={"calc(100vh - 247px)"}
      display={"flex"}
      alignItems={"center"}
      justifyContent={"center"}
    >
      <Box
        position={"relative"}
        sx={{
          marginTop: -13,
          paddingTop: isMd ? 8 : 13,
        }}
      >
        <Container>
          <Hero />
        </Container>
        <Box
          component={"svg"}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          viewBox="0 0 1920 100.1"
          sx={{
            width: "100%",
            marginBottom: theme.spacing(-1),
          }}
        >
          <path
            fill={theme.palette.background.default}
            d="M0,0c0,0,934.4,93.4,1920,0v100.1H0L0,0z"
          ></path>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
