import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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

const ResidentParameters = ({ yearId }) => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();

  const columns = [
    { id: "name", label: t("yearDetail.staffPlanner.colName"), minWidth: 200, align: "left" },
    { id: "WorkerHRID", label: t("yearDetail.staffPlanner.colWorker"), minWidth: 150, align: "left" },
    { id: "SectionHRID", label: t("yearDetail.staffPlanner.colSection"), minWidth: 150, align: "left" },
    { id: "update", label: t("yearDetail.staffPlanner.colEdit"), minWidth: 100, align: "center" },
  ];
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
              {t("yearDetail.residentParams.title")}
            </Typography>
            <Typography color={"text.secondary"} marginBottom={2}>
              {t("yearDetail.residentParams.desc")}
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
                            {item?.WorkerHRID ? item?.WorkerHRID : t("yearDetail.staffPlanner.notDefined")}
                          </TableCell>
                          <TableCell>
                            {item?.WorkerHRID ? item?.SectionHRID : t("yearDetail.staffPlanner.notDefined")}
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
