import React, { useState, useEffect, useCallback } from "react";
import timesheetsApi from "../../../../services/timesheetsApi";

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
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Checkbox, Chip, Toolbar } from "@mui/material";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import Grid from "@mui/material/Grid";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DoneIcon from "@mui/icons-material/Done";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";

// local components
import Dialog from "./Dialog";
import OptionsButton from "./OptionsButton";

// General components
import { specialityAbreviation } from "../../../../doc/lists";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "name", label: "Nom", minWidth: 200, align: "left" },
  { id: "start", label: "Début", minWidth: 100, align: "left" },
  { id: "end", label: "Fin", minWidth: 100, align: "left" },
  { id: "pause", label: "Pause", minWidth: 100, align: "center" },
  { id: "workingTime", label: "Durée", minWidth: 100, align: "center" },
  { id: "science", label: "Scientifique", minWidth: 100, align: "center" },
  { id: "title", label: "Année", minWidth: 200, align: "left" },
];

const Timesheet = ({ month, setMonth, year, setYear }) => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleRowClick = (timesheetId, canValidate) => {
    if (!canValidate) return;

    const newSelectedRows = [...selectedRows];
    if (newSelectedRows.includes(timesheetId)) {
      const index = newSelectedRows.indexOf(timesheetId);
      newSelectedRows.splice(index, 1);
    } else {
      newSelectedRows.push(timesheetId);
    }
    setSelectedRows(newSelectedRows);
  };

  const isSelected = (timesheetId) => selectedRows.indexOf(timesheetId) !== -1;

  const getTimesheets = useCallback(async () => {
    setLoading(true);
    setOpen(false);

    try {
      const { method, url } = timesheetsApi.getResidentData();
      const request = await axiosPrivate[method](url + month + "" + year);

      if (request.data) {
        const workflow = [];
        request?.data.map((item) => {
          const startTime = dayjs(item.dateOfStart);
          const endTime = dayjs(item.dateOfEnd);

          // Calculate working time duration in minutes
          const totalDuration = endTime.diff(startTime, "minutes");

          // Substract breaktime
          const pauseDuration = item.pause ? item.pause : 0;
          const workDuration = totalDuration - pauseDuration;

          // Convert in time format
          const hours = Math.floor(workDuration / 60);
          const minutes = workDuration % 60;

          const t = {
            timesheetId: item.id,
            name: item.lastname.toUpperCase() + " " + item.firstname,
            start: dayjs(item.dateOfStart).format("DD-MM-YYYY, HH:mm"),
            end: dayjs(item.dateOfEnd).format("DD-MM-YYYY, HH:mm"),
            pause: item.pause !== 0 ? item.pause + " min" : 0,
            science: item.scientific !== 0 ? item.scientific + " min" : 0,
            title: item.title,
            speciality: specialityAbreviation[item.speciality],
            called: item.called,
            isEditable: item.isEditable,
            currentManagerCanValidate: item.currentManagerCanViladate,
            workDuration: `${hours}h${minutes ? `${minutes}` : ""}`,
          };
          workflow.push(t);
        });
        setTimesheets(workflow);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, month, year]);

  useEffect(() => {
    getTimesheets();
  }, [getTimesheets]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (event, reason) => {
    if (reason !== "backdropClick") {
      setOpen(false);
    }
  };

  // Filters
  const [searchText, setSearchText] = useState("");
  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const normalizeText = (text) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredTimesheets = timesheets.filter(
    (timesheet) =>
      normalizeText(timesheet.name).includes(normalizeText(searchText)) ||
      normalizeText(timesheet.title).includes(normalizeText(searchText)) ||
      (timesheet.speciality &&
        normalizeText(timesheet.speciality).includes(normalizeText(searchText)))
  );

  return (
    <div style={{ height: "40vh", width: "100%" }}>
      {!loading && (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Toolbar>
            <Grid container direction="row" justifyContent="space-between" alignItems="center">
              <Grid item xs={12} md={2}>
                <Box
                  component={Button}
                  variant="outlined"
                  color="primary"
                  size="medium"
                  marginTop={{ xs: 2, sm: 0 }}
                  fullWidth
                  onClick={handleClickOpen}
                >
                  <KeyboardArrowDownIcon />
                  {monthList[month] + " " + year}
                </Box>
              </Grid>
              <Grid item>
                <OptionsButton
                  selected={selectedRows}
                  setSelectedRows={setSelectedRows}
                  setLoading={setLoading}
                  timesheets={timesheets}
                  setTimesheets={setTimesheets}
                />
              </Grid>
            </Grid>
          </Toolbar>
          <Stack
            alignItems="center"
            component="form"
            direction="row"
            //onSubmit={""}
            spacing={2}
            sx={{ p: 2 }}
          >
            <SvgIcon>
              <SearchIcon />
            </SvgIcon>
            <Input
              defaultValue=""
              disableUnderline
              fullWidth
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Rechercher par MACCS, titre ou spécialité"
              sx={{ flexGrow: 1 }}
            />
          </Stack>
          <Stack />
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
                      sx={{ backgroundColor: "#f6ebf8" }}
                    >
                      <Typography variant="subtitle1">{column.label}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTimesheets.length !== 0 &&
                  filteredTimesheets.map((row) => {
                    const isItemSelected = isSelected(row?.timesheetId);
                    return (
                      <TableRow
                        hover
                        role="checkbox"
                        tabIndex={-1}
                        key={row.timesheetId}
                        selected={isItemSelected}
                        onClick={() =>
                          handleRowClick(row.timesheetId, row.currentManagerCanValidate)
                        }
                      >
                        <TableCell>
                          {" "}
                          <Stack direction="row" justifyContent="flex-start" alignItems="center">
                            {row?.currentManagerCanValidate && (
                              <Checkbox
                                color="primary"
                                checked={isItemSelected}
                                onChange={() =>
                                  handleRowClick(row.timesheetId, row.currentManagerCanValidate)
                                }
                              />
                            )}
                            {row.name}
                            {!row.isEditable && (
                              <Chip
                                label="Validé"
                                icon={<DoneIcon />}
                                size="small"
                                color="primary"
                                sx={{ marginLeft: 1 }}
                              />
                            )}{" "}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          {row.start}{" "}
                          {row.called && <PhoneInTalkIcon fontSize="small" color="primary" />}
                        </TableCell>
                        <TableCell>{row.end}</TableCell>
                        <TableCell align="center">{row.pause}</TableCell>
                        <TableCell align="center">{row.workDuration}</TableCell>
                        <TableCell align="center">{row.science}</TableCell>
                        <TableCell>{row.title}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <Dialog
        open={open}
        month={month}
        year={year}
        handleMonthChange={(event) => setMonth(event.target.value)}
        handleYearChange={(event) => setYear(event.target.value)}
        handleClose={handleClose}
        handleSelect={getTimesheets}
      />
      {loading && (
        <Box
          display={"flex"}
          flexDirection={"row"}
          width={"100%"}
          justifyContent={"center"}
          marginTop={"20vh"}
        >
          <CircularProgress />
        </Box>
      )}
    </div>
  );
};

export default Timesheet;
