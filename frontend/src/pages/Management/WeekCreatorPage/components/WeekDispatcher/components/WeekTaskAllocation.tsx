import React, { useState, useMemo } from "react";
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
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

// General components
import useWeekShedulerContext from "../../../../../../hooks/useWeekShedulerContext";

// Local components
import CreateWeekForm from "./CreateWeekForm";
import dayjs from "@/lib/dayjs";

const StyledTableContainer = styled(Paper)(({ theme }) => ({
  width: "100%",
  overflowX: "auto",
  "& .MuiTableCell-root": {
    minWidth: theme.spacing(20),
  },
}));

const CustomTableCell = styled(TableCell)(({ theme, isAssigned }) => ({
  cursor: "pointer",
  backgroundColor: isAssigned
    ? alpha("#3fcc8a", 1) // Couleur de fond lorsque le résident est attribué
    : alpha("#a439b6", 0.1), // Couleur de fond par défaut
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: isAssigned
      ? alpha("#3fcc8a", 1) // Couleur de fond lors du survol si un résident est attribué
      : alpha("#a439b6", 0.8), // Couleur de fond lors du survol par défaut
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

const WeekTaskAllocation = () => {
  const { weekTypes } = useWeekShedulerContext();
  const startDate = "2022/10/01";
  const endDate = "2023/10/01";

  const residents = [
    { id: 1, firstName: "John", lastName: "Monitova" },
    { id: 2, firstName: "Jane", lastName: "Hubert" },
  ];

  const dateRange = useMemo(() => {
    let start = dayjs(startDate);
    const end = dayjs(endDate);
    const weeks = [];

    while (start.isBefore(end)) {
      weeks.push({
        id: start.format("YYYY-MM-DD"),
        date: `${start.format("DD MMM")} - ${start.add(6, "days").format("DD MMM")}`,
      });
      start = start.add(1, "week");
    }

    return weeks;
  }, [startDate, endDate]);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [currentType, setCurrentType] = useState(null);

  const handleRemoveAssignment = () => {
    setAssignments((prevAssignments) => ({
      ...prevAssignments,
      [currentType]: {
        ...prevAssignments[currentType],
        [currentWeek]: null,
      },
    }));
    handleCloseMenu();
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const [assignments, setAssignments] = useState({});

  const handleResidentAssignment = (residentId) => {
    setAssignments((prevAssignments) => ({
      ...prevAssignments,
      [currentType]: {
        ...prevAssignments[currentType],
        [currentWeek]: residents.find((resident) => resident.id === residentId),
      },
    }));
    handleCloseMenu();
  };

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <StyledTableContainer>
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <FixedHeaderTableCell> Semaine Type </FixedHeaderTableCell>
              {dateRange.map((week) => (
                <TableCell key={week.id}>{week.date}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weekTypes?.map((type) => (
              <TableRow key={type.id}>
                <FixedHeaderTableCell component="th" scope="row">
                  <Typography noWrap style={{ wordWrap: "break-word" }}>
                    {type.name}
                  </Typography>
                  <FixedHeaderBorder borderColor={type.color} />
                </FixedHeaderTableCell>

                {dateRange?.map((week) => (
                  <CustomTableCell
                    key={week.id}
                    isAssigned={Boolean(assignments?.[type.id]?.[week.id])} // Passez la propriété 'isAssigned' ici
                    onClick={(event) => {
                      setCurrentWeek(week.id);
                      setCurrentType(type.id);
                      setMenuAnchorEl(event.currentTarget);
                    }}
                  >
                    {/* Display assigned resident's last name here */}
                    <Typography variant="button">
                      {" "}
                      {assignments?.[type.id]?.[week.id]?.firstName}
                    </Typography>
                  </CustomTableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              {" "}
              {/* Ajoutez cette ligne */}
              <FixedHeaderTableCell component="th" scope="row" onClick={handleDrawerOpen}>
                <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                  <AddIcon />
                  <Typography>Créer une semaine</Typography>
                </Stack>
              </FixedHeaderTableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableWrapper>
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleCloseMenu}>
        {/* Ajoutez cette ligne */}
        {residents.map((resident) => (
          <MenuItem key={resident.id} onClick={() => handleResidentAssignment(resident.id)}>
            {resident.firstName} {resident.lastName}
          </MenuItem>
        ))}
        <MenuItem onClick={handleRemoveAssignment}>Supprimer</MenuItem>
      </Menu>
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
        <div>
          <IconButton onClick={handleDrawerClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <CreateWeekForm onCancel={handleDrawerClose} />
      </Drawer>
    </StyledTableContainer>
  );
};

export default WeekTaskAllocation;
