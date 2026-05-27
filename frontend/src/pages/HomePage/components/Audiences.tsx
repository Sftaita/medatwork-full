import React from "react";
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

const CARDS = [
  {
    tag: "MACC · Résident",
    title: "Encoder en 30 secondes, depuis son téléphone.",
    desc: "Heures prestées, gardes effectuées, jours de congé : tout se saisit en quelques tapotements. Notifications avant la clôture mensuelle.",
    bullets: [
      "App installable (PWA) — pas de store",
      "Stats de présence et de gardes",
      "Rejoint une année par code unique",
    ],
    dark: false,
  },
  {
    tag: "Manager · Maître de stage",
    title: "Planifier l'année, valider le mois, déléguer le reste.",
    desc: "Création d'années, répartition des semaines, validation mensuelle des feuilles de temps, co-gestion par managers invités avec droits granulaires.",
    bullets: [
      "Gantt visuel et grille de répartition",
      "Semaines modèles réutilisables",
      "Co-managers invités avec droits fins",
    ],
    dark: true,
  },
  {
    tag: "Hospital Admin · RH",
    title: "Superviser l'hôpital, exporter en .xlsx, tracer chaque action.",
    desc: "Tableau de bord d'hôpital, gestion des managers et MACCs, journal d'activité, exports RH centralisés et configuration des notifications.",
    bullets: [
      "Audit log de toutes les actions",
      "Exports Excel centralisés",
      "Staff Planner réservé aux admins",
    ],
    dark: false,
  },
];

const Audiences = () => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, pt: "24px", pb: { xs: "56px", sm: "80px", md: "120px" } }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 4, md: 7 } }}>
        <Eyebrow>Pour qui</Eyebrow>
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
            Trois rôles,{" "}
            <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>
              une
            </Box>{" "}
            plateforme.
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
            Chaque acteur du stage retrouve son propre espace — connecté en temps réel aux autres, sans dépendre des tableurs Excel ou des e-mails de validation.
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
            key={card.tag}
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
              /* No minHeight on mobile — let content define height */
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
                m: 0,
                p: 0,
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
