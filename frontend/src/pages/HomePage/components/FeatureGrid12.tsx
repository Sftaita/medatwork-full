import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import EventNoteIcon from "@mui/icons-material/EventNote";
import GroupIcon from "@mui/icons-material/Group";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import BarChartIcon from "@mui/icons-material/BarChart";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SecurityIcon from "@mui/icons-material/Security";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import LanguageIcon from "@mui/icons-material/Language";

const INK = "#1a1614";
const GOLD = "#d4a017";

const ICONS = [
  EventNoteIcon, GroupIcon, CalendarMonthIcon, ViewWeekIcon,
  AccessTimeIcon, FactCheckIcon, BarChartIcon, FileDownloadIcon,
  NotificationsNoneIcon, SecurityIcon, InstallMobileIcon, LanguageIcon,
];

const FeatureGrid12 = () => {
  const { t } = useTranslation();

  const CELLS = ICONS.map((Icon, i) => ({
    Icon,
    title: t(`landing.featureGrid.cell${i}title`),
    desc: t(`landing.featureGrid.cell${i}desc`),
  }));

  return (
    <Box component="section" sx={{ bgcolor: INK, color: "#fbf8f1" }}>
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, py: { xs: "56px", sm: "80px", md: "120px" } }}>

        {/* Header */}
        <Box sx={{ mb: { xs: 4, md: 7 } }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "rgba(251,248,241,.5)",
              "&::before": {
                content: '""',
                width: 6, height: 6,
                borderRadius: "50%",
                bgcolor: GOLD,
                flexShrink: 0,
              },
            }}
          >
            {t("landing.featureGrid.eyebrow")}
          </Box>
          <Box
            sx={{
              mt: "12px",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "flex-start", md: "flex-end" },
              justifyContent: "space-between",
              gap: { xs: 2, md: 8 },
            }}
          >
            <Typography sx={{ fontSize: { xs: 26, sm: 34, md: 48 }, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.05, color: "#fbf8f1" }}>
              {t("landing.featureGrid.titleStart")}{" "}
              <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400, color: GOLD }}>
                {t("landing.featureGrid.titleEm")}
              </Box>{" "}
              {t("landing.featureGrid.titleEnd")}
            </Typography>
            <Typography sx={{ maxWidth: { xs: "100%", md: 360 }, color: "rgba(251,248,241,.65)", fontSize: { xs: 14, md: 16 }, lineHeight: 1.65, flexShrink: 0 }}>
              {t("landing.featureGrid.sub")}
            </Typography>
          </Box>
        </Box>

        {/* Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: "1px",
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: { xs: "16px", md: "22px" },
            overflow: "hidden",
          }}
        >
          {CELLS.map(({ Icon, title, desc }, i) => (
            <Box
              key={i}
              data-aos="fade-up"
              data-aos-delay={(i % 3) * 60}
              sx={{
                bgcolor: INK,
                p: { xs: "20px 18px", sm: "26px 22px", md: "34px 30px" },
                display: "flex",
                flexDirection: "column",
                gap: { xs: "10px", md: "14px" },
                minHeight: { xs: 0, md: 190 },
                position: "relative",
                cursor: "default",
                transition: "background .3s, transform .35s cubic-bezier(.2,.7,.2,1)",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  border: "2px solid transparent",
                  borderRadius: "inherit",
                  pointerEvents: "none",
                  transition: "border-color .3s, box-shadow .3s",
                },
                "&:hover": {
                  transform: { xs: "none", md: "translateY(-4px)" },
                  bgcolor: "#221c19",
                  zIndex: 2,
                },
                "&:hover::after": {
                  borderColor: GOLD,
                  boxShadow: "0 24px 48px -24px rgba(212,160,23,.4)",
                },
                "&:hover .gicon": {
                  bgcolor: GOLD,
                  color: INK,
                  transform: "scale(1.05) rotate(-3deg)",
                },
              }}
            >
              <Box
                className="gicon"
                sx={{
                  width: { xs: 34, md: 38 },
                  height: { xs: 34, md: 38 },
                  borderRadius: "9px",
                  bgcolor: "rgba(255,255,255,.08)",
                  color: GOLD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background .3s, color .3s, transform .3s",
                }}
              >
                <Icon sx={{ fontSize: { xs: 15, md: 17 } }} />
              </Box>
              <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600, letterSpacing: "-.012em", color: "#fbf8f1", lineHeight: 1.25 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: { xs: 12.5, md: 13.5 }, lineHeight: 1.6, color: "rgba(251,248,241,.6)" }}>
                {desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default FeatureGrid12;
