import React, { useState, useEffect, useCallback } from "react";
import { Button, Typography } from "@mui/material";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import managersApi from "../../../../../services/managersApi";

// Material UI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import EditIcon from "@mui/icons-material/Edit";
import SenderDialog from "./SenderDialog";
import { CircularProgress } from "@mui/material";
import { handleApiError } from "@/services/apiError";

const columns = [
  { id: "name", label: "Nom", minWidth: 200, align: "left" },
  { id: "WorkerHRID", label: "Matricule", minWidth: 150, align: "left" },
  { id: "SectionHRID", label: "Section", minWidth: 150, align: "left" },
  { id: "update", label: "Modifier", minWidth: 100, align: "center" },
];

const ResidentParameters = ({ yearId }) => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [relation, setRelation] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getList = useCallback(async () => {
    setLoading(true);

    try {
      const { method, url } = managersApi.fetchStaffPlannerList();
      const request = await axiosPrivate[method](url + yearId);
      setList(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, yearId]);

  // Slide in Dialog
  const [open, setOpen] = useState(false);

  const handleClickOpen = (relationId, WorkerHRID, SectionHRID) => {
    setOpen(true);
    setRelation({
      ...relation,
      relationId: relationId,
      workerHRID: WorkerHRID,
      sectionHRID: SectionHRID,
    });
  };
  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    getList();
  }, [getList]);
  return (
    <>
      <Box>
        <Box
          display={"flex"}
          flexDirection={{ xs: "column", sm: "row" }}
          flex={"1 1 100%"}
          justifyContent={{ sm: "space-between" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          marginBottom={4}
        >
          <Box marginBottom={{ xs: 2, sm: 0 }} sx={{ width: "100%" }}>
            <Typography variant={"h6"} fontWeight={700}>
              Renseignements généraux
            </Typography>
            <Typography color={"text.secondary"} marginBottom={2}>
              Renseignez les informations concernant vos MACCS. Ceci permettra un calcul correct.
            </Typography>
            <Paper
              sx={{
                minWidth: "100%",
                overflow: "hidden",
              }}
            >
              {!loading && (
                <TableContainer sx={{ maxHeight: "60vh" }}>
                  <Table stickyHeader aria-label="sticky table" sx={{ width: "100%" }}>
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
                    <TableBody>
                      {list?.map((item) => (
                        <TableRow role="checkbox" tabIndex={-1} key={item.id}>
                          <TableCell>{item?.lastname + " " + item?.firstname}</TableCell>
                          <TableCell>
                            {item?.WorkerHRID ? item?.WorkerHRID : "Non défini"}
                          </TableCell>
                          <TableCell>
                            {item?.WorkerHRID ? item?.SectionHRID : "Non défini"}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              onClick={() =>
                                handleClickOpen(item?.id, item?.WorkerHRID, item?.SectionHRID)
                              }
                            >
                              <EditIcon sx={{ color: "primary.main" }} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {loading && (
                <Box
                  position={"relative"}
                  display={"flex"}
                  justifyContent={"center"}
                  alignItems="center"
                  minHeight={"20vh"}
                >
                  <CircularProgress />
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
      <SenderDialog
        handleClickOpen={handleClickOpen}
        handleClose={handleClose}
        fetchStaffPlannerList={getList}
        relation={relation}
        open={open}
      />
    </>
  );
};

export default ResidentParameters;
