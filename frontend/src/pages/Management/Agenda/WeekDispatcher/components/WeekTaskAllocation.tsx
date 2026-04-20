import React, { useState, useMemo, useEffect } from "react";
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
import type { WeekInterval, YearWeekTemplate, ResidentAssignment } from "@/store/weekDispatcherStore";
import WeekTemplateImport from "./WeekTemplateImport";
import TableLoader from "./TableLoader";

interface PendingOp {
  method: "create" | "delete";
  residentId: number;
  yearWeekTemplateId: number;
  weekIntervalId: number;
}

const StyledTableContainer = styled(Paper)(({ theme }) => ({
  width: "100%",
  overflowX: "auto",
  "& .MuiTableCell-root": {
    minWidth: theme.spacing(20),
  },
}));

const CustomTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "isAssigned" && prop !== "cellColor",
})<{ isAssigned?: boolean; cellColor?: string }>(({ theme, isAssigned, cellColor = "#ccc" }) => ({
  cursor: "pointer",
  backgroundColor: isAssigned ? alpha(cellColor, 0.8) : alpha(cellColor, 0.1),
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: isAssigned ? alpha(cellColor, 1) : alpha(cellColor, 0.8),
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

const FixedHeaderBorder = styled("div", {
  shouldForwardProp: (prop) => prop !== "borderColor",
})<{ borderColor?: string }>(({ theme, borderColor }) => ({
  height: "100%",
  width: "4px",
  position: "absolute",
  top: 0,
  left: 0,
  backgroundColor: borderColor || theme.palette.common.white,
  zIndex: 4,
}));

const TableWrapper = styled("div")({
  overflowX: "auto",
});

/** Replace any existing pending op for the same (template × interval) slot */
function upsertPendingOp(prev: unknown[], newOp: PendingOp): unknown[] {
  const key = `${newOp.yearWeekTemplateId}-${newOp.weekIntervalId}`;
  const filtered = (prev as PendingOp[]).filter(
    (op) => `${op.yearWeekTemplateId}-${op.weekIntervalId}` !== key
  );
  return [...filtered, newOp];
}

const WeekTaskAllocation = ({ isLoading }: { isLoading: boolean }) => {
  const {
    residents,
    intervals,
    yearWeekTemplates,
    assignments,
    setAssignments,
    setPendingChange,
    currentYearId,
  } = useWeekDispatcherContext();

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentType, setCurrentType] = useState<number | null>(null);

  // Close context menu when the user switches to a different year
  useEffect(() => {
    setMenuAnchorEl(null);
  }, [currentYearId]);

  const dateRange = useMemo(() => {
    return (intervals as WeekInterval[]).map((interval) => ({
      id: interval.weekIntervalId,
      date: `${dayjs(interval.dateOfStart).format("DD MMM")} - ${dayjs(interval.dateOfEnd).format("DD MMM YY")}`.toLowerCase(),
    }));
  }, [intervals]);

  const handleCloseMenu = () => setMenuAnchorEl(null);

  const handleRemoveAssignment = () => {
    if (currentType === null || currentWeek === null) return;

    const removedResidentId = assignments[currentType]?.[currentWeek]?.residentId;

    setAssignments((prev) => ({
      ...prev,
      [currentType]: {
        ...prev[currentType],
        [currentWeek]: null,
      },
    }));

    if (removedResidentId !== undefined) {
      setPendingChange((prev) =>
        upsertPendingOp(prev, {
          method: "delete",
          residentId: removedResidentId,
          yearWeekTemplateId: currentType,
          weekIntervalId: currentWeek,
        })
      );
    }

    handleCloseMenu();
  };

  const handleResidentAssignment = (residentId: number) => {
    if (currentType === null || currentWeek === null) return;

    const assignedResident = (residents as unknown as ResidentAssignment[]).find(
      (r) => r.residentId === residentId
    );

    setAssignments((prev) => {
      let updated = { ...prev };

      // If this resident is already assigned somewhere else on the same week, remove that slot
      for (const type in updated) {
        const typeNum = parseInt(type, 10);
        const slot = updated[typeNum]?.[currentWeek];
        if (slot?.residentId === residentId && typeNum !== currentType) {
          updated = {
            ...updated,
            [typeNum]: { ...updated[typeNum], [currentWeek]: null },
          };
          setPendingChange((prev) =>
            upsertPendingOp(prev, {
              method: "delete",
              residentId,
              yearWeekTemplateId: typeNum,
              weekIntervalId: currentWeek,
            })
          );
        }
      }

      return {
        ...updated,
        [currentType]: {
          ...updated[currentType],
          [currentWeek]: assignedResident ?? null,
        },
      };
    });

    setPendingChange((prev) =>
      upsertPendingOp(prev, {
        method: "create",
        residentId,
        yearWeekTemplateId: currentType,
        weekIntervalId: currentWeek,
      })
    );

    handleCloseMenu();
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <StyledTableContainer>
      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <FixedHeaderTableCell>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="primary">
                    Semaine Type
                  </Typography>
                  <Typography variant="h6" color="primary">|</Typography>
                </Stack>
              </FixedHeaderTableCell>
              {dateRange.map((week) => (
                <TableCell key={week.id}>
                  <Typography>{week.date}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {!isLoading && (
            <TableBody>
              {(yearWeekTemplates as YearWeekTemplate[]).map((type) => (
                <TableRow key={type.yearWeekTemplateId}>
                  <FixedHeaderTableCell component="th" scope="row">
                    <Typography noWrap>{type.title}</Typography>
                    <FixedHeaderBorder borderColor={type.color} />
                  </FixedHeaderTableCell>

                  {dateRange.map((week) => (
                    <CustomTableCell
                      key={week.id}
                      isAssigned={Boolean(assignments[type.yearWeekTemplateId]?.[week.id])}
                      cellColor={type.color}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setCurrentWeek(week.id);
                          setCurrentType(type.yearWeekTemplateId);
                          setMenuAnchorEl(e.currentTarget as HTMLElement);
                        }
                      }}
                      onClick={(event) => {
                        setCurrentWeek(week.id);
                        setCurrentType(type.yearWeekTemplateId);
                        setMenuAnchorEl(event.currentTarget);
                      }}
                    >
                      <Typography variant="button">
                        {assignments[type.yearWeekTemplateId]?.[week.id]?.firstname}
                      </Typography>
                    </CustomTableCell>
                  ))}
                </TableRow>
              ))}

              <TableRow>
                <FixedHeaderTableCell
                  component="th"
                  scope="row"
                  onClick={() => setDialogOpen(true)}
                  sx={{ cursor: "pointer" }}
                >
                  <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
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
        {(residents as unknown as ResidentAssignment[]).map((resident) => (
          <MenuItem
            key={resident.residentId}
            onClick={() => handleResidentAssignment(resident.residentId)}
          >
            {resident.firstname} {resident.lastname}
          </MenuItem>
        ))}
        {currentType !== null && currentWeek !== null && assignments[currentType]?.[currentWeek] && (
          <MenuItem sx={{ color: "red" }} onClick={handleRemoveAssignment}>
            Supprimer
          </MenuItem>
        )}
      </Menu>

      <WeekTemplateImport open={dialogOpen} handleClose={() => setDialogOpen(false)} />
    </StyledTableContainer>
  );
};

export default WeekTaskAllocation;
