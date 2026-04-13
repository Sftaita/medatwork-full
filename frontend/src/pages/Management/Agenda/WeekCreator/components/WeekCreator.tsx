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
          <Card sx={{ boxShadow: 3, height: "100%" }}>
            <Grid container direction={isMd ? "row" : "column"} sx={{ height: "100%" }}>
              <Grid item md={3}>
                <AddBloc />
              </Grid>
              <Grid
                item
                md={7}
                sx={{
                  backgroundColor: "#F6F4FC",
                  height: !isMd ? "70vh" : "80vh",
                  width: "100%",
                }}
              >
                <TimelineBloc />
              </Grid>
              <Grid item md={2} padding={4} sx={{ height: !isMd && "100vh" }}>
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
