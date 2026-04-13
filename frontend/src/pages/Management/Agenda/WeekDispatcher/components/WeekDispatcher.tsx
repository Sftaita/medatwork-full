import { useState, useEffect } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import yearsApi from "../../../../../services/yearsApi";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";

// Material UI
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Box } from "@mui/system";

// Local components
import ActionView from "./ActionView";
import WeekTaskAllocation from "./WeekTaskAllocation";
import { handleApiError } from "@/services/apiError";

const WeekDispatcher = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("xl"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState();

  const {
    setCurrentYearId,
    setYears,
    setResidents,
    setInterval,
    setYearWeekTemplates,
    setAssignments,
  } = useWeekDispatcherContext();

  function formatDataForSetAssignments(data) {
    const formattedAssignments = {};

    data.forEach((item) => {
      const type = item.yearWeekTemplateId;
      const week = item.yearsWeekIntervals;
      const resident = {
        id: item.residentId,
        allowed: true, // Ici, je suppose que tous les résidents sont autorisés. Si ce n'est pas le cas, vous devrez adapter cette partie.
        residentId: item.residentId,
        firstname: item.residentFirstname,
        lastname: item.residentLastname,
      };

      if (!formattedAssignments[type]) {
        formattedAssignments[type] = {};
      }

      formattedAssignments[type][week] = resident;
    });

    return formattedAssignments;
  }

  useEffect(() => {
    const getWeekIntervals = async () => {
      setIsLoading(true);
      try {
        const { method, url } = yearsApi.getYearsWeekIntervals();
        const request = await axiosPrivate[method](url);

        setYears(request?.data?.yearsSummary);

        // update assignements
        const proccessedgAssignements = formatDataForSetAssignments(request?.data?.assignements);
        setAssignments(proccessedgAssignements);
        // Select the first template if the array is not empty
        if (request?.data?.yearsSummary && request?.data?.yearsSummary.length > 0) {
          setCurrentYearId(request?.data?.yearsSummary[0].yearId);
          setResidents(request?.data?.yearsSummary[0].residents);
          setInterval(request?.data?.yearsSummary[0].weekIntervals);
          setYearWeekTemplates(request?.data?.yearsSummary[0].yearWeekTemplates);
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    getWeekIntervals();
  }, [axiosPrivate, setAssignments, setCurrentYearId, setInterval, setResidents, setYearWeekTemplates, setYears]);

  return (
    <Box container spacing={4}>
      <Card sx={{ boxShadow: 3, minHeight: "60vh", height: "100%" }}>
        <Grid container direction={isMd ? "row" : "column"} sx={{ height: "100%" }}>
          <Grid item md={3}>
            <ActionView isLoading={isLoading} />{" "}
          </Grid>

          <Grid
            item
            md={9}
            sx={{
              backgroundColor: "#F6F4FC",
              height: "100%",
              width: "100%",
            }}
          >
            <WeekTaskAllocation isLoading={isLoading} setIsLoading={setIsLoading} />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default WeekDispatcher;
