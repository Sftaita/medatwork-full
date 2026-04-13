import React from "react";
import NotificationTable from "./components/NotificationTable";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Window from "../../../components/big/Windows";
import useNotificationsPage from "../../../hooks/data/useNotifications";

// Material UI
import { Box } from "@mui/system";
import Typography from "@mui/material/Typography";
import { Alert } from "@mui/material";

const ManagerNotificationPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { notifications, notificationData } = useNotificationsPage("manager");

  return (
    <Window>
      <Box marginBottom={4}>
        <Typography
          sx={{
            textTransform: "uppercase",
            fontWeight: "medium",
          }}
          gutterBottom
          color={"secondary"}
          align={"center"}
        >
          Messagerie
        </Typography>
        <Typography
          variant="h4"
          align={"center"}
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          Vos notifications
        </Typography>

        <Box paddingLeft={{ xs: theme.spacing(2), md: theme.spacing(4) }} paddingRight={{ xs: theme.spacing(2), md: theme.spacing(4) }}>
          {notifications?.notifications?.length > 0 && (
            <NotificationTable notificationData={notificationData} />
          )}
          {notifications?.notifications?.length === 0 && (
            <Alert severity="info">
              <Typography> Vous n'avez pas de nouvelle notification.</Typography>
            </Alert>
          )}
        </Box>
      </Box>
    </Window>
  );
};

export default ManagerNotificationPage;
