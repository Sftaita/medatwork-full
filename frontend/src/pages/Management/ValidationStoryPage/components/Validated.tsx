import React, { useState, useEffect, useCallback } from "react";
import periodsApi from "../../../../services/periodsApi";

import { monthList } from "../../../../doc/lists";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { specialityAbreviation } from "../../../../doc/lists";

// Material UI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Toolbar } from "@mui/material";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { Stack } from "@mui/system";
import OptionsButton from "./OptionsButton";
import Grid from "@mui/material/Grid";

// Local component
import { ValidationSearchFilter } from "./ValidationSearchFilter";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "title", label: "Année", minWidth: 200, align: "left" },
  { id: "resident", label: "MACCS", minWidth: 200, align: "left" },
  { id: "period", label: "Périodes", minWidth: 150, align: "left" },
  { id: "validatedBy", label: "Validé par", minWidth: 200, align: "left" },
  { id: "year", label: "Date de validation", minWidth: 150, align: "left" },
];

const Validated = () => {
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [activeYearChecked, setActiveYearChecked] = useState(true);
  const [years, setYears] = useState([]);
  const [managers] = useState([]);
  const [speciality, setSpeciality] = useState([]);
  const [filters, setFilters] = useState([]);
  const [query, setQuery] = useState("");

  // Fetch list of inWaiting Period
  const getInWaintingList = useCallback(async (activeYearStatus) => {
    setLoading(true);
    try {
      const { method, url } = periodsApi.fetchValidatedPeriod();
      const request = await axiosPrivate[method](url + activeYearStatus);

      const decomposedArray = decomposeValidationPeriods(request?.data);

      setYears(
        Array.from(
          decomposedArray
            .reduce(
              (map, item) =>
                map.set(item.yearTitle, {
                  label: item.yearTitle,
                  value: item.yearId,
                }),
              new Map()
            )
            .values()
        )
      );

      setSpeciality(
        Array.from(
          decomposedArray
            .reduce(
              (map, item) =>
                map.set(item.speciality, {
                  label: specialityAbreviation[item.speciality] || item.speciality,
                  value: item.speciality,
                }),
              new Map()
            )
            .values()
        )
      );

      // fin de l'ajout du code

      setList(decomposedArray);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  // Create an array of selected residentMonthValidation
  const handleSelect = (event, residentValidationId) => {
    const selectedIndex = selected.indexOf(residentValidationId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, residentValidationId);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (residentValidationId) => selected.indexOf(residentValidationId) !== -1;

  // ActiveYearCheck controller
  const handleCheck = (event) => {
    setActiveYearChecked(event.target.checked);
    const status = event.target.checked;
    getInWaintingList(status ? "active" : "inactive");
  };

  useEffect(() => {
    getInWaintingList("active");
  }, [getInWaintingList]);

  const decomposeValidationPeriods = (list) => {
    return list
      .flatMap((item) => {
        const { masterFirstname, masterLastname, masterId, speciality, yearId, yearTitle } = item;

        return item.validationPeriods.map((period) => ({
          masterFirstname,
          masterLastname,
          masterId,
          speciality,
          yearId,
          yearTitle,
          ...period,
        }));
      })
      .sort((a, b) => {
        // Here, we assume that `year` is the year as a number
        // and `month` is the month as a number (January is 1, February is 2, etc.)
        const dateA = dayjs(new Date(a.year, a.month - 1));
        const dateB = dayjs(new Date(b.year, b.month - 1));

        const dateDiff = dateB.diff(dateA); // order by date in descending order (most recent first)

        if (dateDiff !== 0) return dateDiff; // if the dates are different, we're done

        // If the dates are the same, order by `yearTitle`
        const titleDiff = a.yearTitle.localeCompare(b.yearTitle);
        if (titleDiff !== 0) return titleDiff;

        // If `yearTitle` is the same, order by `residentLastname`
        return a.residentLastname.localeCompare(b.residentLastname);
      });
  };

  // Filter function
  const [filteredList, setFilteredList] = useState([]);

  useEffect(() => {
    const newList = list.filter((item) => {
      // Creating objects to store filters by field
      const filtersByField = {
        years: [],
        month: [],
        speciality: [],
      };

      // Filling the objects with filters
      filters.forEach((filter) => {
        filtersByField[filter.field].push(filter.value);
      });

      // Checking if item matches filters
      const matchesYear = filtersByField.years.length
        ? filtersByField.years.includes(item.yearId)
        : true;
      const matchesMonth = filtersByField.month.length
        ? filtersByField.month.includes(String(item.month))
        : true;
      const matchesSpeciality = filtersByField.speciality.length
        ? filtersByField.speciality.includes(item.speciality)
        : true;

      let matchesQuery = true;

      // If query is not empty, check if it matches masterFirstname, masterLastname, residentFirstname, residentLastname, or year
      if (query !== "") {
        const lowerCaseQuery = query.toLowerCase();
        matchesQuery =
          item.masterFirstname.toLowerCase().includes(lowerCaseQuery) ||
          item.masterLastname.toLowerCase().includes(lowerCaseQuery) ||
          item.residentFirstname.toLowerCase().includes(lowerCaseQuery) ||
          item.residentLastname.toLowerCase().includes(lowerCaseQuery) ||
          item.year.toString().includes(query);
      }

      // If all filters are empty, we should return true (display all items)
      if (filters.length === 0 && query === "") {
        return true;
      } else {
        // Otherwise, we check matches for each filter and the query
        return matchesYear && matchesMonth && matchesSpeciality && matchesQuery;
      }
    });

    setFilteredList(newList);
  }, [filters, list, query]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Toolbar>
          <Grid container direction="row" justifyContent="space-between" alignItems="center">
            <FormGroup>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={<Switch checked={activeYearChecked} onChange={handleCheck} />}
                  label="Année en cours"
                />
              </Stack>
            </FormGroup>
            <OptionsButton selected={selected} setLoading={setLoading} />
          </Grid>
        </Toolbar>
        <ValidationSearchFilter
          years={years}
          managers={managers}
          speciality={speciality}
          setFilters={setFilters}
          query={query}
          setQuery={setQuery}
          nbOfPeriods={filteredList.length}
        />

        <TableContainer sx={{ maxHeight: "60vh", backgroundColor: "#FFFFFF" }}>
          <Table stickyHeader aria-label="sticky table" size={"small"}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    variant="head"
                    sx={{ backgroundColor: "#f6ebf8" }}
                  >
                    <Typography variant="subtitle1">{column.label}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {!loading && (
              <TableBody>
                {list?.length !== 0 &&
                  filteredList.map((row) => {
                    const isItemSelected = isSelected(row?.residentValidationId);
                    return (
                      <TableRow
                        hover
                        onClick={(event) => handleSelect(event, row?.residentValidationId)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={row?.residentValidationId}
                        selected={isItemSelected}
                      >
                        <TableCell variant="body">
                          <Checkbox color="primary" checked={isItemSelected} />
                          {row?.yearTitle}
                        </TableCell>
                        <TableCell variant="body">
                          {row?.residentLastname + " " + row?.residentFirstname}
                        </TableCell>
                        <TableCell>{monthList[row.month] + " " + row?.year}</TableCell>
                        <TableCell variant="body">
                          {row?.masterLastname
                            ? row?.lastname + " " + row?.firstname
                            : "Non défini"}
                        </TableCell>
                        <TableCell variant="body">
                          {dayjs(row?.validatedAt).format("DD-MM-YYYY à HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Paper>

      {loading && (
        <Box
          display={"flex"}
          flexDirection={"row"}
          width={"100%"}
          justifyContent={"center"}
          marginTop={"10vh"}
        >
          <CircularProgress />
        </Box>
      )}
    </div>
  );
};

export default Validated;
