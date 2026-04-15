import React from "react";
import Box from "@mui/material/Box";
import WeekCreator from "./components/WeekCreator";

const WeekCreatorPage = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>
      <WeekCreator />
    </Box>
  );
};

export default WeekCreatorPage;
