import React from "react";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local import
import Container from "../../../../components/medium/Container";

import StatisticCard from "./StatisticCard";

const TimeCard = ({ item }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box marginBottom={isMd && 6}>
      <Container>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} sm={12}>
            <StatisticCard item={item} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TimeCard;
