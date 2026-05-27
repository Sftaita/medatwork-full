import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";

const PRIMARY = "#7B3FA0";
const INK = "#1a1614";

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
          width: 6,
          height: 6,
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

const Audiences = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const CARDS = [
    {
      tag: t("landing.audiences.card0tag"),
      title: t("landing.audiences.card0title"),
      desc: t("landing.audiences.card0desc"),
      bullets: [t("landing.audiences.card0b0"), t("landing.audiences.card0b1"), t("landing.audiences.card0b2")],
      dark: false,
    },
    {
      tag: t("landing.audiences.card1tag"),
      title: t("landing.audiences.card1title"),
      desc: t("landing.audiences.card1desc"),
      bullets: [t("landing.audiences.card1b0"), t("landing.audiences.card1b1"), t("landing.audiences.card1b2")],
      dark: true,
    },
    {
      tag: t("landing.audiences.card2tag"),
      title: t("landing.audiences.card2title"),
      desc: t("landing.audiences.card2desc"),
      bullets: [t("landing.audiences.card2b0"), t("landing.audiences.card2b1"), t("landing.audiences.card2b2")],
      dark: false,
    },
  ];

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, pt: "24px", pb: { xs: "56px", sm: "80px", md: "120px" } }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 4, md: 7 } }}>
        <Eyebrow>{t("landing.audiences.eyebrow")}</Eyebrow>
        <Box
          sx={{
            mt: "12px",
            display: "flex",
            alignItems: { xs: "flex-start", md: "flex-end" },
            justifyContent: "space-between",
            gap: { xs: 2, md: 8 },
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 26, sm: 34, md: 52 },
              fontWeight: 700,
              letterSpacing: "-.025em",
              lineHeight: 1.05,
              color: "text.primary",
            }}
          >
            {t("landing.audiences.titleStart")}{" "}
            <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>
              {t("landing.audiences.titleEm")}
            </Box>{" "}
            {t("landing.audiences.titleEnd")}
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: { xs: 14, md: 16 },
              lineHeight: 1.65,
              maxWidth: { xs: "100%", md: 380 },
              flexShrink: 0,
            }}
          >
            {t("landing.audiences.sub")}
          </Typography>
        </Box>
      </Box>

      {/* Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          gap: { xs: 2, md: 3 },
        }}
      >
        {CARDS.map((card, i) => (
          <Box
            key={i}
            data-aos="fade-up"
            data-aos-delay={i * 60}
            sx={{
              bgcolor: card.dark ? INK : "background.paper",
              color: card.dark ? "#fbf8f1" : "text.primary",
              border: `1px solid ${card.dark ? INK : theme.palette.divider}`,
              borderRadius: { xs: "18px", md: "22px" },
              p: { xs: "22px 20px", md: "34px" },
              display: "flex",
              flexDirection: "column",
              gap: { xs: "14px", md: "18px" },
              minHeight: { sm: 340, md: 380 },
              transition: "transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, border-color .35s",
              "&:hover": {
                transform: { xs: "none", md: "translateY(-6px)" },
                boxShadow: card.dark
                  ? "0 24px 48px -20px rgba(26,22,20,.5)"
                  : "0 24px 48px -24px rgba(26,22,20,.2)",
                borderColor: card.dark ? INK : alpha(PRIMARY, 0.35),
              },
            }}
          >
            {/* Tag */}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignSelf: "flex-start",
                px: "10px",
                py: "4px",
                borderRadius: "999px",
                fontFamily: "monospace",
                fontSize: { xs: 10, md: 11 },
                letterSpacing: ".1em",
                textTransform: "uppercase",
                bgcolor: card.dark ? "rgba(255,255,255,.08)" : alpha(PRIMARY, 0.1),
                color: card.dark ? "#fbf8f1" : PRIMARY,
                border: `1px solid ${card.dark ? "rgba(255,255,255,.12)" : alpha(PRIMARY, 0.25)}`,
              }}
            >
              {card.tag}
            </Box>

            {/* Title */}
            <Typography
              sx={{
                fontSize: { xs: 20, sm: 22, md: 26 },
                fontWeight: 700,
                letterSpacing: "-.018em",
                lineHeight: 1.15,
                color: card.dark ? "#fbf8f1" : "text.primary",
              }}
            >
              {card.title}
            </Typography>

            {/* Desc */}
            <Typography
              sx={{
                fontSize: { xs: 13.5, md: 15 },
                lineHeight: 1.6,
                color: card.dark ? "rgba(251,248,241,.7)" : "text.secondary",
              }}
            >
              {card.desc}
            </Typography>

            {/* Bullets */}
            <Box
              component="ul"
              sx={{
                m: 0, p: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "9px",
                mt: "auto",
                pt: { xs: "4px", md: "8px" },
              }}
            >
              {card.bullets.map((b) => (
                <Box
                  key={b}
                  component="li"
                  sx={{
                    position: "relative",
                    pl: "16px",
                    fontSize: { xs: 13, md: 14 },
                    lineHeight: 1.5,
                    color: card.dark ? "rgba(251,248,241,.85)" : "text.secondary",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "6px",
                      width: 6,
                      height: 6,
                      bgcolor: card.dark ? "#d4a017" : PRIMARY,
                      borderRadius: "2px",
                    },
                  }}
                >
                  {b}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Audiences;
