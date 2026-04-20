import React, { useState, useMemo } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import CustomSelect from "../../../../../components/medium/CustomSelect";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";

// Material UI
import { MenuItem, Alert } from "@mui/material";
import Box from "@mui/material/Box";
import LoadingButton from "@mui/lab/LoadingButton";
import { handleApiError } from "@/services/apiError";

const ActionView = ({ isLoading }: { isLoading: boolean }) => {
  const axiosPrivate = useAxiosPrivate();
  const [isPending, setIsPending] = useState(false);

  const {
    years,
    currentYearId,
    setCurrentYearId,
    setInterval,
    setResidents,
    setYearWeekTemplates,
    pendingChange,
    setPendingChange,
  } = useWeekDispatcherContext();

  const handleYearChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const yearId = event.target.value as number;

    const selectedYear = years?.find((year) => year.yearId === yearId);
    if (selectedYear) {
      setResidents((selectedYear as any).residents);
      setInterval((selectedYear as any).weekIntervals);
      setYearWeekTemplates((selectedYear as any).yearWeekTemplates);
    }
    setCurrentYearId(yearId);
    // Discard any pending changes from the previous year
    setPendingChange([]);
  };

  const yearItems = useMemo(() => {
    return years.map((year) => {
      const info = (year as any).yearInfo;
      const label = info?.location
        ? `${info.title} — ${info.location}`
        : (info?.title ?? "");
      return (
        <MenuItem key={(year as any).yearId} value={(year as any).yearId}>
          {label}
        </MenuItem>
      );
    });
  }, [years]);

  const handleSubmit = async () => {
    setIsPending(true);
    try {
      const { method, url } = calendarApi.dispatchWeek(currentYearId);
      await axiosPrivate[method](url, pendingChange);
      setPendingChange([]);
      toast.success("Mise à jour réussie.", toastSuccess);
    } catch (error) {
      handleApiError(error);
      if ((error as any)?.response?.data?.message) {
        toast.error((error as any).response.data.message, toastError);
      } else {
        toast.error("Oups! Une erreur s'est produite.", toastError);
      }
    } finally {
      setIsPending(false);
    }
  };

  // No years and not loading → info alert (table section is also hidden)
  if (years.length === 0 && !isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Vous n'avez actuellement aucune année en cours. Seules les années en cours ou à
          venir sont susceptibles d'être planifiées.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 2,
        py: 1.5,
        gap: 2,
      }}
    >
      {/* Year selector — grows to fill available space */}
      <Box sx={{ minWidth: 280, maxWidth: 420, flexGrow: 1 }}>
        <CustomSelect
          label="Année"
          name="year"
          value={currentYearId}
          onChange={handleYearChange}
          item={yearItems}
          loading={isLoading}
        />
      </Box>

      {/* Save button — pinned to the right */}
      <LoadingButton
        variant="contained"
        disabled={pendingChange.length === 0}
        onClick={handleSubmit}
        loading={isPending}
        sx={{ flexShrink: 0 }}
      >
        Enregistrer
      </LoadingButton>
    </Box>
  );
};

export default ActionView;
