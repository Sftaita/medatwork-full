import React, { useState, useEffect, useCallback } from "react";
import periodsApi from "../../../../services/periodsApi";
import dayjs from "@/lib/dayjs";
import { monthList } from "../../../../doc/lists";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

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
import { handleApiError } from "@/services/apiError";

const columns = [
  { id: "title", label: "Année", minWidth: 250, align: "left" },
  { id: "period", label: "Périodes", minWidth: 150, align: "left" },
  { id: "master", label: "Maître de stage", minWidth: 200, align: "left" },
  { id: "year", label: "En attente depuis", minWidth: 150, align: "left" },
];

const InWaiting = () => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [activeYearChecked, setActiveYearChecked] = useState(true);

  // Fetch list of inWaiting Period
  const getInWaintingList = useCallback(async (activeYearStatus) => {
    setLoading(true);
    try {
      const { method, url } = periodsApi.fetchInWaitingPeriodValidation();
      const request = await axiosPrivate[method](url + activeYearStatus);
      setList(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  // Create an array of selected month
  const handleSelect = (event, periodId) => {
    const selectedIndex = selected.indexOf(periodId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, periodId);
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

  const isSelected = (periodId) => selected.indexOf(periodId) !== -1;

  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0);
  };

  // ActiveYearCheck controller
  const handleCheck = (event) => {
    setActiveYearChecked(event.target.checked);
    const status = event.target.checked;
    getInWaintingList(status);
  };

  useEffect(() => {
    getInWaintingList(true);
  }, [getInWaintingList]);

  return (
    <div style={{ height: "40vh", width: "100%" }}>
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

        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table stickyHeader aria-label="sticky table" size={"small"}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    variant="head"
                  >
                    <Typography variant="subtitle1">{column.label}</Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {!loading && (
              <TableBody>
                {list.lentgh !== 0 &&
                  list.map((row) => {
                    const isItemSelected = isSelected(row.periodId);
                    return (
                      <TableRow
                        hover
                        onClick={(event) => handleSelect(event, row.periodId)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={row.periodId}
                        selected={isItemSelected}
                      >
                        <TableCell>
                          <Checkbox color="primary" checked={isItemSelected} />
                          {row.title}
                        </TableCell>
                        <TableCell>{monthList[row.month] + " " + row.year}</TableCell>
                        <TableCell>
                          {row?.masterLastname
                            ? row?.masterLastname + " " + row.masterFirstname
                            : "Non défini"}
                        </TableCell>
                        <TableCell>
                          {dayjs(getLastDayOfMonth(row.year, row.month))
                            .locale("fr")
                            .from(dayjs(), true)}
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

export default InWaiting;
