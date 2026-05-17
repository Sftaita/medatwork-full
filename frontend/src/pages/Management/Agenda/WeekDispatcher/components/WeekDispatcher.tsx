import { useState, useEffect } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import yearsApi from "../../../../../services/yearsApi";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";
import type { Assignments, ResidentAssignment } from "@/store/weekDispatcherStore";

// Material UI
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

// Local components
import WeekTaskAllocation from "./WeekTaskAllocation";
import { handleApiError } from "@/services/apiError";

interface ApiAssignment {
  yearWeekTemplateId: number;
  yearsWeekIntervals: number;
  residentId: number;
  residentFirstname: string;
  residentLastname: string;
}

function formatDataForSetAssignments(data: ApiAssignment[]): Assignments {
  const result: Assignments = {};

  data.forEach((item) => {
    const type = item.yearWeekTemplateId;
    const week = item.yearsWeekIntervals;

    if (!result[type]) {
      result[type] = {};
    }

    result[type][week] = {
      id: item.residentId,
      residentId: item.residentId,
      firstname: item.residentFirstname,
      lastname: item.residentLastname,
      allowed: true,
    } satisfies ResidentAssignment;
  });

  return result;
}

const WeekDispatcher = () => {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    years,
    setCurrentYearId,
    setYears,
    setResidents,
    setInterval,
    setYearWeekTemplates,
    setAssignments,
  } = useWeekDispatcherContext();

  useEffect(() => {
    const getWeekIntervals = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { method, url } = yearsApi.getYearsWeekIntervals();
        const request = await axiosPrivate[method](url);

        setYears(request?.data?.yearsSummary ?? []);

        const processedAssignments = formatDataForSetAssignments(
          request?.data?.assignements ?? []
        );
        setAssignments(processedAssignments);

        if (request?.data?.yearsSummary?.length > 0) {
          const first = request.data.yearsSummary[0];
          setCurrentYearId(first.yearId);
          setResidents(first.residents);
          setInterval(first.weekIntervals);
          setYearWeekTemplates(first.yearWeekTemplates);
        }
      } catch (error) {
        handleApiError(error);
        setLoadError("Impossible de charger les données de planification.");
      } finally {
        setIsLoading(false);
      }
    };
    getWeekIntervals();
  }, [axiosPrivate, setAssignments, setCurrentYearId, setInterval, setResidents, setYearWeekTemplates, setYears]);

  if (loadError) {
    return <Alert severity="error" sx={{ m: 2 }}>{loadError}</Alert>;
  }

  const hasYears = years.length > 0;

  return (
    <Box>
      <WeekTaskAllocation isLoading={isLoading} />
    </Box>
  );
};

export default WeekDispatcher;
