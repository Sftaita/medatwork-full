import React from "react";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import WeekTaskForm from "./WeekTaskForm";

const AddBloc = () => {
  const { weekTemplates, selectedWeekId } = useWeekShedulerContext();

  if (weekTemplates.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Créez un modèle de semaine en cliquant sur&nbsp;
          <Typography component="span" variant="inherit" fontWeight={700}>+</Typography>
          &nbsp;ci-dessus.
        </Alert>
      </Box>
    );
  }

  if (!selectedWeekId) return null;

  return (
    <Box sx={{ p: 2 }}>
      <WeekTaskForm />
    </Box>
  );
};

export default AddBloc;
