import React, { useState, useEffect, useCallback } from "react";
import timesheetsApi from "../../../../services/timesheetsApi";

import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { toastSuccess } from "../../../../doc/ToastParams";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";

// Material UI
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import DoneIcon from "@mui/icons-material/Done";
import { Chip, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import useAuth from "../../../../hooks/useAuth";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const columns = [
  { id: "start", label: "Début", minWidth: 220, align: "left" },
  { id: "end", label: "Fin", minWidth: 200, align: "left" },
  { id: "pause", label: "Pause", minWidth: 130, align: "left" },
  { id: "workDuration", label: "Durée", minWidth: 130, align: "left" },
  { id: "science", label: "Scientifique", minWidth: 130, align: "left" },
  { id: "title", label: "Année", minWidth: 200, align: "left" },
  { id: "actions", label: "Modifier", minWidth: 150, align: "center" },
];

const SKELETON_ROWS = 5;

const Timesheet = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const { setSelectedMenuItem } = useAuth();

  const getTimesheets = useCallback(async () => {
    setLoading(true);

    try {
      const { method, url } = timesheetsApi.getOwnData();
      const request = await axiosPrivate[method](url);

      const workflow = [];
      request?.data?.forEach((item) => {
        const startTime = dayjs(item.dateOfStart);
        const endTime = dayjs(item.dateOfEnd);

        const totalDuration = endTime.diff(startTime, "minutes");
        const pauseDuration = item.pause ?? 0;
        const workDuration = totalDuration - pauseDuration;

        const hours = Math.floor(workDuration / 60);
        const minutes = workDuration % 60;

        workflow.push({
          id: item.id,
          isEditable: item.isEditable,
          start: dayjs(item.dateOfStart).format("DD-MM-YYYY, HH:mm"),
          end: dayjs(item.dateOfEnd).format("DD-MM-YYYY, HH:mm"),
          pause: item.pause !== 0 ? item.pause + " min" : 0,
          science: item.scientific !== 0 ? item.scientific + " min" : 0,
          title: item.title,
          called: item.called,
          workDuration: `${hours}h${minutes ? `${minutes}` : ""}`,
        });
      });
      setRows(workflow);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    getTimesheets();
  }, [getTimesheets]);

  const handleDelete = async (id) => {
    const originalRows = [...rows];
    setRows(rows.filter((row) => row.id !== id));

    try {
      const { method, url } = timesheetsApi.deleteTimesheet();
      await axiosPrivate[method](url + id);
      toast.success("Événement supprimé avec succès.", toastSuccess);
    } catch (error) {
      setRows(originalRows);
      handleApiError(error);
    }
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: "70vh" }}>
        <Table stickyHeader aria-label="tableau des horaires">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align as any}
                  style={{ minWidth: column.minWidth }}
                  variant="head"
                >
                  {loading ? (
                    <Skeleton variant="text" width="80%" />
                  ) : (
                    <Typography variant="subtitle1">{column.label}</Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton variant="text" width={column.id === "actions" ? 64 : "90%"} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    <TableCell>
                      {row.start}{" "}
                      {row.called && <PhoneInTalkIcon fontSize="small" color="primary" />}
                      {!row.isEditable && (
                        <Chip
                          label="Validé"
                          icon={<DoneIcon />}
                          size="small"
                          color="primary"
                          sx={{ marginLeft: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{row.end}</TableCell>
                    <TableCell>{row.pause}</TableCell>
                    <TableCell>{row.workDuration}</TableCell>
                    <TableCell>{row.science}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        aria-label="modifier"
                        onClick={() => {
                          navigate("/maccs/timer/" + row.id + "/timer");
                          setSelectedMenuItem("Mes horaires");
                        }}
                        disabled={!row.isEditable}
                      >
                        <EditIcon color={row.isEditable ? "primary" : "disabled"} />
                      </IconButton>
                      <IconButton
                        aria-label="supprimer"
                        onClick={() => handleDelete(row.id)}
                        disabled={!row.isEditable}
                      >
                        <DeleteIcon color={row.isEditable ? "error" : "disabled"} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default Timesheet;
