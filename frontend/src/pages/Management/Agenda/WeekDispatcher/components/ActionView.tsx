import React, { useMemo } from "react";
import CustomSelect from "../../../../../components/medium/CustomSelect";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";

// Material UI
import { MenuItem, Alert } from "@mui/material";
import Box from "@mui/material/Box";

const ActionView = ({ isLoading }: { isLoading: boolean }) => {
  const {
    years,
    currentYearId,
    setCurrentYearId,
    setInterval,
    setResidents,
    setYearWeekTemplates,
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
          value={currentYearId ?? ""}
          onChange={handleYearChange}
          item={yearItems}
          loading={isLoading}
        />
      </Box>

    </Box>
  );
};

export default ActionView;
