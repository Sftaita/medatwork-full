import React from "react";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

// General components

// Loacal components
import WeekCreator from "./components/WeekCreator";

const WeekCreatorPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Grid container direction="column" justifyContent="center" alignItems="center">
      <Grid item md={12}>
        <Box paddingTop={5} marginTop={-3}>
          <Box
            paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
            paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
            marginTop={0}
          >
            <Typography
              variant="h4"
              align={"center"}
              gutterBottom
              sx={{
                fontWeight: 700,
              }}
            >
              Postes de travail
            </Typography>
          </Box>
        </Box>
      </Grid>
      <Grid item md={12}>
        <Box
          paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
          paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
          paddingTop={"0 !important"}
          marginTop={2}
        >
          <WeekCreator />
        </Box>
      </Grid>
    </Grid>
  );
};

export default WeekCreatorPage;
