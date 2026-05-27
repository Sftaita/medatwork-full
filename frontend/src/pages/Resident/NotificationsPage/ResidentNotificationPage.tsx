import React from "react";
import { useTranslation } from "react-i18next";
import NotificationTable from "./components/NotificationTable";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Window from "../../../components/big/Windows";
import useNotificationsPage from "../../../hooks/data/useNotifications";

// Material UI
import { Box } from "@mui/system";
import Typography from "@mui/material/Typography";
import { Alert } from "@mui/material";

const ResidentNotificationPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { notifications, notificationData } = useNotificationsPage("resident");

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
          {t("notif.sectionTitle")}
        </Typography>
        <Typography
          variant="h4"
          align={"center"}
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          {t("notif.title")}
        </Typography>

        <Box paddingLeft={isMd ? theme.spacing(4) : ""} paddingRight={isMd ? theme.spacing(4) : ""}>
          {notifications?.notifications?.length > 0 && (
            <NotificationTable notificationData={notificationData} />
          )}
          {notifications?.notifications?.length === 0 && (
            <Alert severity="info">
              <Typography>{t("notif.empty")}</Typography>
            </Alert>
          )}
        </Box>
      </Box>
    </Window>
  );
};

export default ResidentNotificationPage;
