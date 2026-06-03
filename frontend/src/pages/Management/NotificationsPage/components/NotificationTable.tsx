import React from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import DraftsIcon from "@mui/icons-material/Drafts";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MailIcon from "@mui/icons-material/Mail";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Stack } from "@mui/system";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@/types/entities";
import { formatRelativeTime, sortNotifications } from "./notificationUtils";

// ── Sévérité extraite du préfixe texte du champ object ────────────────────────

type Severity = "critical" | "warning" | null;

const PREFIX_CRITICAL     = "[CRITIQUE]";
const PREFIX_WARNING      = "[AVERTISSEMENT]";

function parseSeverity(object: string): { severity: Severity; cleanTitle: string } {
  if (object.startsWith(PREFIX_CRITICAL)) {
    return {
      severity:   "critical",
      cleanTitle: object.slice(PREFIX_CRITICAL.length).trimStart(),
    };
  }
  if (object.startsWith(PREFIX_WARNING)) {
    return {
      severity:   "warning",
      cleanTitle: object.slice(PREFIX_WARNING.length).trimStart(),
    };
  }
  return { severity: null, cleanTitle: object };
}

// ── Badge de sévérité ─────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  if (severity === "critical") {
    return (
      <Chip
        data-testid="badge-critique"
        size="small"
        color="error"
        icon={<ErrorOutlineIcon />}
        label="CRITIQUE"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    );
  }
  if (severity === "warning") {
    return (
      <Chip
        data-testid="badge-avertissement"
        size="small"
        color="warning"
        icon={<WarningAmberIcon />}
        label="AVERTISSEMENT"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    );
  }
  return null;
};

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  notificationData: Notification[];
}

const NotificationTable = ({ notificationData }: Props) => {
  const navigate = useNavigate();
  const sorted   = sortNotifications(notificationData ?? []);

  return (
    <div style={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="notifications">
          <TableBody>
            {sorted.map((row) => {
              const { severity, cleanTitle } = parseSeverity(row.object);
              const relativeTime = formatRelativeTime(row.createdAt);
              return (
                <TableRow
                  hover
                  key={row.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  {/* Colonne titre + badge + icône lu/non-lu */}
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

                      <SeverityBadge severity={severity} />

                      <Typography fontWeight={severity ? 600 : 400}>
                        {cleanTitle}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Colonne corps + timestamp + bouton Voir */}
                  <TableCell align="left">
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-line", color: "text.secondary" }}
                    >
                      {row.body}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                      {relativeTime ? (
                        <Typography
                          variant="caption"
                          data-testid="notif-timestamp"
                          sx={{ color: "text.disabled" }}
                        >
                          {relativeTime}
                        </Typography>
                      ) : <span />}

                      {row.metadata?.yearId != null && (
                        <Button
                          data-testid="btn-voir"
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon fontSize="inherit" />}
                          onClick={() => navigate("/manager/year-detail", {
                            state: {
                              id:         row.metadata!.yearId,
                              title:      row.metadata!.yearTitle ?? "",
                              defaultTab: row.metadata!.tab ?? "general",
                            },
                          })}
                          sx={{ ml: 1, flexShrink: 0, fontSize: 11 }}
                        >
                          Voir
                        </Button>
                      )}
                    </Stack>
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
