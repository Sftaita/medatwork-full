import React, { useState, useMemo } from "react";
import dayjs from "dayjs";

// Material UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { alpha, styled } from "@mui/system";

import AddIcon from "@mui/icons-material/Add";
import Stack from "@mui/material/Stack";

// Local components
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";
import WeekTemplateImport from "./WeekTemplateImport";
import TableLoader from "./TableLoader";

const StyledTableContainer = styled(Paper)(({ theme }) => ({
  width: "100%",
  overflowX: "auto",
  "& .MuiTableCell-root": {
    minWidth: theme.spacing(20),
  },
}));

const CustomTableCell = styled(TableCell)(({ theme, isAssigned, cellColor }) => ({
  cursor: "pointer",
  backgroundColor: isAssigned
    ? alpha(cellColor, 0.8) // Utilisez la couleur de la semaine type avec une certaine transparence pour le cas où c'est assigné
    : alpha(cellColor, 0.1), // Utilisez une version plus légère de la couleur de la semaine type pour le cas où ce n'est pas assigné
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: isAssigned
      ? alpha(cellColor, 1) // Couleur de fond lors du survol si un résident est attribué
      : alpha(cellColor, 0.8), // Couleur de fond lors du survol par défaut
    color: theme.palette.common.white,
  },
  border: `6px solid ${theme.palette.common.white}`,
  borderRadius: theme.spacing(2),
  zIndex: 1,
}));

const FixedHeaderTableCell = styled(TableCell)(({ theme }) => ({
  maxWidth: theme.spacing(30),
  position: "sticky",
  left: 0,
  paddingRight: 2,

  backgroundColor: theme.palette.background.paper,
  zIndex: 3,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  boxShadow: `4px 0px 8px rgba(0, 0, 0, 0.1)`,
}));

const FixedHeaderBorder = styled("div")(({ theme, borderColor }) => ({
  height: "100%",
  width: "4px",
  position: "absolute",
  top: 0,
  left: 0, // Changez 'right' en 'left'
  backgroundColor: borderColor || theme.palette.common.white,
  zIndex: 4,
}));

const TableWrapper = styled("div")({
  overflowX: "auto",
});

const WeekTaskAllocation = ({ isLoading }) => {
  const { residents, intervals, yearWeekTemplates, assignments, setAssignments, setPendingChange } =
    useWeekDispatcherContext();

  const residentsMemo = useMemo(() => residents, [residents]);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [currentType, setCurrentType] = useState(null);

  const dateRange = useMemo(() => {
    return intervals.map((interval) => {
      return {
        id: interval.weekIntervalId,
        date: `${dayjs(interval.dateOfStart).format("DD MMM")} - ${dayjs(interval.dateOfEnd).format(
          "DD MMM YY"
        )}`.toLowerCase(),
      };
    });
  }, [intervals]);

  const yearWeekTemplatesMemo = useMemo(() => yearWeekTemplates, [yearWeekTemplates]);

  const handleRemoveAssignment = () => {
    setAssignments((prevAssignments) => {
      const removedResidentId = prevAssignments[currentType][currentWeek]?.residentId;

      // Ajouter une opération 'delete' à pendingChange si un résident était assigné
      if (removedResidentId) {
        setPendingChange((prevPendingChanges) => [
          ...prevPendingChanges,
          {
            method: "delete",
            residentId: removedResidentId,
            yearWeekTemplateId: currentType,
            weekIntervalId: currentWeek,
          },
        ]);
      }

      return {
        ...prevAssignments,
        [currentType]: {
          ...prevAssignments[currentType],
          [currentWeek]: null,
        },
      };
    });
    handleCloseMenu();
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleResidentAssignment = (residentId) => {
    const assignedResident = residentsMemo.find((resident) => resident.residentId === residentId);

    setAssignments((prevAssignments) => {
      // Parcourir toutes les affectations pour la semaine actuelle
      for (const type in prevAssignments) {
        // Si le résident est déjà affecté à un autre type de poste pour la semaine actuelle
        if (
          prevAssignments[type][currentWeek] &&
          prevAssignments[type][currentWeek].residentId === residentId
        ) {
          // Supprimer l'affectation existante
          delete prevAssignments[type][currentWeek];

          // Ajouter une opération 'delete' à pendingChanges
          setPendingChange((prevPendingChanges) => [
            ...prevPendingChanges,
            {
              method: "delete",
              residentId,
              yearWeekTemplateId: parseInt(type, 10),
              weekIntervalId: currentWeek,
            },
          ]);
        }
      }

      // Procéder à la nouvelle affectation
      const updatedAssignments = {
        ...prevAssignments,
        [currentType]: {
          ...prevAssignments[currentType],
          [currentWeek]: assignedResident,
        },
      };

      // Ajouter une opération 'create' à pendingChanges
      setPendingChange((prevPendingChanges) => [
        ...prevPendingChanges,
        {
          method: "create",
          residentId,
          yearWeekTemplateId: currentType,
          weekIntervalId: currentWeek,
        },
      ]);

      return updatedAssignments;
    });

    handleCloseMenu();
  };

  // Dialog controller
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return (
    <StyledTableContainer>
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <FixedHeaderTableCell>
                {" "}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="primary">
                    Semaine Type
                  </Typography>
                  <Typography variant="h6" color="primary">
                    |
                  </Typography>
                </Stack>
              </FixedHeaderTableCell>
              {dateRange?.map((week) => (
                <TableCell key={week.id}>
                  <Typography>{week.date}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          {!isLoading && (
            <TableBody>
              {yearWeekTemplatesMemo?.map((type) => (
                <TableRow key={type.id}>
                  <FixedHeaderTableCell component="th" scope="row">
                    <Typography noWrap style={{ wordWrap: "break-word" }}>
                      {type.title}
                    </Typography>
                    <FixedHeaderBorder borderColor={type.color} />
                  </FixedHeaderTableCell>

                  {dateRange?.map((week) => (
                    <CustomTableCell
                      key={week.id}
                      isAssigned={Boolean(assignments?.[type.yearWeekTemplateId]?.[week.id])}
                      cellColor={type.color} // Transmettez la couleur ici
                      onClick={(event) => {
                        setCurrentWeek(week.id);
                        setCurrentType(type.yearWeekTemplateId);
                        setMenuAnchorEl(event.currentTarget);
                      }}
                    >
                      {/* Display assigned resident's last name here */}
                      <Typography variant="button">
                        {" "}
                        {assignments?.[type.yearWeekTemplateId]?.[week.id]?.firstname}
                      </Typography>
                    </CustomTableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                {" "}
                <FixedHeaderTableCell component="th" scope="row" onClick={handleDialogOpen}>
                  <Stack
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    spacing={1}
                  >
                    <AddIcon />
                    <Typography>Importer un poste</Typography>
                  </Stack>
                </FixedHeaderTableCell>
              </TableRow>
            </TableBody>
          )}
          {isLoading && <TableLoader />}
        </Table>
      </TableWrapper>

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleCloseMenu}>
        {residentsMemo?.map((resident) => (
          <MenuItem
            key={resident?.residentId}
            onClick={() => handleResidentAssignment(resident?.residentId)}
          >
            {resident?.firstname} {resident?.lastname}
          </MenuItem>
        ))}
        {assignments?.[currentType]?.[currentWeek] && (
          <MenuItem sx={{ color: "red" }} onClick={handleRemoveAssignment}>
            Supprimer
          </MenuItem>
        )}
      </Menu>

      <WeekTemplateImport open={dialogOpen} handleClose={handleDialogClose} />
    </StyledTableContainer>
  );
};

export default WeekTaskAllocation;
