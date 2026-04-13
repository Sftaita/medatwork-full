import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLocation } from "react-router";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Button } from "@mui/material";

// Local components;
import CustomTabs from "./component/CustomTabs";
import Partners from "./component/Partners";
import Residents from "./component/Residents";
import General from "./component/General";
import Setup from "./component/Setup";
import StaffPlanner from "./component/ParametersViews/StaffPlanner";
import ResidentParameters from "./component/ParametersViews/ResidentParameters";
import Compliance from "./component/Compliance";

const YearDetailPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const navigate = useNavigate();
  const { state } = useLocation();
  const [id, setId] = useState(null);
  const [title, setTitle] = useState("");
  const [adminRights, setAdminRights] = useState(null);

  useEffect(() => {
    if (state) {
      setId(state.id);
      setTitle(state.title);
      setAdminRights(state.adminRights);
    } else {
      navigate("/manager/years");
    }
  }, [navigate, state]);

  const TAB_INDEX: Record<string, number> = {
    general: 0,
    residents: 1,
    partners: 2,
    setup: 3,
    compliance: 4,
  };

  const defaultTab = state?.defaultTab ?? "general";
  const [activeLink, setActiveLink] = useState(defaultTab);

  const returnPoint = () => {
    if (activeLink === "staffPlanner") {
      setActiveLink("setup");
    } else {
      return navigate(-1);
    }
  };
  return (
    <Box>
      <Box paddingY={5} marginTop={-3}>
        <Box
          paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
          paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
          marginTop={0}
        >
          <Grid container direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Tableau de bord
            </Typography>
            <Button variant="outlined" onClick={() => returnPoint()}>
              Retour
            </Button>
          </Grid>
          <Typography variant="h6" sx={{ color: "primary.main" }}>
            {title}
          </Typography>
        </Box>
      </Box>
      <Box
        paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingTop={"0 !important"}
        marginTop={-8}
      >
        <Grid container spacing={4}>
          <Grid item xs={12} md={2}>
            <Card sx={{ boxShadow: 3 }}>
              <CustomTabs
                onChange={(x) => setActiveLink(x)}
                initialValue={TAB_INDEX[defaultTab] ?? 0}
              />
            </Card>
          </Grid>
          <Grid item xs={12} md={10}>
            <Card sx={{ boxShadow: 3, padding: 2 }}>
              {activeLink === "partners" && <Partners id={id} adminRights={adminRights} />}
              {activeLink === "residents" && (
                <Residents yearId={id} adminRights={adminRights} setActiveLink={setActiveLink} />
              )}
              {activeLink === "general" && <General yearId={id} adminRights={adminRights} />}
              {activeLink === "setup" && <Setup setActiveLink={setActiveLink} />}
              {activeLink === "staffPlanner" && <StaffPlanner yearId={id} />}
              {activeLink === "residentParameters" && <ResidentParameters yearId={id} />}
              {activeLink === "compliance" && <Compliance yearId={id} />}
            </Card>
            <Box marginTop={4} marginBottom={4}>
              <Button variant="outlined" onClick={() => returnPoint()}>
                Retour
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default YearDetailPage;
