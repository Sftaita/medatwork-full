// Material UI
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

// Local components
import ActionView from "./components/ActionView";
import WeekTaskAllocation from "./components/WeekTaskAllocation";

const WeekDispatcher = () => {
  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={12}>
        <Card sx={{ boxShadow: 3, minHeight: "60vh", height: "100%" }}>
          <Grid container sx={{ height: "100%" }}>
            <Grid item md={3}>
              <ActionView />
            </Grid>
            <Grid
              item
              md={9}
              sx={{
                backgroundColor: "#F6F4FC",
                height: "100%",
                width: "100%",
              }}
            >
              <WeekTaskAllocation />
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

export default WeekDispatcher;
