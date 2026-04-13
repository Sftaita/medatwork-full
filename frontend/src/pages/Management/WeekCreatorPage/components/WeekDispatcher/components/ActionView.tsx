import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CustomDay from "./CustomDay";
import useWeekShedulerContext from "../../../../../../hooks/useWeekShedulerContext";

const ActionView = () => {
  const startDate = "2022/10/01";
  const endDate = "2023/10/01";
  const { setSelectedWeek } = useWeekShedulerContext();
  const handleDateChange = (date) => {
    setSelectedWeek({
      start: date.clone().startOf("week"),
      end: date.clone().endOf("week"),
    });
  };

  return (
    <Grid container direction="column" paddingTop={2} spacing={2}>
      <Grid item md={12} sx={{ textAlign: "center" }}>
        <Typography>Répartition des semaines</Typography>
      </Grid>
      <Grid
        item
        md={12}
        sx={{
          display: "flex",
          justifyContent: "center",
          marginLeft: 0,
          padding: 0,
        }}
      >
        <CustomDay startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
      </Grid>
    </Grid>
  );
};

export default ActionView;
