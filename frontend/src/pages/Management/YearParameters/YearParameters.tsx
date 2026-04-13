import React, { useState, useEffect, useCallback } from "react";
import yearsApi from "../../../services/yearsApi";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useLocation } from "react-router";

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
import DateSection from "./components/DateSection";
import GeneralInformation from "./components/GeneralInformation";
import { handleApiError } from "@/services/apiError";

const YearParameters = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  const { state } = useLocation();
  const { yearId } = state;
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({});

  const fetchYearInformation = useCallback(async () => {
    setLoading(true);

    try {
      const { method, url } = yearsApi.getYearById();
      const request = await axiosPrivate[method](url + yearId);
      setInfo(request.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, yearId]);

  useEffect(() => {
    fetchYearInformation();
  }, [fetchYearInformation]);

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
          Informations de l'année
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
              <DateSection yearInfomrations={info} fetchYearInformation={fetchYearInformation} />
              <GeneralInformation
                yearInfomrations={info}
                fetchYearInformation={fetchYearInformation}
              />
            </Grid>
          </Box>
        )}
      </Box>
    </Window>
  );
};

export default YearParameters;
