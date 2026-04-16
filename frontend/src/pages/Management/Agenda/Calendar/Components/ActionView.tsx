import React, { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import useManagersCalendarContext from "../../../../../hooks/useManagersCalendarContext";

// General components
import CustomSelect from "../../../../../components/medium/CustomSelect";

// Material components
import { Grid, Checkbox, IconButton, Drawer } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Groups2Icon from "@mui/icons-material/Groups2";
import { Box } from "@mui/system";
import { handleApiError } from "@/services/apiError";

// ── ResidentCheckboxList ──────────────────────────────────────────────────────
interface ResidentCheckboxListProps {
  yearResidents: any[];
  selectedResidents: number[];
  onToggleAll: () => void;
  onToggle: (residentId: number) => void;
}

const ResidentCheckboxList = ({
  yearResidents,
  selectedResidents,
  onToggleAll,
  onToggle,
}: ResidentCheckboxListProps) => (
  <FormControl>
    <FormLabel>MACCS</FormLabel>
    <FormControlLabel
      control={
        <Checkbox
          checked={yearResidents.length > 0 && selectedResidents.length === yearResidents.length}
          onChange={onToggleAll}
          sx={{ "&.Mui-checked": { color: "grey" } }}
        />
      }
      label="Afficher tous"
    />
    {yearResidents.map((resident) => (
      <FormControlLabel
        key={resident.residentId}
        control={
          <Checkbox
            checked={selectedResidents.includes(resident.residentId)}
            onChange={() => onToggle(resident.residentId)}
            sx={{ "&.Mui-checked": { color: resident.residentColor } }}
          />
        }
        label={`${resident.residentFirstname} ${resident.residentLastname}`}
      />
    ))}
  </FormControl>
);

// ── ActionView ────────────────────────────────────────────────────────────────
const ActionView = ({ isMd }) => {
  const axiosPrivate = useAxiosPrivate();

  const {
    years,
    setYears,
    currentYear,
    setCurrentYear,
    yearResidents,
    selectedResidents,
    setSelectedResidents,
    setYearResidents,
    setSchedules,
  } = useManagersCalendarContext();

  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadByYearId = useCallback(async (yearId: number | string) => {
    setIsLoading(true);
    try {
      const { method, url } = calendarApi.loadSchedulesByYearId(yearId);
      const request = await axiosPrivate[method](url);
      const data = request?.data;
      if (data?.yearId) {
        setCurrentYear({ yearId: data.yearId, title: data.title });
      }
      setYearResidents(data?.residents ?? []);
      setSchedules(data?.schedules ?? []);
      setSelectedResidents((data?.residents ?? []).map((r: any) => r.residentId));
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosPrivate, setCurrentYear, setYearResidents, setSchedules, setSelectedResidents]);

  const handleChangeYear = (event) => {
    const yearId = event.target.value;
    const selectedYear = years.find((year) => year.yearId === yearId);
    if (selectedYear) {
      setCurrentYear(selectedYear);
      localStorage.setItem("calendar_selectedYearId", String(yearId));
    }
    loadByYearId(yearId);
  };

  const handleToggleResident = (residentId: number) => {
    const newSelected = selectedResidents.includes(residentId)
      ? selectedResidents.filter((id) => id !== residentId)
      : [...selectedResidents, residentId];
    setSelectedResidents(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedResidents.length === yearResidents.length) {
      setSelectedResidents([]);
    } else {
      setSelectedResidents(yearResidents.map((r: any) => r.residentId));
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { method, url } = calendarApi.fetchFirstLoadSchedules();
        const request = await axiosPrivate[method](url);
        const data = request?.data?.years;

        if (data?.length > 0) {
          setYears(data);
          const savedYearId = localStorage.getItem("calendar_selectedYearId");
          const initialYear = data.find((y: any) => String(y.yearId) === savedYearId) ?? data[0];
          setCurrentYear(initialYear);

          if (savedYearId && initialYear.yearId !== data[0].yearId) {
            // Saved year differs from the first one — load it from API
            await loadByYearId(initialYear.yearId);
          } else {
            setYearResidents(initialYear.residents);
            setSelectedResidents(initialYear.residents.map((r: any) => r.residentId));
            setSchedules(initialYear.schedules);
          }
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [axiosPrivate, loadByYearId, setCurrentYear, setSchedules, setSelectedResidents, setYearResidents, setYears]);

  return (
    <>
      <Grid
        container
        direction={isMd ? "column" : "row"}
        justifyContent="flex-start"
        alignItems={isMd ? "flex-start" : "center"}
        paddingLeft={2}
        paddingRight={2}
        spacing={2}
        marginBottom={2}
      >
        <Grid item xs={10} md={12} width="100%">
          <CustomSelect
            loading={isLoading}
            value={currentYear ? parseInt(currentYear.yearId) : ""}
            onChange={handleChangeYear}
            item={years.map((e) => (
              <MenuItem value={e.yearId} key={e.yearId}>
                {e.title}
              </MenuItem>
            ))}
          />
        </Grid>

        {isMd && (
          <Grid item md={12} padding={2}>
            <ResidentCheckboxList
              yearResidents={yearResidents}
              selectedResidents={selectedResidents}
              onToggleAll={handleToggleAll}
              onToggle={handleToggleResident}
            />
          </Grid>
        )}

        {!isMd && (
          <Grid item xs={2}>
            <IconButton onClick={() => setDrawerOpen(true)}>
              <Groups2Icon color="primary" />
            </IconButton>
          </Grid>
        )}
      </Grid>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box padding={3} sx={{ width: "60vw", height: "100%" }}>
          <ResidentCheckboxList
            yearResidents={yearResidents}
            selectedResidents={selectedResidents}
            onToggleAll={handleToggleAll}
            onToggle={handleToggleResident}
          />
        </Box>
      </Drawer>
    </>
  );
};

export default ActionView;
