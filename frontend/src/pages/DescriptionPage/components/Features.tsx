import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

import EventNoteIcon from "@mui/icons-material/EventNote";
import DateRangeIcon from "@mui/icons-material/DateRange";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import LanguageIcon from "@mui/icons-material/Language";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import InsightsIcon from "@mui/icons-material/Insights";

const ICONS = [
  EventNoteIcon,
  DateRangeIcon,
  ViewWeekIcon,
  AccessTimeIcon,
  FactCheckIcon,
  FileDownloadIcon,
  AdminPanelSettingsIcon,
  NotificationsNoneIcon,
  InstallMobileIcon,
  LanguageIcon,
  ManageSearchIcon,
  InsightsIcon,
];

const Features = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const items = ICONS.map((Icon, i) => ({
    Icon,
    title: t(`desc.features.f${i + 1}Title`),
    desc: t(`desc.features.f${i + 1}Desc`),
  }));

  return (
    <Box>
      <Box marginBottom={5} textAlign="center">
        <Typography
          sx={{ textTransform: "uppercase", fontWeight: "medium" }}
          gutterBottom
          color="secondary"
          data-aos="fade-up"
        >
          {t("desc.features.sectionTag")}
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700 }}
          gutterBottom
          data-aos="fade-up"
        >
          {t("desc.features.sectionTitle")}
        </Typography>
        <Typography
          variant="h6"
          component="p"
          color="text.secondary"
          data-aos="fade-up"
        >
          {t("desc.features.sectionSub")}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {items.map(({ Icon, title, desc }, i) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            key={i}
            data-aos="fade-up"
            data-aos-delay={i * 40}
            data-aos-offset={80}
            data-aos-duration={500}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                p: 3,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                height: "100%",
                transition: "box-shadow .18s, border-color .18s",
                "&:hover": {
                  boxShadow: 3,
                  borderColor: theme.palette.primary.light,
                },
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  bgcolor: theme.palette.primary.main + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.palette.primary.main,
                  flexShrink: 0,
                }}
              >
                <Icon />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {desc}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Features;
