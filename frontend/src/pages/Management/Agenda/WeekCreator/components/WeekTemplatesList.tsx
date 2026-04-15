import React, { useState } from "react";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

// Material UI
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import EditIcon from "@mui/icons-material/Edit";
import { ButtonGroup, Button, IconButton } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";
import UpdateWeekTemplates from "./UpdateWeekTemplate";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local component

const WeekTemplatesList = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const { weekTemplates, selectedWeekId, setSelectedWeekId } = useWeekShedulerContext();

  const handleWeekTypeClick = (weekTemplate) => {
    setSelectedWeekId(weekTemplate?.id);
  };

  // Drawer controller
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = (weekTemplate) => {
    setSelectedWeekId(weekTemplate?.id);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      <Grid container spacing={1} sx={{ maxHeight: "35vh", overflowY: "auto", pr: 0.5 }}>
        {weekTemplates.map((weekType) => (
          <Grid key={weekType.id} item md={12} sx={{ paddingBottom: 0, width: "100%" }}>
            <ButtonGroup
              fullWidth
              variant={weekType.id === selectedWeekId ? "contained" : "outlined"}
              aria-label="split button"
            >
              <Box
                sx={{
                  width: 4,
                  flexShrink: 0,
                  backgroundColor: weekType.color || "#16b1ff",
                  alignSelf: "stretch",
                }}
                aria-hidden="true"
              />
              <Button
                onClick={() => handleWeekTypeClick(weekType)}
                sx={{ justifyContent: "flex-start" }}
              >
                {weekType.title}
              </Button>
              <Button fullWidth={false} size="small">
                <EditIcon onClick={() => handleDrawerOpen(weekType)} />
              </Button>
            </ButtonGroup>
          </Grid>
        ))}
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
        <UpdateWeekTemplates onCancel={handleDrawerClose} />
      </Drawer>
    </>
  );
};

export default WeekTemplatesList;
