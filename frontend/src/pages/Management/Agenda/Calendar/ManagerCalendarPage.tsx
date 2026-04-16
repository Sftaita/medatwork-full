import React from "react";
import CalendarView from "./Components/CalendarView";

// Material UI
import { Grid } from "@mui/material";

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// General components
import ActionView from "./Components/ActionView";

const ManagerCalendarPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  return (
    <Grid
      container
      padding={isMd ? 2 : 0}
      paddingTop={!isMd ? 2 : 0}
      margin={isMd ? 2 : 0}
      direction={isMd ? "row" : "column"}
      justifyContent="center"
      alignItems="flex-start"
      sx={{ boxShadow: 3 }}
    >
      {" "}
      <Grid item xs={12} md={3}>
        <ActionView isMd={isMd} />
      </Grid>{" "}
      <Grid item xs={12} md={9} paddingTop={isMd && 2}>
        <CalendarView isMd={isMd} />
      </Grid>
    </Grid>
  );
};

export default ManagerCalendarPage;
