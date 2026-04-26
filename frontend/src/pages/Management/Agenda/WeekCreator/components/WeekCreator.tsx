import React, { useEffect, useState } from "react";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";

// Material UI
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local compenents
import TopBar from "./TopBar";
import AddBloc from "./AddBloc";
import TimelineBloc from "./TimelineBloc";
import TimeSummaryBloc from "./TimeSummaryBloc";

// General component
import Loading from "../../../../../components/big/Loading";
import { handleApiError } from "@/services/apiError";

const WeekCreator = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const axiosPrivate = useAxiosPrivate();
  const { setWeekTemplates, setSelectedWeekId } = useWeekShedulerContext();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getWeekTemplatesList = async () => {
      setIsLoading(true);
      try {
        const { method, url } = weekTemplatesApi.getWeekTemplatesList();
        const request = await axiosPrivate[method](url);
        setWeekTemplates(request?.data);

        // Select the first template if the array is not empty
        if (request?.data && request?.data.length > 0) {
          setSelectedWeekId(request.data[0].id);
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    getWeekTemplatesList();
  }, [axiosPrivate, setSelectedWeekId, setWeekTemplates]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={12}>
        {isLoading && <Loading />}
        {!isLoading && (
          <Card sx={{ boxShadow: 3 }}>
            <TopBar />
            <Grid container direction={isMd ? "row" : "column"}>
              <Grid item xs={12} md={3}>
                <AddBloc />
              </Grid>
              <Grid item xs={12} md={6} sx={{ width: "100%" }}>
                <TimelineBloc />
              </Grid>
              <Grid item xs={12} md={3} sx={{ p: 2 }}>
                <TimeSummaryBloc />
              </Grid>
            </Grid>
          </Card>
        )}
      </Grid>
    </Grid>
  );
};

export default WeekCreator;
