import React, { useState, useEffect } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import residentsApi from "../../../services/residentsApi";

//Material UI
import { Box, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { handleApiError } from "@/services/apiError";

// Scheduler module
import { ViewState, EditingState, IntegratedEditing } from "@devexpress/dx-react-scheduler";
import {
  Scheduler,
  DayView,
  WeekView,
  MonthView,
  Appointments,
  ViewSwitcher,
  Toolbar,
  DateNavigator,
  TodayButton,
  AppointmentTooltip,
} from "@devexpress/dx-react-scheduler-material-ui";

const ResidentCalendarPage = () => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { method, url } = residentsApi.fetchResidentScheduler();
        const request = await axiosPrivate[method](url);
        setData(request.data);
      } catch (error) {
        handleApiError(error);
      }
    };
    fetchData();
  }, [axiosPrivate]);

  return (
    <Box
      maxWidth={"100%"}
      paddingLeft={theme.spacing(2)}
      paddingRight={theme.spacing(2)}
      paddingTop={theme.spacing(2)}
    >
      <Card>
        <Scheduler data={data} locale={"fr-FR"} height={560} firstDayOfWeek={1}>
          <ViewState />
          <EditingState />
          <IntegratedEditing />
          <Toolbar />
          <DateNavigator />
          <TodayButton />
          <ViewSwitcher />
          <MonthView />
          <WeekView />
          <DayView />
          <Appointments />
          <AppointmentTooltip />
        </Scheduler>
      </Card>
    </Box>
  );
};

export default ResidentCalendarPage;
