import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";
import SecurityIcon from "@mui/icons-material/Security";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";

const PRIMARY = "#7B3FA0";

const ICONS = [SecurityIcon, AccountBalanceIcon, PhoneIphoneIcon];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
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
        color: "text.disabled",
        "&::before": {
          content: '""',
          width: 6, height: 6,
          borderRadius: "50%",
          bgcolor: PRIMARY,
          flexShrink: 0,
        },
      }}
    >
      {children}
    </Box>
  );
}

const TechStrip = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const ITEMS = ICONS.map((Icon, i) => ({
    Icon,
    title: t(`landing.tech.card${i}title`),
    desc: t(`landing.tech.card${i}desc`),
    chips: [
      t(`landing.tech.card${i}chip0`),
      t(`landing.tech.card${i}chip1`),
      t(`landing.tech.card${i}chip2`),
      ...(i === 0 || i === 2 ? [t(`landing.tech.card${i}chip3`)] : []),
    ],
  }));

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 3, md: 4 }, pt: "24px", pb: { xs: "60px", md: "100px" } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: { xs: 3, md: 8 },
          mb: { xs: 5, md: 8 },
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Eyebrow>{t("landing.tech.eyebrow")}</Eyebrow>
          <Typography
            sx={{ fontSize: { xs: 32, md: 52 }, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.05, mt: "14px", color: "text.primary" }}
          >
            {t("landing.tech.titleStart")}
            <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>
              {t("landing.tech.titleEm")}
            </Box>
            {t("landing.tech.titleEnd")}
          </Typography>
        </Box>
        <Typography sx={{ maxWidth: 380, color: "text.secondary", fontSize: 16, lineHeight: 1.65 }}>
          {t("landing.tech.sub")}
        </Typography>
      </Box>

      {/* Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
        {ITEMS.map(({ Icon, title, desc, chips }, i) => (
          <Box
            key={i}
            data-aos="fade-up"
            data-aos-delay={i * 80}
            sx={{
              p: { xs: "28px", md: "36px 30px" },
              borderRadius: "20px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minHeight: 240,
              transition: "transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, border-color .35s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 20px 40px -20px rgba(26,22,20,.18)",
                borderColor: alpha(PRIMARY, 0.3),
              },
            }}
          >
            <Typography component="div" sx={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.012em", display: "flex", alignItems: "center", gap: "10px", color: "text.primary" }}>
              <Box
                sx={{
                  width: 28, height: 28,
                  borderRadius: "8px",
                  bgcolor: alpha(PRIMARY, 0.1),
                  color: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ fontSize: 14 }} />
              </Box>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 14.5, lineHeight: 1.6, color: "text.secondary", flex: 1 }}>
              {desc}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: "auto", pt: "4px" }}>
              {chips.map((chip) => (
                <Box
                  key={chip}
                  sx={{
                    px: "10px", py: "4px",
                    borderRadius: "999px",
                    bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,.06)" : alpha(PRIMARY, 0.06),
                    fontFamily: "monospace",
                    fontSize: 11.5,
                    color: "text.secondary",
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {chip}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TechStrip;
