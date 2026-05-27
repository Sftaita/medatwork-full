import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";

const PRIMARY = "#7B3FA0";

const STEPS = [
  {
    num: "01",
    title: "Encodage",
    desc: "Le MACC saisit ses heures, gardes et absences depuis son téléphone — souvent en quittant le service.",
    who: "MACC",
  },
  {
    num: "02",
    title: "Validation",
    desc: "Le maître de stage valide la feuille de temps mensuelle. Traçabilité complète, ligne par ligne.",
    who: "Manager",
  },
  {
    num: "03",
    title: "Notification RH",
    desc: "Le service RH reçoit une notification dès la validation mensuelle, sans devoir relancer.",
    who: "Auto",
  },
  {
    num: "04",
    title: "Export Excel",
    desc: "Téléchargement individuel ou centralisé en .xlsx — tableaux horaires prêts à facturer.",
    who: "RH",
  },
];

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

const WorkflowSection = () => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, pb: { xs: "56px", sm: "80px", md: "120px" } }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 4, md: 7 } }}>
        <Eyebrow>Workflow</Eyebrow>
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
          <Typography
            sx={{
              fontSize: { xs: 26, sm: 34, md: 48 },
              fontWeight: 700,
              letterSpacing: "-.025em",
              lineHeight: 1.05,
              color: "text.primary",
            }}
          >
            De l'encodage à l'
            <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>
              export RH
            </Box>
            , sans rupture.
          </Typography>
          <Typography
            sx={{
              maxWidth: { xs: "100%", md: 360 },
              color: "text.secondary",
              fontSize: { xs: 14, md: 16 },
              lineHeight: 1.65,
              flexShrink: 0,
            }}
          >
            Quatre étapes simples, tracées de bout en bout. Chaque transition déclenche les bonnes notifications aux bonnes personnes.
          </Typography>
        </Box>
      </Box>

      {/* Steps — 1 col xs, 2 col sm, 4 col md */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: { xs: 2, md: 2.5 },
        }}
      >
        {STEPS.map((step, i) => (
          <Box
            key={step.num}
            data-aos="fade-up"
            data-aos-delay={i * 60}
            sx={{
              bgcolor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: { xs: "16px", md: "20px" },
              p: { xs: "22px 20px", md: "28px 24px" },
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: 0, md: 230 },
              position: "relative",
              overflow: "hidden",
              transition: "transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, border-color .35s",
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                height: "3px",
                width: 0,
                bgcolor: PRIMARY,
                transition: "width .5s cubic-bezier(.2,.7,.2,1)",
              },
              "&:hover": {
                transform: { xs: "none", md: "translateY(-6px)" },
                boxShadow: "0 24px 48px -24px rgba(26,22,20,.2)",
                borderColor: alpha(PRIMARY, 0.3),
              },
              "&:hover::before": { width: "100%" },
            }}
          >
            <Typography
              sx={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: { xs: 36, md: 44 },
                color: PRIMARY,
                lineHeight: 1,
                mb: { xs: "12px", md: "16px" },
              }}
            >
              {step.num}
            </Typography>
            <Typography sx={{ fontSize: { xs: 16, md: 17 }, fontWeight: 600, mb: "6px", letterSpacing: "-.012em", color: "text.primary" }}>
              {step.title}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, md: 14 }, lineHeight: 1.6, color: "text.secondary", flex: 1 }}>
              {step.desc}
            </Typography>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                mt: "14px",
                px: "10px",
                py: "4px",
                borderRadius: "999px",
                bgcolor: alpha(PRIMARY, 0.07),
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "text.secondary",
                alignSelf: "flex-start",
              }}
            >
              {step.who}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WorkflowSection;
