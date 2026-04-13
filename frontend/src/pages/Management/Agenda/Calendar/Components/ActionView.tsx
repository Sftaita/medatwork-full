import React, { useState, useEffect } from "react";
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
    schedules,
    setSchedules,
    setSelectedSchedules,
  } = useManagersCalendarContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeYear = (event) => {
    const yearId = event.target.value;
    const selectedYear = years.find((year) => year.yearId === yearId);

    loadByYearId(selectedYear.yearId);
    if (selectedYear) {
      setCurrentYear(selectedYear);
      setYearResidents(selectedYear.residents);
      setSelectedResidents(selectedYear.residents.map((resident) => resident.residentId)); // Select all residents of the year
      setSchedules(selectedYear.schedules);
      setSelectedSchedules(
        selectedYear.schedules.filter((schedule) =>
          selectedYear.residents
            .map((resident) => resident.residentId)
            .includes(schedule.classNames)
        )
      ); // Only select schedules that have their classNames in the list of residents
    }
  };

  const handleToggleResident = (residentId) => {
    const currentIndex = selectedResidents.indexOf(residentId);
    const newSelectedResidents = [...selectedResidents];

    if (currentIndex === -1) {
      newSelectedResidents.push(residentId);
    } else {
      newSelectedResidents.splice(currentIndex, 1);
    }

    setSelectedResidents(newSelectedResidents);
    setSelectedSchedules(
      schedules.filter((schedule) => newSelectedResidents.includes(schedule.classNames))
    );
  };

  const loadByYearId = async (yearId) => {
    setIsLoading(true);
    try {
      const { method, url } = calendarApi.loadSchedulesByYearId(yearId);
      const request = await axiosPrivate[method](url);
      setYearResidents(request?.data?.residents);
      setSchedules(request?.data?.schedules);

      // Update selectedResidents and selectedSchedules according to the new data
      setSelectedResidents(request?.data?.residents.map((resident) => resident.residentId));
      setSelectedSchedules(
        request?.data?.schedules.filter((schedule) =>
          request?.data?.residents
            .map((resident) => resident.residentId)
            .includes(schedule.classNames)
        )
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedSchedules(
      schedules.filter((schedule) => selectedResidents.includes(schedule.classNames))
    );
  }, [selectedResidents, schedules, setSelectedSchedules]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { method, url } = calendarApi.fetchFirstLoadSchedules();
        const request = await axiosPrivate[method](url);

        const data = request?.data?.years;

        if (data?.length > 0) {
          setYears(data);
          setCurrentYear(data[0]);
          setYearResidents(data[0]?.residents);
          setSelectedResidents(data[0]?.residents.map((resident) => resident.residentId)); // Select all residents initially
          setSchedules(data[0]?.schedules);
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [axiosPrivate, setCurrentYear, setSchedules, setSelectedResidents, setYearResidents, setYears]);

  // Drawer controller
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

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
        <Grid item xs={10} md={12} width={"100%"}>
          {" "}
          <CustomSelect
            loading={isLoading}
            value={parseInt(currentYear.yearId)}
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
            <FormControl>
              <FormLabel id="demo-radio-buttons-group-label">MACCS</FormLabel>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedResidents.length === yearResidents.length}
                    onChange={() => {
                      if (selectedResidents.length === yearResidents.length) {
                        setSelectedResidents([]);
                        setSelectedSchedules([]);
                      } else {
                        setSelectedResidents(yearResidents.map((r) => r.residentId));
                        setSelectedSchedules(schedules);
                      }
                    }}
                    sx={{
                      "&.Mui-checked": {
                        color: "grey", // spécifiez votre couleur grise ici
                      },
                    }}
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
                      onChange={() => handleToggleResident(resident.residentId)}
                      sx={{
                        "&.Mui-checked": {
                          color: resident.residentColor,
                        },
                      }}
                    />
                  }
                  label={resident.residentFirstname + " " + resident.residentLastname}
                />
              ))}
            </FormControl>
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
      <Drawer anchor="left" open={drawerOpen} onClose={() => handleDrawerClose()}>
        <Box padding={3} sx={{ width: "60vw", height: "100%" }}>
          <FormControl>
            <FormLabel id="demo-radio-buttons-group-label">MACCS</FormLabel>

            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedResidents.length === yearResidents.length}
                  onChange={() => {
                    if (selectedResidents.length === yearResidents.length) {
                      setSelectedResidents([]);
                      setSelectedSchedules([]);
                    } else {
                      setSelectedResidents(yearResidents.map((r) => r.residentId));
                      setSelectedSchedules(schedules);
                    }
                  }}
                  sx={{
                    "&.Mui-checked": {
                      color: "grey", // spécifiez votre couleur grise ici
                    },
                  }}
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
                    onChange={() => handleToggleResident(resident.residentId)}
                    sx={{
                      "&.Mui-checked": {
                        color: resident.residentColor,
                      },
                    }}
                  />
                }
                label={resident.residentFirstname + " " + resident.residentLastname}
              />
            ))}
          </FormControl>
        </Box>
      </Drawer>
    </>
  );
};

export default ActionView;
