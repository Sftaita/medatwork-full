import React, { useState, useEffect, useCallback } from "react";
import absencesApi from "../../../../services/absencesApi";

import { monthList } from "../../../../doc/lists";
import { absenceTypeList } from "../../../../doc/lists";
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
import { Toolbar, Checkbox, Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DoneIcon from "@mui/icons-material/Done";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";

//
import Dialog from "./Dialog";
import AbsenceValidationButton from "./AbsenceValidationButton";

// General components
import { specialityAbreviation } from "../../../../doc/lists";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "name", label: "Nom", minWidth: 200, align: "left" },
  { id: "start", label: "Début", minWidth: 150, align: "left" },
  { id: "end", label: "Fin", minWidth: 150, align: "left" },
  { id: "type", label: "Type", minWidth: 200, align: "left" },
  { id: "title", label: "Année", minWidth: 200, align: "left" },
];

const Absence = ({ month, setMonth, year, setYear }) => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [absences, setAbsences] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleRowClick = (absenceId, canValidate) => {
    if (!canValidate) return;

    const newSelectedRows = [...selectedRows];
    if (newSelectedRows.includes(absenceId)) {
      const index = newSelectedRows.indexOf(absenceId);
      newSelectedRows.splice(index, 1);
    } else {
      newSelectedRows.push(absenceId);
    }
    setSelectedRows(newSelectedRows);
  };

  const isSelected = (absenceId) => selectedRows.indexOf(absenceId) !== -1;

  const getAbsences = useCallback(async () => {
    setLoading(true);
    setOpen(false);

    try {
      const { method, url } = absencesApi.getResidentData();
      const request = await axiosPrivate[method](url + month + "" + year);

      if (request.data) {
        const workflow = [];
        request?.data.map((item) => {
          const t = {
            absenceId: item.id,
            name: item.lastname.toUpperCase() + " " + item.firstname,
            start: dayjs(item.dateOfStart).format("DD-MM-YYYY"),
            end: item.dateOfEnd ? dayjs(item.dateOfEnd).format("DD-MM-YYYY") : null,
            type: item.type,
            title: item.title,
            speciality: specialityAbreviation[item.speciality],
            isEditable: item.isEditable,
            currentManagerCanValidate: item.currentManagerCanViladate,
          };
          workflow.push(t);
        });
        setAbsences(workflow);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, month, year]);

  useEffect(() => {
    getAbsences();
  }, [getAbsences]);

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

  const filteredAbsences = absences.filter(
    (absences) =>
      normalizeText(absences.name).includes(normalizeText(searchText)) ||
      normalizeText(absences.title).includes(normalizeText(searchText)) ||
      (absences.speciality &&
        normalizeText(absences.speciality).includes(normalizeText(searchText)))
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
                <AbsenceValidationButton
                  selected={selectedRows}
                  setSelectedRows={setSelectedRows}
                  absences={absences}
                  setAbsences={setAbsences}
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
                {filteredAbsences.lentgh !== 0 &&
                  filteredAbsences.map((row) => {
                    const isItemSelected = isSelected(row?.absenceId);
                    return (
                      <TableRow
                        hover
                        role="checkbox"
                        tabIndex={-1}
                        key={row.id}
                        selected={isItemSelected}
                        onClick={() => handleRowClick(row.absenceId, row.currentManagerCanValidate)}
                      >
                        <TableCell>
                          <Stack direction="row" justifyContent="flex-start" alignItems="center">
                            {row?.currentManagerCanValidate && (
                              <Checkbox
                                color="primary"
                                checked={isItemSelected}
                                onChange={() =>
                                  handleRowClick(row.absenceId, row.currentManagerCanValidate)
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
                        <TableCell>{row.start}</TableCell>
                        <TableCell>{row.end}</TableCell>
                        <TableCell align="left">{absenceTypeList[row.type]}</TableCell>
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
        handleSelect={getAbsences}
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

export default Absence;
