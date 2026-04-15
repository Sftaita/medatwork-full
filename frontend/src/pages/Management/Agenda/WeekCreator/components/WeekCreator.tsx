import React, { useEffect, useState } from "react";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";

import Box from "@mui/material/Box";

import TopBar from "./TopBar";
import AddBloc from "./AddBloc";
import TimelineBloc from "./TimelineBloc";
import Loading from "../../../../../components/big/Loading";
import { handleApiError } from "@/services/apiError";

const WeekCreator = () => {
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
        if (request?.data?.length > 0) {
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

  if (isLoading) return <Loading />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "82vh",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow: 3,
      }}
    >
      <TopBar />

      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: task form */}
        <Box
          sx={{
            width: { xs: "100%", md: "28%" },
            borderRight: "1px solid",
            borderColor: "divider",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <AddBloc />
        </Box>

        {/* Right: timeline */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#F6F4FC",
            overflowY: "auto",
          }}
        >
          <TimelineBloc />
        </Box>
      </Box>
    </Box>
  );
};

export default WeekCreator;
