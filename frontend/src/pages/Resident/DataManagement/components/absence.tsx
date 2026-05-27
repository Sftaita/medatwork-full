import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import absencesApi from "../../../../services/absencesApi";

import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { toastSuccess } from "../../../../doc/ToastParams";
import { toast } from "react-toastify";

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
import DoneIcon from "@mui/icons-material/Done";
import { Chip, IconButton } from "@mui/material";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const SKELETON_ROWS = 5;

const Absence = () => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();

  const columns = [
    { id: "start",   label: t("data.col.start"),  minWidth: 200, align: "left"   },
    { id: "end",     label: t("data.col.end"),    minWidth: 200, align: "left"   },
    { id: "type",    label: t("data.col.type"),   minWidth: 130, align: "left"   },
    { id: "title",   label: t("data.col.year"),   flex: 1,       align: "left"   },
    { id: "actions", label: t("data.col.delete"), minWidth: 150, align: "center" },
  ];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAbsences = useCallback(async () => {
    setLoading(true);

    try {
      const { method, url } = absencesApi.getOwnData();
      const request = await axiosPrivate[method](url);

      const workflow = [];
      request?.data?.forEach((item) => {
        workflow.push({
          id: item.id,
          isEditable: item.isEditable,
          start: dayjs(item.dateOfStart).format("DD-MM-YYYY"),
          end: item.dateOfEnd ? dayjs(item.dateOfEnd).format("DD-MM-YYYY") : null,
          type: item.type,
          title: item.title,
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
    getAbsences();
  }, [getAbsences]);

  const handleDelete = async (id) => {
    const originalRows = [...rows];
    setRows(rows.filter((row) => row.id !== id));

    try {
      const { method, url } = absencesApi.deleteAbsence();
      await axiosPrivate[method](url + id);
      toast.success(t("data.deleted"), toastSuccess);
    } catch (error) {
      setRows(originalRows);
      handleApiError(error);
    }
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: "70vh" }}>
        <Table stickyHeader aria-label={t("data.tabs.absences")}>
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
                        <Skeleton variant="text" width={column.id === "actions" ? 40 : "90%"} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    <TableCell>
                      {row.start}
                      {!row.isEditable && (
                        <Chip
                          label={t("data.validated")}
                          icon={<DoneIcon />}
                          size="small"
                          color="primary"
                          sx={{ marginLeft: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{row.end}</TableCell>
                    <TableCell>{t(`timer.absence.${row.type}`)}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        aria-label={t("data.col.delete")}
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

export default Absence;
