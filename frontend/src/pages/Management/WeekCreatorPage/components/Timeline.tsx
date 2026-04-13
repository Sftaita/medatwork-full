import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Stack from "@mui/material/Stack";
import TimeCard from "./TimeCard";
import Calandar from "../../../../images/Calandar";
import Box from "@mui/material/Box";

import useWeekShedulerContext from "../../../../hooks/useWeekShedulerContext";

const Timeline = () => {
  const theme = useTheme();
  const { currentWeek, selectedWeekDay, setSelectedWeekDay } = useWeekShedulerContext();

  const isXs = useMediaQuery(theme.breakpoints.down("xs"), {
    defaultMatches: true,
  });

  const isSm = useMediaQuery(theme.breakpoints.down("md"), {
    defaultMatches: true,
  });
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const isLg = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: true,
  });

  const isXl = useMediaQuery(theme.breakpoints.up("xl"), {
    defaultMatches: true,
  });

  const days = [
    { short: "lu", full: "Lundi" },
    { short: "ma", full: "Mardi" },
    { short: "me", full: "Mercredi" },
    { short: "je", full: "Jeudi" },
    { short: "ve", full: "Vendredi" },
    { short: "sa", full: "Samedi" },
    { short: "di", full: "Dimanche" },
  ];

  const getToggleButtonSize = () => {
    if (isXl) {
      return "medium";
    } else if (isLg) {
      return "small";
    } else if (isMd) {
      return "small";
    } else if (isSm) {
      return "small";
    }
  };

  const handleChange = (event, newAlignment) => {
    if (newAlignment !== null && newAlignment > 0) {
      setSelectedWeekDay(newAlignment);
    }
  };

  const tasksForSelectedDay = currentWeek
    .filter((task) => task.dayOfWeek === selectedWeekDay)
    .sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      } else {
        return 0;
      }
    });

  return (
    <Grid container direction="column" padding={2} spacing={2}>
      <Grid item md={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography>Calendrier hebdomadaire</Typography>

          <Typography>
            {selectedWeekDay !== null &&
              selectedWeekDay > 0 &&
              selectedWeekDay <= days.length &&
              days[selectedWeekDay - 1].full}
          </Typography>
        </Stack>
      </Grid>

      <Grid item md={12}>
        <ToggleButtonGroup
          color="primary"
          value={selectedWeekDay}
          exclusive
          onChange={handleChange}
          aria-label="Platform"
          fullWidth
          size={getToggleButtonSize()}
          sx={{
            backgroundColor: "#fff",
          }}
        >
          {days.map((day, index) => (
            <ToggleButton key={index} value={index + 1}>
              {isXs
                ? day.short
                : isXl || parseInt(selectedWeekDay) === index + 1
                  ? day.full
                  : day.short}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Grid>
      <Grid item md={12}>
        <Card
          sx={{
            boxShadow: 3,
            minHeight: 50,
            backgroundColor: "#fff",
            marginTop: 2,
            width: "100%",
          }}
        >
          {tasksForSelectedDay.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calandar />
            </Box>
          ) : (
            tasksForSelectedDay.map((task, i) => <TimeCard key={i} task={task} />)
          )}
        </Card>
      </Grid>
    </Grid>
  );
};
export default Timeline;
