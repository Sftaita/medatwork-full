import React from "react";
import { useTranslation } from "react-i18next";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import WeekTaskForm from "./WeekTaskForm";

const AddBloc = () => {
  const { t } = useTranslation();
  const { weekTemplates, selectedWeekId } = useWeekShedulerContext();

  if (weekTemplates.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">{t("weekCreator.addBloc.noTemplates")}</Alert>
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
