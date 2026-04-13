import React, { useState } from "react";

// Material UI
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

// General components
import Window from "../../../components/big/Windows";
import Timesheet from "./components/timesheet";
import Garde from "./components/garde";
import Absence from "./components/absence";

const DataManagement = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [selected, setSelected] = useState(0);
  const handleChange = (event, newValue) => {
    setSelected(newValue);
  };

  return (
    <Window>
      <Box marginBottom={4}>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
          }}
          gutterBottom
          color={"secondary"}
          align={"center"}
        >
          Activité
        </Typography>
        <Typography
          variant="h4"
          align={"center"}
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          Mes données enregistrées
        </Typography>

        <Box display="flex" flexDirection={"row"} justifyContent="center">
          <Box
            sx={{
              flexGrow: 1,
              maxWidth: isMd ? 350 : 300,
              bgcolor: "background.paper",
            }}
          >
            <Tabs
              value={selected}
              onChange={handleChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="onglets de navigation des données"
              sx={{
                [`& .${tabsClasses.scrollButtons}`]: {
                  "&.Mui-disabled": { opacity: 0.3 },
                },
              }}
            >
              <Tab label="Horaires" />
              <Tab label="Gardes" />
              <Tab label="Absences" />
            </Tabs>
          </Box>
        </Box>
      </Box>

      <Box paddingLeft={isMd ? theme.spacing(4) : ""} paddingRight={isMd ? theme.spacing(4) : ""}>
        {selected === 0 && <Timesheet />}
        {selected === 1 && <Garde />}
        {selected === 2 && <Absence />}
      </Box>
    </Window>
  );
};

export default DataManagement;
