import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

const GOLD  = "#d4a017";
const INK   = "#1a1614";

const Sep = () => (
  <Box
    sx={{
      width: 5, height: 5,
      borderRadius: "50%",
      bgcolor: GOLD,
      flexShrink: 0,
      opacity: 0.6,
      mx: "28px",
      alignSelf: "center",
    }}
  />
);

const MarqueeStrip = () => {
  useTheme();
  const { t } = useTranslation();

  const ITEMS = [
    t("landing.marquee.item0"),
    t("landing.marquee.item1"),
    t("landing.marquee.item2"),
    t("landing.marquee.item3"),
    t("landing.marquee.item4"),
    t("landing.marquee.item5"),
    t("landing.marquee.item6"),
    t("landing.marquee.item7"),
    t("landing.marquee.item8"),
    t("landing.marquee.item9"),
    t("landing.marquee.item10"),
    t("landing.marquee.item11"),
  ];

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <Box
      sx={{
        bgcolor: INK,
        borderTop: "1px solid rgba(255,255,255,.07)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
        py: { xs: "14px", md: "18px" },
        overflow: "hidden",
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          top: 0, bottom: 0,
          width: { xs: "60px", md: "120px" },
          zIndex: 2,
          pointerEvents: "none",
        },
        "&::before": {
          left: 0,
          background: `linear-gradient(to right, ${INK}, transparent)`,
        },
        "&::after": {
          right: 0,
          background: `linear-gradient(to left, ${INK}, transparent)`,
        },
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          width: "max-content",
          alignItems: "center",
          "@keyframes marquee": {
            "0%":   { transform: "translateX(0)" },
            "100%": { transform: "translateX(-50%)" },
          },
          animation: "marquee 32s linear infinite",
          "&:hover": { animationPlayState: "paused" },
        }}
      >
        {doubled.map((item, i) => (
          <React.Fragment key={`${item}-${i}`}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "rgba(251,248,241,.7)",
                fontSize: { xs: 12, md: 13 },
                fontWeight: 500,
                letterSpacing: ".01em",
                whiteSpace: "nowrap",
                "&::before": {
                  content: '""',
                  display: "inline-block",
                  width: 6, height: 6,
                  borderRadius: "50%",
                  bgcolor: GOLD,
                  opacity: 0.8,
                  flexShrink: 0,
                },
              }}
            >
              {item}
            </Box>
            <Sep />
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default MarqueeStrip;
