import React, { useState, useEffect, useCallback } from "react";
import { gardeTypeList } from "../../../../doc/lists";
import gardesApi from "../../../../services/gardesApi";

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

const columns = [
  { id: "start", label: "Début", minWidth: 200, align: "left" },
  { id: "end", label: "Fin", minWidth: 200, align: "left" },
  { id: "type", label: "Type", minWidth: 130, align: "left" },
  { id: "comment", label: "Commentaire", minWidth: 150, align: "left" },
  { id: "title", label: "Année", flex: 1, align: "left" },
  { id: "actions", label: "Supprimer", minWidth: 50, align: "center" },
];

const SKELETON_ROWS = 5;

const Garde = () => {
  const axiosPrivate = useAxiosPrivate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getGardes = useCallback(async () => {
    setLoading(true);
    try {
      const { method, url } = gardesApi.getOwnData();
      const request = await axiosPrivate[method](url);

      const workflow = [];
      request?.data?.forEach((item) => {
        workflow.push({
          id: item.id,
          isEditable: item.isEditable,
          start: dayjs(item.dateOfStart).format("DD-MM-YYYY, HH:mm"),
          end: dayjs(item.dateOfEnd).format("DD-MM-YYYY, HH:mm"),
          type: item.type,
          title: item.title,
          comment: item.comment,
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
    getGardes();
  }, [getGardes]);

  const handleDelete = async (id) => {
    const originalRows = [...rows];
    setRows(rows.filter((row) => row.id !== id));

    try {
      const { method, url } = gardesApi.deleteGarde();
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
        <Table stickyHeader aria-label="tableau des gardes">
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
                      {row.start}{" "}
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
                    <TableCell>{gardeTypeList[row.type]}</TableCell>
                    <TableCell>{row.comment}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell align="center">
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

export default Garde;
