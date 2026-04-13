import React from "react";
import { Box, Card, Typography, Stack, Grid } from "@mui/material";
import { alpha } from "@mui/material/styles";

const DayBar = ({ dayName, hours, minutes }) => {
  const taskLineWidth = `${((hours * 60 + minutes) / (24 * 60)) * 100}%`;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container alignItems="center" justifyContent="space-between">
        <Grid item>
          <Typography sx={{ textAlign: "left" }}>{dayName}</Typography>
        </Grid>
        <Grid item>
          <Typography>
            {hours}
            {minutes !== 0 ? `h${minutes}` : "h"}
          </Typography>
        </Grid>
      </Grid>
      <Box sx={{ position: "relative", height: 32 }}>
        <Box
          sx={{
            width: "100%",
            height: 4,
            backgroundColor: "#ffff",
            position: "absolute",
            top: 16,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: taskLineWidth,
              height: 4,
              backgroundColor: "#a439b6",
              position: "absolute",
              transition: "width 0.3s",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                backgroundColor: "#a439b6",
                borderRadius: "50%",
                position: "absolute",
                right: -4,
                top: -2,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const WeekCard = ({ days }) => {
  return (
    <Card sx={{ backgroundColor: alpha("#a439b6", 0.2), p: 2 }}>
      <Stack>
        {days.map(({ dayName, hours, minutes }) => (
          <DayBar key={dayName} dayName={dayName} hours={hours} minutes={minutes} />
        ))}
      </Stack>
    </Card>
  );
};

export default WeekCard;
