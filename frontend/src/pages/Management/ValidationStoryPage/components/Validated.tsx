import React, { useState, useEffect, useCallback } from "react";
import periodsApi from "../../../../services/periodsApi";
import { monthList, specialityAbreviation } from "../../../../doc/lists";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

// Material UI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Toolbar } from "@mui/material";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { Stack } from "@mui/system";

// Local component
import { ValidationSearchFilter } from "./ValidationSearchFilter";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "title",       label: "Année",             minWidth: 200, align: "left" },
  { id: "resident",    label: "MACCS",              minWidth: 200, align: "left" },
  { id: "period",      label: "Périodes",           minWidth: 150, align: "left" },
  { id: "validatedBy", label: "Validé par",         minWidth: 200, align: "left" },
  { id: "year",        label: "Date de validation", minWidth: 150, align: "left" },
];

const Validated = () => {
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [activeYearChecked, setActiveYearChecked] = useState(true);
  const [years, setYears] = useState([]);
  const [managers] = useState([]);
  const [speciality, setSpeciality] = useState([]);
  const [filters, setFilters] = useState([]);
  const [query, setQuery] = useState("");

  const getValidatedList = useCallback(async (activeYearStatus) => {
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
                map.set(item.yearTitle, { label: item.yearTitle, value: item.yearId }),
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

      setList(decomposedArray);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  const handleCheck = (event) => {
    setActiveYearChecked(event.target.checked);
    getValidatedList(event.target.checked ? "active" : "inactive");
  };

  useEffect(() => {
    getValidatedList("active");
  }, [getValidatedList]);

  const decomposeValidationPeriods = (list) =>
    list
      .flatMap((item) => {
        const { masterFirstname, masterLastname, masterId, speciality, yearId, yearTitle } = item;
        return item.validationPeriods.map((period) => ({
          masterFirstname, masterLastname, masterId, speciality, yearId, yearTitle,
          ...period,
        }));
      })
      .sort((a, b) => {
        const dateDiff = dayjs(new Date(b.year, b.month - 1)).diff(
          dayjs(new Date(a.year, a.month - 1))
        );
        if (dateDiff !== 0) return dateDiff;
        const titleDiff = a.yearTitle.localeCompare(b.yearTitle);
        if (titleDiff !== 0) return titleDiff;
        return a.residentLastname.localeCompare(b.residentLastname);
      });

  const [filteredList, setFilteredList] = useState([]);

  useEffect(() => {
    const newList = list.filter((item) => {
      const filtersByField = { years: [], month: [], speciality: [] };
      filters.forEach((filter) => {
        filtersByField[filter.field].push(filter.value);
      });

      const matchesYear     = filtersByField.years.length     ? filtersByField.years.includes(item.yearId)        : true;
      const matchesMonth    = filtersByField.month.length     ? filtersByField.month.includes(String(item.month)) : true;
      const matchesSpec     = filtersByField.speciality.length ? filtersByField.speciality.includes(item.speciality) : true;

      let matchesQuery = true;
      if (query !== "") {
        const q = query.toLowerCase();
        matchesQuery =
          item.masterFirstname.toLowerCase().includes(q) ||
          item.masterLastname.toLowerCase().includes(q)  ||
          item.residentFirstname.toLowerCase().includes(q) ||
          item.residentLastname.toLowerCase().includes(q)  ||
          item.year.toString().includes(query);
      }

      if (filters.length === 0 && query === "") return true;
      return matchesYear && matchesMonth && matchesSpec && matchesQuery;
    });

    setFilteredList(newList);
  }, [filters, list, query]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Toolbar>
          <FormGroup>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Switch checked={activeYearChecked} onChange={handleCheck} />}
                label="Année en cours"
              />
            </Stack>
          </FormGroup>
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
                  filteredList.map((row) => (
                    <TableRow hover tabIndex={-1} key={row?.residentValidationId}>
                      <TableCell variant="body">{row?.yearTitle}</TableCell>
                      <TableCell variant="body">
                        {row?.residentLastname + " " + row?.residentFirstname}
                      </TableCell>
                      <TableCell>{monthList[row.month] + " " + row?.year}</TableCell>
                      <TableCell variant="body">
                        {row?.masterLastname
                          ? row?.masterLastname + " " + row?.masterFirstname
                          : "Non défini"}
                      </TableCell>
                      <TableCell variant="body">
                        {dayjs(row?.validatedAt).format("DD-MM-YYYY à HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
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
