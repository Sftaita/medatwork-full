import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const PRIMARY = "#7B3FA0";

const FinalCta = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 3, md: 4 }, pb: { xs: "80px", md: "120px" } }}>
      <Box
        sx={{
          bgcolor: PRIMARY,
          color: "#fff",
          borderRadius: { xs: "24px", md: "32px" },
          p: { xs: "50px 28px", md: "100px 72px" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr .8fr" },
          gap: { xs: 5, md: 8 },
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            right: "-100px",
            top: "-100px",
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,.16), transparent 65%)",
            pointerEvents: "none",
          },
        }}
      >
        {/* Left */}
        <Box>
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
              color: "rgba(255,255,255,.7)",
              mb: "14px",
              "&::before": {
                content: '""',
                width: 6, height: 6,
                borderRadius: "50%",
                bgcolor: "#d4a017",
                flexShrink: 0,
              },
            }}
          >
            {t("landing.finalCta.eyebrow")}
          </Box>
          <Typography
            sx={{ fontSize: { xs: 36, md: 64 }, fontWeight: 700, letterSpacing: "-.028em", lineHeight: 1.02, mt: "10px", mb: "20px", color: "#fff" }}
          >
            {t("landing.finalCta.titleStart")}{" "}
            <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>
              {t("landing.finalCta.titleEm")}
            </Box>
            {" "}{t("landing.finalCta.titleEnd")}
          </Typography>
          <Typography sx={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,.82)", mb: "32px", maxWidth: 500 }}>
            {t("landing.finalCta.sub")}
          </Typography>
          <Box sx={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              href="mailto:contact@medatwork.be"
              sx={{
                bgcolor: "#fff",
                color: PRIMARY,
                fontWeight: 700,
                borderRadius: "10px",
                px: 3, py: 1.5,
                "&:hover": { bgcolor: "#f5f0fc", transform: "translateY(-2px)", boxShadow: "0 10px 24px -10px rgba(255,255,255,.4)" },
                transition: "transform .2s, box-shadow .2s, background .2s",
              }}
            >
              {t("landing.finalCta.ctaDemo")}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate("/signup")}
              sx={{
                color: "#fff",
                borderColor: "rgba(255,255,255,.35)",
                fontWeight: 600,
                borderRadius: "10px",
                px: 3, py: 1.5,
                "&:hover": { bgcolor: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.6)" },
              }}
            >
              {t("landing.finalCta.ctaRegister")}
            </Button>
          </Box>
        </Box>

        {/* Right — quote card */}
        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: "20px",
              p: { xs: "24px", md: "30px" },
              backdropFilter: "blur(8px)",
            }}
          >
            <Typography sx={{ color: "#fff", fontSize: 16, lineHeight: 1.55, mb: "20px" }}>
              {t("landing.finalCta.quoteText")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <Box
                sx={{
                  width: 42, height: 42,
                  borderRadius: "50%",
                  bgcolor: "#d4a017",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1a1614",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                B
              </Box>
              <Box>
                <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 14.5, mb: "1px" }}>
                  {t("landing.finalCta.quoteAuthor")}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,.65)", fontSize: 12.5 }}>
                  {t("landing.finalCta.quoteRole")}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FinalCta;
