import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

function a11yProps(index) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

const CustomTabs = ({ onChange, initialValue = 0 }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [value, setValue] = React.useState(initialValue);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: "background.paper",
        display: "flex",
        height: "100%",
      }}
    >
      <Tabs
        orientation={isMd ? "vertical" : "horizontal"}
        variant="scrollable"
        value={value}
        centered={false}
        onChange={handleChange}
        width={1}
        sx={{
          width: "100%",
          minWidth: 600,
        }}
      >
        <Tab
          sx={{ alignItems: "start" }}
          label="Validation"
          {...a11yProps(0)}
          onClick={() => onChange("general")}
        />
        <Tab
          sx={{ alignItems: "start" }}
          label="MACCS"
          {...a11yProps(1)}
          onClick={() => onChange("residents")}
        />
        <Tab
          sx={{ alignItems: "start" }}
          label="Collaborateurs"
          {...a11yProps(2)}
          onClick={() => onChange("partners")}
        />
        <Tab
          sx={{ alignItems: "start" }}
          label="Paramètres"
          {...a11yProps(3)}
          onClick={() => onChange("setup")}
        />
        <Tab
          sx={{ alignItems: "start" }}
          label="Conformité"
          {...a11yProps(4)}
          onClick={() => onChange("compliance")}
        />
      </Tabs>
    </Box>
  );
};

export default CustomTabs;
