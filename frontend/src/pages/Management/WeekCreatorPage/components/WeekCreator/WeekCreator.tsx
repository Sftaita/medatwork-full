import React, { useEffect } from "react";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";

// Material UI
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

// Local compenents
import AddBloc from "../WeekCreator/components/AddBloc";
import Timeline from "../Timeline";
import TimeSummary from "../TimeSummary";
import { handleApiError } from "@/services/apiError";

const WeekCreator = () => {
  const axiosPrivate = useAxiosPrivate();
  const { setWeekTemplates } = useWeekShedulerContext();

  useEffect(() => {
    const fetchWeekTemplate = async () => {
      try {
        const { method, url } = weekTemplatesApi.getWeekTemplatesList();
        const request = await axiosPrivate[method](url);
        setWeekTemplates(request.data);
      } catch (error) {
        handleApiError(error);
      }
    };

    fetchWeekTemplate();
  }, [axiosPrivate, setWeekTemplates]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={12}>
        <Card sx={{ boxShadow: 3, minHeight: "60vh", height: "100%" }}>
          <Grid container sx={{ height: "100%" }}>
            <Grid item md={3}>
              <AddBloc />
            </Grid>
            <Grid
              item
              md={7}
              sx={{
                backgroundColor: "#F6F4FC",
                height: "100%",
                width: "100%",
              }}
            >
              <Timeline />
            </Grid>
            <Grid item md={2} padding={2}>
              <TimeSummary />
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

export default WeekCreator;
