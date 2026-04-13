import React, { useState, useEffect } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import yearsApi from "../../../../../services/yearsApi";
import { toast } from "react-toastify";

//Material UI
import AddTaskIcon from "@mui/icons-material/AddTask";
import CloseIcon from "@mui/icons-material/Close";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { Button, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Divider from "@mui/material/Divider";

// General components
import CustomSwitch from "../../../../../components/small/CustomSwitch";
import DateHandler from "../../../../../components/medium/DateHandler";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import { handleApiError } from "@/services/apiError";

function Row(props) {
  const { row, index, openRowId, setOpenRowId, yearId, adminRights, fetchResidentList } = props;
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();

  // Data
  const [dateOfStart, setDateOfStart] = useState(row?.dateOfStart);
  const [optingOut, setOptingOut] = useState(row?.optingOut);
  const [legalLeaves, setLegalLeaves] = useState(row?.legalLeaves);
  const [scientificLeaves, setScientificLeaves] = useState(row?.scientificLeaves);
  const [maternityLeaves, setMaternityLeaves] = useState(row?.maternityLeaves);
  const [paternityLeaves, setPaternityLeaves] = useState(row?.paternityLeaves);
  const [unpaidLeaves, setUnpaidLeaves] = useState(row?.unpaidLeavesLeaves);
  const [allowed, setAllowed] = useState(row?.allowed);

  const [updatedValue, setUpdatedValue] = useState({
    dateOfStart: row?.dateOfStart,
    optingOut: row?.optingOut,
    legalLeaves: row?.legalLeaves,
    scientificLeaves: row?.scientificLeaves,
    maternityLeaves: row?.maternityLeaves,
    paternityLeaves: row?.paternityLeaves,
    unpaidLeaves: row?.unpaidLeavesLeaves,
  });

  // YearResident Updtates
  const handleUpdateResident = async () => {
    const data = {
      optingOut: optingOut,
      dateOfStart: dateOfStart,
      legalLeaves: legalLeaves,
      scientificLeaves: scientificLeaves,
      maternityLeaves: maternityLeaves,
      paternityLeaves: paternityLeaves,
      unpaidLeaves: unpaidLeaves,
    };

    setOpenRowId(-1);
    setIsModified(false);
    toast.success("Mise à jour", toastSuccess);

    try {
      const { method, url } = yearsApi.updateYearResident();
      setUpdatedValue(data);
      await axiosPrivate[method](url + row.yearResidentId, data);
    } catch (error) {
      handleApiError(error);
      toast.error("Oops, une erreur c'est produite", toastError);

      setDateOfStart(row?.dateOfStart);
      setOptingOut(row?.optingOut);
      setLegalLeaves(row?.legalLeaves);
      setScientificLeaves(row?.scientificLeaves);
      setMaternityLeaves(row?.maternityLeaves);
      setPaternityLeaves(row?.paternityLeaves);
      setUnpaidLeaves(row?.unpaidLeaves);
    }
  };

  const handleClose = () => {
    setOpenRowId(-1);

    setDateOfStart(updatedValue?.dateOfStart);
    setOptingOut(updatedValue?.optingOut);
    setLegalLeaves(updatedValue?.legalLeaves);
    setScientificLeaves(updatedValue?.scientificLeaves);
    setMaternityLeaves(updatedValue?.maternityLeaves);
    setPaternityLeaves(updatedValue?.paternityLeaves);
    setUnpaidLeaves(updatedValue?.unpaidLeaves);
  };

  const handleCollapse = () => {
    setOpenRowId(openRowId === index ? -1 : index);

    setDateOfStart(updatedValue?.dateOfStart);
    setOptingOut(updatedValue?.optingOut);
    setLegalLeaves(updatedValue?.legalLeaves);
    setScientificLeaves(updatedValue?.scientificLeaves);
    setMaternityLeaves(updatedValue?.maternityLeaves);
    setPaternityLeaves(updatedValue?.paternityLeaves);
    setUnpaidLeaves(updatedValue?.unpaidLeaves);
  };

  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    if (
      dateOfStart !== updatedValue?.dateOfStart ||
      optingOut !== updatedValue?.optingOut ||
      legalLeaves !== updatedValue?.legalLeaves ||
      scientificLeaves !== updatedValue?.scientificLeaves ||
      maternityLeaves !== updatedValue?.maternityLeaves ||
      paternityLeaves !== updatedValue?.paternityLeaves ||
      unpaidLeaves !== updatedValue?.paternityLeaves
    ) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
  }, [
    dateOfStart,
    optingOut,
    legalLeaves,
    scientificLeaves,
    maternityLeaves,
    paternityLeaves,
    unpaidLeaves,
    updatedValue?.dateOfStart,
    updatedValue?.optingOut,
    updatedValue?.legalLeaves,
    updatedValue?.scientificLeaves,
    updatedValue?.maternityLeaves,
    updatedValue?.paternityLeaves,
  ]);

  // Invitation controller
  const acceptResident = async (residentId) => {
    setAllowed(true);
    const relation = {
      yearId: yearId,
      residentId: residentId,
      status: true,
    };

    const { method, url } = yearsApi.UpdateYearResidentRelation();
    try {
      await axiosPrivate[method](url, relation);
      toast.success("Demande accepté!", toastSuccess);
    } catch (error) {
      handleApiError(error);
      toast.error(error.response.data.message, toastError);
      setAllowed(false);
    }
  };

  const refuseResident = async (YearResidentId) => {
    const { method, url } = yearsApi.deleteYearResidentRelation();
    try {
      await axiosPrivate[method](url + YearResidentId);
      toast.success("Demande refusée!", toastSuccess);
      fetchResidentList();
    } catch (error) {
      handleApiError(error);
      toast.error(error?.response?.data?.message, toastError);
    }
  };

  return (
    <React.Fragment>
      <TableRow
        sx={{
          borderLeft: openRowId === index ? `3px solid ${theme.palette.primary.main}` : "unset",
        }}
        hover
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            disabled={allowed ? false : true}
            onClick={() => handleCollapse()}
          >
            {openRowId === index ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.firstname} {row.lastname}
        </TableCell>
        <TableCell align="left">{row.email}</TableCell>
        <TableCell align="left">
          {allowed && (
            <Stack direction="row" alignItems={"center"} spacing={1} marginRight={theme.spacing(1)}>
              <CheckCircleOutlineIcon color="primary" />
              <Typography color={"text.secondary"}>Validé</Typography>
            </Stack>
          )}
          {!allowed && (
            <Stack direction="row" alignItems={"center"} spacing={1} marginRight={theme.spacing(1)}>
              <MailOutlineIcon color="primary" />
              {!allowed && adminRights ? (
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size={"small"}
                    startIcon={<AddTaskIcon />}
                    onClick={() => acceptResident(row?.residentId)}
                  >
                    Accepter
                  </Button>
                  <Button
                    variant="outlined"
                    color={"warning"}
                    size={"small"}
                    startIcon={<CloseIcon />}
                    onClick={() => refuseResident(row?.yearResidentId)}
                  >
                    Refuser
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          )}
        </TableCell>
        <TableCell align="left">{row.lastConnection}</TableCell>
      </TableRow>

      <TableRow
        sx={{
          borderLeft: openRowId === index ? `3px solid ${theme.palette.primary.main}` : "unset",
        }}
      >
        <TableCell style={{ padding: 0 }} colSpan={6}>
          <Collapse in={openRowId === index} timeout={0} unmountOnExit>
            <Grid container spacing={2} padding={(5, 2, 2, 2)}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom component="div" fontWeight={600}>
                  Information générales
                </Typography>
                <Divider />
                <Grid container justifyContent="space-between" marginTop={1}>
                  <Grid item>
                    <DateHandler
                      label={"Début de l'année académique"}
                      value={dateOfStart}
                      onChange={(value) => setDateOfStart(value)}
                      size={"small"}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <CustomSwitch
                      label={"Opting out"}
                      checked={optingOut}
                      handleCheck={() => setOptingOut(!optingOut)}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom component="div" fontWeight={600}>
                  Congés
                </Typography>
                <Divider />
                <Grid container spacing={2} marginTop={1}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      variant="outlined"
                      name={"legalLeaves"}
                      type={"number"}
                      fullWidth
                      value={legalLeaves}
                      onChange={(event) => setLegalLeaves(event.target.value)}
                      label={"Jours de congé"}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      variant="outlined"
                      name={"scientifLeaves"}
                      type={"number"}
                      fullWidth
                      value={scientificLeaves}
                      onChange={(event) => setScientificLeaves(event.target.value)}
                      label={"Jours de scientifique"}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      variant="outlined"
                      name={"maternityLeaves"}
                      type={"number"}
                      fullWidth
                      value={maternityLeaves}
                      onChange={(event) => setMaternityLeaves(event.target.value)}
                      label={"Jours de maternité"}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      variant="outlined"
                      name={"paternityLeaves"}
                      type={"number"}
                      fullWidth
                      value={paternityLeaves}
                      onChange={(event) => setPaternityLeaves(event.target.value)}
                      label={"Jours de paternité"}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      variant="outlined"
                      name={"unpaidLeaves"}
                      type={"number"}
                      fullWidth
                      value={unpaidLeaves}
                      onChange={(event) => setUnpaidLeaves(event.target.value)}
                      label={"Jours non rémunéré"}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={12}>
                <Divider marginBottom={2} />
                <Grid container spacing={2} paddingTop={2}>
                  <Grid item>
                    <Button
                      Button
                      variant="contained"
                      disabled={!isModified}
                      onClick={() => handleUpdateResident(row)}
                    >
                      Modifier
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button variant="text" onClick={() => handleClose()}>
                      Annuler
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function ResidentTable({
  residentList,
  _setResidentList,
  yearId,
  adminRights,
  fetchResidentList,
}) {
  const [openRowId, setOpenRowId] = React.useState(-1);

  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell width={10} />
            <TableCell align="left">Nom</TableCell>
            <TableCell align="left">Email</TableCell>
            <TableCell align="left">Status</TableCell>
            <TableCell align="left">Dernière connection</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {residentList?.map((row, index) => (
            <Row
              key={index}
              row={row}
              index={index}
              openRowId={openRowId}
              setOpenRowId={setOpenRowId}
              yearId={yearId}
              adminRights={adminRights}
              fetchResidentList={fetchResidentList}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
