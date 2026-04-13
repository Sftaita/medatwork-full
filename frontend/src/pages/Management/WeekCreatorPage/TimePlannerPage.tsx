import React from "react";
import useWeekShedulerContext from "../../../hooks/useWeekShedulerContext";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";

import Typography from "@mui/material/Typography";

// General components

// Loacal components
import WeekDispatcher from "./components/WeekDispatcher/WeekDispatcher";

const TimePlannerPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  useWeekShedulerContext();

  return (
    <Box>
      <Box paddingY={5} marginTop={-3}>
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
            Horaire prévisionnel
          </Typography>
        </Box>
      </Box>
      <Box
        paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingTop={"0 !important"}
        marginTop={-8}
      >
        <WeekDispatcher />
      </Box>
    </Box>
  );
};

export default TimePlannerPage;
