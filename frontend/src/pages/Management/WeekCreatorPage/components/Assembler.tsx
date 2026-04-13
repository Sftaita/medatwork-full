import React from "react";
import useWeekShedulerContext from "../../../../hooks/useWeekShedulerContext";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";

// Loacal components
import WeekCreator from "../components/WeekCreator/WeekCreator";
import WeekDispatcher from "../components/WeekDispatcher/WeekDispatcher";

const Assembler = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { mode } = useWeekShedulerContext();

  return (
    <Box
      paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
      paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
      paddingTop={"0 !important"}
      marginTop={-8}
    >
      {mode === "weekDispatcher" && <WeekDispatcher />}
      {mode === "weekCreator" && <WeekCreator />}
    </Box>
  );
};

export default Assembler;
