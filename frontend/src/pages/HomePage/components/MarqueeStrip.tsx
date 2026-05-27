import React from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

const GOLD  = "#d4a017";
const INK   = "#1a1614";

const ITEMS = [
  "Années de formation",
  "Équipe MACCs",
  "Agenda & calendrier",
  "Semaines modèles",
  "Encodage du temps",
  "Validation numérique",
  "Statistiques",
  "Export Excel · RH",
  "Notifications",
  "Sécurité & rôles",
  "PWA installable",
  "Multilingue FR · NL · EN",
];

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
  const theme = useTheme();
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <Box
      sx={{
        bgcolor: INK,
        borderTop: "1px solid rgba(255,255,255,.07)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
        py: { xs: "14px", md: "18px" },
        overflow: "hidden",
        /* Fade masks on left + right */
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
