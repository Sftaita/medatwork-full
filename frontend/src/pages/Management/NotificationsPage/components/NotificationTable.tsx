import React from "react";

// Material UI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import MailIcon from "@mui/icons-material/Mail";
import DraftsIcon from "@mui/icons-material/Drafts";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Stack } from "@mui/system";

const Validated = ({ notificationData }) => {
  return (
    <div style={{ height: "40vh", width: "100%" }}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            {notificationData?.map((row) => (
              <TableRow
                hover
                key={row.key}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ minWidth: 300 }} align={"left"}>
                  <Stack
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    spacing={2}
                  >
                    {row?.isRead ? (
                      <DraftsIcon color="action" fontSize="small" />
                    ) : (
                      <MailIcon color="primary" fontSize="small" />
                    )}
                    <Typography>{row.object}</Typography>
                  </Stack>
                </TableCell>
                <TableCell align={"left"}>{row.body}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Validated;
