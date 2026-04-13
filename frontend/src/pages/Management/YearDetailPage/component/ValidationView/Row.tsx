import React, { useState, useEffect } from "react";

import useValidationContext from "../../../../../hooks/useValidationContext";

//Material UI
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ClearIcon from "@mui/icons-material/Clear";
import DoneIcon from "@mui/icons-material/Done";
import Stack from "@mui/material/Stack";
import MessageIcon from "@mui/icons-material/Message";
import GroupsIcon from "@mui/icons-material/Groups";
import { Alert, Chip, FormControlLabel, FormGroup, Grid, Switch, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Divider from "@mui/material/Divider";

// General components
import { absenceTypeList, warningList } from "../../../../../doc/lists";
import MessageBox from "./MessageBox";
import dayjs from "@/lib/dayjs";

const Row = ({ residentReport, index, openRowId, setOpenRowId }) => {
  const theme = useTheme();
  const { residentValidationData, setResidentValidationData } = useValidationContext();

  // handle updates to the switch, manager comment and resident notification
  const [isSwitchOn, setSwitch] = useState(false);
  const [isResidentNotification, setIsResidentNotification] = useState(false);
  const [isManagerNotification, setIsManagerNotification] = useState(false);

  const residentData = residentValidationData?.find(
    (data) => data.residentId === residentReport.residentId
  );

  useEffect(() => {
    if (residentData) {
      setSwitch(residentData.status === "validate");
      setIsResidentNotification(residentData.residentNotification !== "");
      setIsManagerNotification(residentData.managerComment !== "");
    }
  }, [residentData]);

  const handleSwitchChange = () => {
    setSwitch(!isSwitchOn);
    const updatedData = residentValidationData.map((data) =>
      data.residentId === residentReport.residentId
        ? {
            ...data,
            status: isSwitchOn ? "invalidate" : "validate",
          }
        : data
    );
    setResidentValidationData(updatedData);
  };

  ///////////////////////////////////////////////////////

  const handleCollapse = () => {
    setOpenRowId(openRowId === index ? -1 : index);
  };

  const convertDecimalToHours = (decimal) => {
    const hours = Math.floor(decimal);
    const mins = Math.round((decimal - hours) * 60);
    return `${hours}h${mins < 10 ? "0" : ""}${mins}`;
  };

  const [totalLeaves, setTotalLeaves] = useState(0);

  // Dialog

  const [openDialog, setOpenDialog] = useState(false);
  const [notificationType, setNotificationType] = useState("");

  useEffect(() => {
    let total = 0;
    for (const leaveType in residentReport.daysOfLeaves) {
      total += residentReport.daysOfLeaves[leaveType];
    }
    setTotalLeaves(total);
  }, [residentReport]);

  return (
    <React.Fragment>
      <TableRow
        sx={{
          borderLeft: openRowId === index ? `3px solid ${theme.palette.primary.main}` : "unset",
        }}
        hover
      >
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => handleCollapse()}>
            {openRowId === index ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {residentReport?.residentFirstname} {residentReport?.residentLastname}{" "}
          <Tooltip title="Notification au MACCS">
            <IconButton
              onClick={() => {
                setOpenDialog(true);
                setNotificationType("ResidentNotification");
              }}
            >
              <MessageIcon color={isResidentNotification ? "primary" : ""} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Notification aux Managers">
            <IconButton
              onClick={() => {
                setOpenDialog(true);
                setNotificationType("ManagerNotification");
              }}
            >
              <GroupsIcon color={isManagerNotification ? "primary" : ""} />
            </IconButton>
          </Tooltip>
        </TableCell>
        <TableCell align="right">
          <Grid container justifyContent="flex-end">
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={isSwitchOn} onChange={handleSwitchChange} />}
                label="Valider"
              />
            </FormGroup>
          </Grid>
        </TableCell>
      </TableRow>

      <TableRow
        sx={{
          borderLeft: openRowId === index ? `3px solid ${theme.palette.primary.main}` : "unset",
        }}
      >
        <TableCell style={{ padding: 0 }} colSpan={6}>
          <Collapse in={openRowId === index} timeout={0} unmountOnExit>
            <Grid container spacing={2} padding={(5, 2, 2, 2)}>
              <Grid item xs={12} md={12}>
                <Typography gutterBottom component="div" fontWeight={600}>
                  Informations générales
                </Typography>
                <Divider />

                <Table size={"small"}>
                  <TableBody>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Opting Out:
                      </TableCell>
                      <TableCell align="center" style={{ border: "none", width: 20 }}>
                        <Chip
                          color="primary"
                          size="small"
                          label={residentReport?.optingOut ? "OUI" : "NON"}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Temps de travail maximum:
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                          color: theme.palette.primary.main,
                        }}
                      >
                        <Typography color={theme.palette.primary.main}>
                          {residentReport?.limits?.limit}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Temps de travail maximum absolue:
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {residentReport?.limits?.highLimit}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Nombre d'interval:
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {residentReport?.periodsinfo?.length}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {residentReport?.periodsinfo?.map((period, index) => (
                  <Alert key={index} severity="primary" sx={{ marginTop: 1 }}>
                    <Typography>Période n° {period?.periodNumber}</Typography>
                    <Typography>
                      Début d'interval: {dayjs(period?.periodStart).format("DD-MM-YYYY")}
                    </Typography>
                    <Typography>
                      Fin d'interval: {dayjs(period?.periodEnd).format("DD-MM-YYYY")}
                    </Typography>
                  </Alert>
                ))}
              </Grid>
              <Grid item xs={12} md={12}>
                <Typography gutterBottom component="div" fontWeight={600}>
                  Heures prestées
                </Typography>
                <Divider />

                <Table size={"small"}>
                  <TableBody>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Lissage des heures respecté?{" "}
                      </TableCell>
                      <TableCell align="center" style={{ border: "none", width: 20 }}>
                        <Chip
                          color={residentReport?.smoothedHours ? "success" : "error"}
                          icon={residentReport?.smoothedHours ? <DoneIcon /> : <ClearIcon />}
                          size="small"
                          label={residentReport?.smoothedHours ? "OUI" : "NON"}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Respect des heures maximum autorisé?
                      </TableCell>
                      <TableCell align="center" style={{ border: "none" }}>
                        <Chip
                          color={
                            Object.keys(residentReport?.warningHours || {}).length > 1
                              ? "error"
                              : "success"
                          }
                          icon={
                            Object.keys(residentReport?.warningHours || {}).length > 1 ? (
                              <ClearIcon />
                            ) : (
                              <DoneIcon />
                            )
                          }
                          size="small"
                          label={
                            Object.keys(residentReport?.warningHours || {}).length > 1
                              ? "NON"
                              : "OUI"
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Respect des heures maximum absolue?
                      </TableCell>
                      <TableCell align="center" style={{ border: "none", width: 20 }}>
                        <Chip
                          color={
                            Object.keys(residentReport?.IllegalHours || {}).length > 0
                              ? "error"
                              : "success"
                          }
                          icon={
                            Object.keys(residentReport?.IllegalHours || {}).length === 0 ? (
                              <DoneIcon />
                            ) : (
                              <ClearIcon />
                            )
                          }
                          size="small"
                          label={
                            Object.keys(residentReport?.IllegalHours || {}).length > 0
                              ? "NON"
                              : "OUI"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>

              <Grid item xs={12} md={12} className="absences">
                <Typography gutterBottom component="div" fontWeight={600}>
                  Absences
                </Typography>
                <Divider />
                <Table size={"small"}>
                  <TableBody>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Nombre total (jours):
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                          color: theme.palette.primary.main,
                          width: 20,
                        }}
                      >
                        <Typography color={theme.palette.primary.main}>{totalLeaves}</Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {totalLeaves > 0 && (
                  <Alert severity="primary" sx={{ marginTop: 1 }}>
                    {" "}
                    {Object.entries(residentReport.daysOfLeaves).map(
                      ([leaveType, numberOfDays]) => (
                        <Stack
                          key={leaveType}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          spacing={1}
                        >
                          <Typography>{absenceTypeList[leaveType]}:</Typography>
                          <Typography color={theme.palette.primary.main}>
                            {" "}
                            {numberOfDays} jour(s)
                          </Typography>
                        </Stack>
                      )
                    )}
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12} md={12} className="Garde">
                <Typography gutterBottom component="div" fontWeight={600}>
                  Gardes
                </Typography>
                <Divider />
                <Table size={"small"}>
                  <TableBody>
                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Nombre de garde appelable:
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                          width: 20,
                          color: theme.palette.primary.main,
                        }}
                      >
                        <Typography color={theme.palette.primary.main}>
                          {residentReport?.callable}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Nombre de garde sur place:
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                        }}
                      >
                        <Typography color={theme.palette.primary.main}>
                          {residentReport?.hospital}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell align="left" style={{ border: "none" }}>
                        Conflit de garde?
                      </TableCell>
                      <TableCell
                        align="center"
                        style={{
                          border: "none",
                        }}
                      >
                        <Chip
                          color={residentReport?.shiftOverlap > 0 ? "error" : "success"}
                          icon={residentReport?.shiftOverlap > 0 ? <ClearIcon /> : <DoneIcon />}
                          size="small"
                          label={residentReport?.shiftOverlap > 0 ? "OUI" : "NON"}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>

              <Grid item xs={12} md={12} className="Alerte">
                <Typography gutterBottom component="div" fontWeight={600}>
                  Alerte
                </Typography>
                <Divider />
                {residentReport?.warnings?.map((warning, i) => (
                  <Alert
                    key={i}
                    severity={warning?.warningType === "minLimit" ? "info" : "error"}
                    sx={{ marginTop: 1 }}
                  >
                    <Typography>Type d'erreur: {warningList[warning?.warningType]}</Typography>
                    {warning?.warningType === "minLimit" && (
                      <>
                        {" "}
                        <Typography>
                          Nombre d'heures: {convertDecimalToHours(warning?.NumberOfHours)}
                        </Typography>
                        <Typography>Numéro de la semaine: {warning?.week}</Typography>
                        <Typography>
                          Début de semaine: {dayjs(warning?.startDate).format("DD-MM-YYYY")}
                        </Typography>
                        <Typography>
                          Fin de semaine: {dayjs(warning?.endDate).format("DD-MM-YYYY")}
                        </Typography>
                      </>
                    )}
                    {warning?.warningType === "overruns" && (
                      <>
                        {" "}
                        <Typography>Période: N°{warning?.period}</Typography>
                        <Typography>
                          Début de période: {dayjs(warning?.startDate).format("DD-MM-YYYY")}
                        </Typography>
                        <Typography>
                          Fin de période: {dayjs(warning?.endDate).format("DD-MM-YYYY")}
                        </Typography>
                      </>
                    )}
                    {warning?.warningType === "smoothing" && (
                      <>
                        {" "}
                        <Typography>Période: N°{warning?.period}</Typography>
                        <Typography>
                          Début de période: {dayjs(warning?.startDate).format("DD-MM-YYYY")}
                        </Typography>
                        <Typography>
                          Fin de période: {dayjs(warning?.endDate).format("DD-MM-YYYY")}
                        </Typography>
                      </>
                    )}
                    {warning?.warningType === "maxLimit" && (
                      <>
                        {" "}
                        <Typography>
                          Nombre d'heures: {convertDecimalToHours(warning?.NumberOfHours)}
                        </Typography>
                        <Typography>Numéro de la semaine: {warning?.week}</Typography>
                        <Typography>
                          Début de semaine: {dayjs(warning?.startDate).format("DD-MM-YYYY")}
                        </Typography>
                        <Typography>
                          Fin de semaine: {dayjs(warning?.endDate).format("DD-MM-YYYY")}
                        </Typography>
                      </>
                    )}
                  </Alert>
                ))}
              </Grid>

              <Grid item xs={12} md={12}>
                <Divider marginBottom={2} />
                <Grid container spacing={2} paddingTop={2}></Grid>
              </Grid>
            </Grid>
          </Collapse>
        </TableCell>

        <Divider />
      </TableRow>

      <MessageBox
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        notificationType={notificationType}
        residentId={residentReport.residentId}
      />
    </React.Fragment>
  );
};

export default Row;
