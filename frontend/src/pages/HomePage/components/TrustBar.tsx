import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import { useTheme, alpha } from "@mui/material/styles";

const ITEMS = [
  "Conforme cadre légal MACC",
  "JWT & cookies HttpOnly",
  "Export Excel prêt à facturer",
  "Audit log complet",
];

const TrustBar = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        px: { xs: 2.5, md: 4 },
        py: { xs: "14px", md: "18px" },
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: "10px", sm: 4, md: 5 },
        }}
      >
        <Typography
          sx={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "text.disabled",
            flexShrink: 0,
          }}
        >
          Conçu pour les hôpitaux belges
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, auto)" },
            gap: { xs: "8px 16px", md: "0 28px" },
            alignItems: "center",
          }}
        >
          {ITEMS.map((item) => (
            <Box key={item} sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <CheckIcon sx={{ fontSize: 13, color: "primary.main", flexShrink: 0 }} />
              <Typography sx={{ fontSize: { xs: 12, md: 14 }, color: "text.secondary", lineHeight: 1.3 }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TrustBar;
