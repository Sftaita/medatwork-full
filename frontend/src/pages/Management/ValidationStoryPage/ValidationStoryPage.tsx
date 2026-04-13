import React, { useState } from "react";

// Material UI
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Tabs, { tabsClasses } from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";

// General components
import Window from "../../../components/big/Windows";
import InWaiting from "./components/InWainting";
import Validated from "./components/Validated";

const ValidationStoryPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [loading] = useState();

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
          Périodes
        </Typography>
        <Typography
          variant="h4"
          align={"center"}
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          Historique de validation
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
              aria-label="scrollable auto tabs example"
              sx={{
                [`& .${tabsClasses.scrollButtons}`]: {
                  "&.Mui-disabled": { opacity: 0.3 },
                },
              }}
            >
              <Tab label="Validé(s)" />
              <Tab label="En attente" />
            </Tabs>
          </Box>
        </Box>
      </Box>

      <Box paddingLeft={{ xs: theme.spacing(2), md: theme.spacing(4) }} paddingRight={{ xs: theme.spacing(2), md: theme.spacing(4) }}>
        {loading && (
          <Box
            display={"flex"}
            flexDirection={"row"}
            width={"100%"}
            justifyContent={"center"}
            marginTop={"20vh"}
          >
            <CircularProgress />
          </Box>
        )}
        {selected === 0 && <Validated />}
        {selected === 1 && <InWaiting />}
      </Box>
    </Window>
  );
};

export default ValidationStoryPage;
