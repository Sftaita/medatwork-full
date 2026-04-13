import React from "react";

// Material UI
import Grid from "@mui/material/Grid";
import PushPinIcon from "@mui/icons-material/PushPin";

import Chip from "@mui/material/Chip";

const TaskHistory = () => {
  return (
    <Grid container spacing={1}>
      <Grid item md={12} sx={{ paddingBottom: 0 }}>
        <Chip
          icon={<PushPinIcon color={"primary"} sx={{ fontSize: 15 }} />}
          label="Bloc-opératoire"
          variant="outlined"
          sx={{ width: "100%", justifyContent: "left" }}
          onClick={"gggg"}
        />
      </Grid>
      <Grid item md={12} sx={{ paddingBottom: 0 }}>
        <Chip
          icon={<PushPinIcon color={"primary"} sx={{ fontSize: 15 }} />}
          label="With Icon"
          variant="outlined"
          sx={{ width: "100%", justifyContent: "left" }}
          onClick={"gggg"}
        />
      </Grid>
      <Grid item md={12} sx={{ paddingBottom: 0 }}>
        <Chip
          icon={<PushPinIcon color={"primary"} sx={{ fontSize: 15 }} />}
          label="With Icon"
          variant="outlined"
          sx={{ width: "100%", justifyContent: "left" }}
          onClick={"gggg"}
        />
      </Grid>
    </Grid>
  );
};

export default TaskHistory;
