import React, { useState, useEffect, useCallback } from "react";
import residentsApi from "../../../services/residentsApi";

// Material UI
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";

// General components
import Window from "../../../components/big/Windows";

// Local components
import General from "./components/General";
import Formation from "./components/Formation";
import Account from "./components/Account";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

const ParametersPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({});

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);

    try {
      const { method, url } = residentsApi.fetchResidentInfo();
      const request = await axiosPrivate[method](url);
      setInfo(request.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

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
          Paramètres
        </Typography>
        <Typography
          variant="h4"
          align={"center"}
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          Informations personnelles
        </Typography>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
            color: "red",
          }}
          gutterBottom
          align={"center"}
        >
          En cours de dévellopement
        </Typography>
      </Box>

      <Box paddingLeft={isMd ? theme.spacing(4) : ""} paddingRight={isMd ? theme.spacing(4) : ""}>
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
        {!loading && (
          <Box display={"flex"} flexDirection={"row"} width={"100%"} justifyContent={"center"}>
            <Grid item container xs={12} md={8} alignItems={"center"} justifyContent="center">
              <General info={info} fetchUserInfo={fetchUserInfo} />
              <Formation info={info} fetchUserInfo={fetchUserInfo} />
              <Account info={info} fetchUserInfo={fetchUserInfo} />
            </Grid>
          </Box>
        )}
      </Box>
    </Window>
  );
};

export default ParametersPage;
