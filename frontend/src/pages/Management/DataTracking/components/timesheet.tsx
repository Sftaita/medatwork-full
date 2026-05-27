import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import timesheetsApi from "../../../../services/timesheetsApi";
import { T, C, bodyRowSx } from "../../../../styles/tableStyles";
import { useTableDensity } from "../../../../hooks/useTableDensity";
import { DensityToggleButton } from "../../../../components/DensityToggleButton";

import { monthList } from "../../../../doc/lists";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

// Material UI
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { Checkbox, Chip } from "@mui/material";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DoneIcon from "@mui/icons-material/Done";
import Stack from "@mui/material/Stack";

import Dialog from "./Dialog";
import OptionsButton from "./OptionsButton";

import { specialityAbreviation } from "../../../../doc/lists";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const Timesheet = ({ month, setMonth, year, setYear, search }) => {
  const { t } = useTranslation();
  const { density, cycleDensity } = useTableDensity();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const columns = [
    { id: "name",        label: t("data.col.name"),       minWidth: 200, align: "left" as const },
    { id: "start",       label: t("data.col.start"),      minWidth: 110, align: "left" as const },
    { id: "end",         label: t("data.col.end"),        minWidth: 110, align: "left" as const },
    { id: "pause",       label: t("data.col.pause"),      minWidth: 80,  align: "center" as const },
    { id: "workingTime", label: t("data.col.duration"),   minWidth: 80,  align: "center" as const },
    { id: "science",     label: t("data.col.scientific"), minWidth: 110, align: "center" as const },
    { id: "title",       label: t("data.col.year"),       minWidth: 180, align: "left" as const },
  ];

  const handleRowClick = (timesheetId, canValidate) => {
    if (!canValidate) return;
    const next = [...selectedRows];
    const idx = next.indexOf(timesheetId);
    if (idx !== -1) next.splice(idx, 1);
    else next.push(timesheetId);
    setSelectedRows(next);
  };

  const isSelected = (id) => selectedRows.includes(id);

  const getTimesheets = useCallback(async () => {
    setLoading(true);
    setOpen(false);
    try {
      const { method, url } = timesheetsApi.getResidentData();
      const request = await axiosPrivate[method](url + month + "" + year);
      if (request.data) {
        const workflow = request.data.map((item) => {
          const startTime = dayjs(item.dateOfStart);
          const endTime = dayjs(item.dateOfEnd);
          const totalDuration = endTime.diff(startTime, "minutes");
          const pauseDuration = item.pause ? item.pause : 0;
          const workDuration = totalDuration - pauseDuration;
          const hours = Math.floor(workDuration / 60);
          const minutes = workDuration % 60;
          return {
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
        });
        setTimesheets(workflow);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, month, year]);

  useEffect(() => { getTimesheets(); }, [getTimesheets]);

  const normalizeText = (text: string) =>
    text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const q = search ? normalizeText(search) : "";
  const filtered = timesheets.filter(
    (r) =>
      !q ||
      normalizeText(r.name).includes(q) ||
      normalizeText(r.title).includes(q) ||
      (r.speciality && normalizeText(r.speciality).includes(q))
  );

  return (
    <Box>
      {loading && (
        <Box display="flex" justifyContent="center" mt="20vh">
          <CircularProgress />
        </Box>
      )}
      {!loading && (
        <Box sx={T.card}>
          {/* Toolbar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              px: "18px",
              py: "12px",
              borderBottom: `1px solid ${C.line}`,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => setOpen(true)}
              startIcon={<KeyboardArrowDownIcon />}
              sx={{ borderRadius: "8px", textTransform: "none", fontSize: 13 }}
            >
              {monthList[month] + " " + year}
            </Button>
            <Box display="flex" alignItems="center" gap={1}>
              <DensityToggleButton density={density} onCycle={cycleDensity} />
              <OptionsButton
                selected={selectedRows}
                setSelectedRows={setSelectedRows}
                setLoading={setLoading}
                timesheets={timesheets}
                setTimesheets={setTimesheets}
              />
            </Box>
          </Box>

          {/* Table */}
          <TableContainer sx={{ maxHeight: "60vh" }}>
            <Table sx={T.table} stickyHeader size="small">
              <TableHead>
                <TableRow sx={T.headRow}>
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align} style={{ minWidth: col.minWidth }}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => {
                  const sel = isSelected(row.timesheetId);
                  return (
                    <TableRow
                      key={row.timesheetId}
                      sx={{
                        ...bodyRowSx(density),
                        ...(sel ? { bgcolor: `${C.brand50} !important` } : {}),
                      }}
                      onClick={() => handleRowClick(row.timesheetId, row.currentManagerCanValidate)}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          {row.currentManagerCanValidate && (
                            <Checkbox
                              size="small"
                              color="primary"
                              checked={sel}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleRowClick(row.timesheetId, row.currentManagerCanValidate)}
                            />
                          )}
                          <Box sx={{ fontWeight: 600, color: C.ink, fontSize: "inherit" }}>
                            {row.name}
                          </Box>
                          {!row.isEditable && (
                            <Chip
                              label={t("data.validated")}
                              icon={<DoneIcon />}
                              size="small"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {row.start}
                        {row.called && <PhoneInTalkIcon fontSize="small" color="primary" sx={{ ml: 0.5, verticalAlign: "middle" }} />}
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

          {/* Footer */}
          <Box sx={T.footer}>
            <Typography variant="caption" sx={{ color: C.ink3 }}>
              {filtered.length} / {timesheets.length}
            </Typography>
          </Box>
        </Box>
      )}

      <Dialog
        open={open}
        month={month}
        year={year}
        handleMonthChange={(e) => setMonth(e.target.value)}
        handleYearChange={(e) => setYear(e.target.value)}
        handleClose={() => setOpen(false)}
        handleSelect={getTimesheets}
      />
    </Box>
  );
};

export default Timesheet;
