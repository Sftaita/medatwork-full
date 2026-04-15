import React, { useState } from "react";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

// Material UI
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Alert } from "@mui/material";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import Drawer from "@mui/material/Drawer";
import { Stack } from "@mui/system";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local components
import WeekTemplatesList from "./WeekTemplatesList";
import CreateWeekForm from "../../WeekDispatcher/components/CreateWeekForm";

const WeekTemplateSelector = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { weekTemplates } = useWeekShedulerContext();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      <Grid item sx={{ textAlign: "center" }} aria-label="Bloc-Title">
        <Typography variant={"h6"} color={"primary"}>
          Editeur de postes
        </Typography>
      </Grid>

      <Grid item aria-label="weekTemplate-List">
        <Grid
          container
          direction="column"
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={2}
        >
          <Grid item sx={{ width: "100%" }}>
            <Grid aria-label="weekTemplate-Title">
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
              >
                <Typography variant="button">Postes de travail types</Typography>
                <Fab size="small" color="primary" aria-label="add" onClick={handleDrawerOpen}>
                  <AddIcon />
                </Fab>
              </Stack>
            </Grid>
            <Grid item paddingTop={2} aria-label="List">
              {weekTemplates?.length !== 0 && <WeekTemplatesList />}
              {weekTemplates?.length === 0 && (
                <Alert severity="info">
                  Vous n'avez pas encore de modèle de semaine. Créez-en un en appuyant sur le
                  bouton '+'.
                </Alert>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          style: {
            width: isMd ? "50%" : "100%",
          },
        }}
      >
        <div>
          <IconButton onClick={handleDrawerClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <CreateWeekForm onCancel={handleDrawerClose} />
      </Drawer>
    </>
  );
};

export default WeekTemplateSelector;
