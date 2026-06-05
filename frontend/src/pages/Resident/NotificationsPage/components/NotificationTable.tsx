import React from "react";
import DraftsIcon from "@mui/icons-material/Drafts";
import MailIcon from "@mui/icons-material/Mail";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Stack } from "@mui/system";
import type { Notification } from "@/types/entities";
import { formatRelativeTime, sortNotifications } from "@/utils/notificationUtils";

// Pas de badges sévérité : les résidents ne reçoivent pas de COMPLIANCE_ALERT.
// Pas de bouton "Voir" : pas de metadata ni de deep link résident (P2-E2 reporté).

interface Props {
  notificationData: Notification[];
}

const NotificationTable = ({ notificationData }: Props) => {
  const sorted = sortNotifications(notificationData ?? []);

  return (
    <div style={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="notifications">
          <TableBody>
            {sorted.map((row) => {
              const relativeTime = formatRelativeTime(row.createdAt);
              return (
                <TableRow
                  hover
                  key={row.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  {/* Colonne titre + icône lu/non-lu */}
                  <TableCell sx={{ minWidth: 300 }} align="left">
                    <Stack
                      direction="row"
                      justifyContent="flex-start"
                      alignItems="center"
                      spacing={1}
                    >
                      {row.read ? (
                        <DraftsIcon
                          data-testid="notif-icon-read"
                          color="action"
                          fontSize="small"
                        />
                      ) : (
                        <MailIcon
                          data-testid="notif-icon-unread"
                          color="primary"
                          fontSize="small"
                        />
                      )}

                      <Typography fontWeight={400}>
                        {row.object}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Colonne corps + timestamp relatif */}
                  <TableCell align="left">
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-line", color: "text.secondary" }}
                    >
                      {row.body}
                    </Typography>

                    {relativeTime && (
                      <Typography
                        variant="caption"
                        data-testid="notif-timestamp"
                        sx={{ display: "block", color: "text.disabled", mt: 0.5, textAlign: "right" }}
                      >
                        {relativeTime}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default NotificationTable;
