import React, { useState, useEffect, useCallback } from "react";
import gardesApi from "../../../../services/gardesApi";

import { monthList } from "../../../../doc/lists";
import { gardeTypeList } from "../../../../doc/lists";
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
import Grid from "@mui/material/Grid";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import Input from "@mui/material/Input";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";

import DoneIcon from "@mui/icons-material/Done";

//
import Dialog from "./Dialog";
import GardeValidationButton from "./GardeValidationButton";

// General components
import { specialityAbreviation } from "../../../../doc/lists";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "name", label: "Nom", minWidth: 200, align: "left" },
  { id: "start", label: "Début", minWidth: 150, align: "center" },
  { id: "end", label: "Fin", minWidth: 150, align: "center" },
  { id: "type", label: "Type", minWidth: 130, align: "left" },
  { id: "comment", label: "Commentaire", minWidth: 150, align: "left" },
  { id: "title", label: "Année", minWidth: 200, align: "left" },
];

const Garde = ({ month, setMonth, year, setYear }) => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [gardes, setGardes] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleRowClick = (gardeId, canValidate) => {
    if (!canValidate) return;

    const newSelectedRows = [...selectedRows];
    if (newSelectedRows.includes(gardeId)) {
      const index = newSelectedRows.indexOf(gardeId);
      newSelectedRows.splice(index, 1);
    } else {
      newSelectedRows.push(gardeId);
    }
    setSelectedRows(newSelectedRows);
  };

  const isSelected = (gardeId) => selectedRows.indexOf(gardeId) !== -1;

  const getGardes = useCallback(async () => {
    setLoading(true);
    setOpen(false);

    try {
      const { method, url } = gardesApi.getResidentData();
      const request = await axiosPrivate[method](url + month + "" + year);

      if (request.data) {
        const workflow = [];
        request?.data.map((item) => {
          const t = {
            gardeId: item.id,
            name: item.lastname.toUpperCase() + " " + item.firstname,
            start: dayjs(item.dateOfStart).format("DD-MM-YYYY, HH:mm"),
            end: dayjs(item.dateOfEnd).format("DD-MM-YYYY, HH:mm"),
            type: item.type,
            comment: item.comment,
            title: item.title,
            speciality: specialityAbreviation[item.speciality],
            isEditable: item.isEditable,
            currentManagerCanValidate: item.currentManagerCanViladate,
          };
          workflow.push(t);
        });
        setGardes(workflow);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, month, year]);

  useEffect(() => {
    getGardes();
  }, [getGardes]);

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

  const filteredGardes = gardes.filter(
    (gardes) =>
      normalizeText(gardes.name).includes(normalizeText(searchText)) ||
      normalizeText(gardes.title).includes(normalizeText(searchText)) ||
      (gardes.speciality && normalizeText(gardes.speciality).includes(normalizeText(searchText)))
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
                <GardeValidationButton
                  selected={selectedRows}
                  setSelectedRows={setSelectedRows}
                  gardes={gardes}
                  setGardes={setGardes}
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
                {filteredGardes.lentgh !== 0 &&
                  filteredGardes.map((row) => {
                    const isItemSelected = isSelected(row?.gardeId);
                    return (
                      <TableRow
                        hover
                        role="checkbox"
                        tabIndex={-1}
                        key={row.gardeId}
                        selected={isItemSelected}
                        onClick={() => handleRowClick(row.gardeId, row.currentManagerCanValidate)}
                      >
                        <TableCell>
                          <Stack direction="row" justifyContent="flex-start" alignItems="center">
                            {row?.currentManagerCanValidate && (
                              <Checkbox
                                color="primary"
                                checked={isItemSelected}
                                onChange={() =>
                                  handleRowClick(row.gardeId, row.currentManagerCanValidate)
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
                        <TableCell align="center">{row.start}</TableCell>
                        <TableCell align="center">{row.end}</TableCell>
                        <TableCell>{gardeTypeList[row.type]}</TableCell>
                        <TableCell>{row.comment}</TableCell>
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
        handleSelect={getGardes}
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

export default Garde;
