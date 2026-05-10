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
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Toolbar } from "@mui/material";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { Stack } from "@mui/system";
import { handleApiError } from "@/services/apiError";

const columns = [
  { id: "title",  label: "Année",             minWidth: 250, align: "left" },
  { id: "period", label: "Périodes",           minWidth: 150, align: "left" },
  { id: "master", label: "Maître de stage",    minWidth: 200, align: "left" },
  { id: "year",   label: "En attente depuis",  minWidth: 150, align: "left" },
];

const InWaiting = () => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [activeYearChecked, setActiveYearChecked] = useState(true);

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

  const getLastDayOfMonth = (year, month) => new Date(year, month, 0);

  const handleCheck = (event) => {
    setActiveYearChecked(event.target.checked);
    getInWaintingList(event.target.checked);
  };

  useEffect(() => {
    getInWaintingList(true);
  }, [getInWaintingList]);

  return (
    <div style={{ height: "40vh", width: "100%" }}>
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
                {list.length !== 0 &&
                  list.map((row) => (
                    <TableRow hover tabIndex={-1} key={row.periodId}>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{monthList[row.month] + " " + row.year}</TableCell>
                      <TableCell>
                        {row?.masterLastname
                          ? row.masterLastname + " " + row.masterFirstname
                          : "Non défini"}
                      </TableCell>
                      <TableCell>
                        {dayjs(getLastDayOfMonth(row.year, row.month))
                          .locale("fr")
                          .from(dayjs(), true)}
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

export default InWaiting;
