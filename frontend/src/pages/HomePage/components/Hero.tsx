import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const GOLD = "#d4a017";
const INK  = "#1a1614";

const META = [
  { val: "12",        label: "Grandes fonctionnalités" },
  { val: "3",         label: "Rôles · MACC / Manager / RH" },
  { val: "PWA",       label: "Installable · iOS & Android" },
  { val: "FR·NL·EN",  label: "Multilingue" },
];

const Hero = () => {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr .95fr" },
          gap: { xs: "48px", md: "80px" },
          alignItems: "center",
        }}
      >
        {/* ── Left: text ─────────────────────────────────────────────────── */}
        <Box>
          {/* Eyebrow */}
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
              mb: "20px",
              "&::before": {
                content: '""',
                width: 6, height: 6,
                borderRadius: "50%",
                bgcolor: GOLD,
                flexShrink: 0,
              },
            }}
          >
            Logiciel de gestion · Stages médicaux
          </Box>

          {/* Headline */}
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 38, sm: 52, md: 68, lg: 80 },
              fontWeight: 700,
              letterSpacing: "-.03em",
              lineHeight: 1.02,
              color: "text.primary",
              mb: { xs: "22px", md: "30px" },
            }}
          >
            Le planning des MACCs,{" "}
            <Box
              component="em"
              sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}
            >
              enfin
            </Box>{" "}
            sans tableurs.
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              fontSize: { xs: 15, md: 18 },
              lineHeight: 1.65,
              color: "text.secondary",
              maxWidth: 560,
              mb: { xs: "30px", md: "42px" },
            }}
          >
            Med@Work centralise la création des années de formation, la répartition des semaines,
            l'encodage des heures et des gardes — jusqu'à l'export RH validé. Une seule plateforme pour les{" "}
            <strong>maîtres de stage</strong>, les <strong>MACCs</strong> et le{" "}
            <strong>service RH</strong>.
          </Typography>

          {/* CTAs */}
          <Box sx={{ display: "flex", gap: "12px", flexWrap: "wrap", mb: { xs: "36px", md: "60px" } }}>
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardIcon sx={{ fontSize: "14px !important", transition: "transform .25s cubic-bezier(.2,.7,.2,1)" }} />}
              component="a"
              href="mailto:contact@medatwork.be"
              sx={{
                px: "20px", py: "11px", borderRadius: "10px",
                fontWeight: 600, fontSize: 14,
                "&:hover .MuiButton-endIcon svg": { transform: "translateX(3px)" },
              }}
            >
              Demander une démo
            </Button>
            <Button
              variant="outlined"
              component="a"
              href="#planning"
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "16px !important" }} />}
              sx={{ px: "20px", py: "11px", borderRadius: "10px", fontWeight: 600, fontSize: 14 }}
            >
              Voir le produit
            </Button>
          </Box>

          {/* Meta stats */}
          <Box sx={{ display: "flex", gap: { xs: "18px", md: "32px" }, alignItems: "center", flexWrap: "wrap" }}>
            {META.map((item, i) => (
              <React.Fragment key={item.val}>
                {i > 0 && (
                  <Box sx={{ width: "1px", height: 40, bgcolor: "divider", display: { xs: "none", sm: "block" } }} />
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <Typography
                    sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 700, letterSpacing: "-.015em", lineHeight: 1, color: "text.primary" }}
                  >
                    {item.val}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 10.5, md: 12 }, color: "text.disabled", fontFamily: "monospace", letterSpacing: ".04em" }}>
                    {item.label}
                  </Typography>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {/* ── Right: visual (desktop only) ───────────────────────────────── */}
        <Box
          data-aos="fade-up"
          sx={{ position: "relative", display: { xs: "none", md: "block" } }}
        >
          {/* Main frame — floating */}
          <Box
            sx={{
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 30px 80px -30px rgba(26,22,20,.35), 0 4px 14px -6px rgba(26,22,20,.12)",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
              "@keyframes floatHero": {
                "0%, 100%": { transform: "translateY(0) rotate(.6deg)" },
                "50%":       { transform: "translateY(-10px) rotate(.6deg)" },
              },
              animation: "floatHero 8s ease-in-out infinite",
              "&:hover": { animationPlayState: "paused" },
              transition: "box-shadow .6s",
            }}
          >
            <Box
              component="img"
              src="/landing/gantt.png"
              alt="Vue Gantt — trajectoires MACC par semaine"
              sx={{ width: "100%", display: "block" }}
            />
          </Box>

          {/* Badge — top left */}
          <Box
            sx={{
              position: "absolute",
              left: -28, top: 38,
              bgcolor: INK,
              color: "#fbf8f1",
              borderRadius: "12px",
              px: "16px", py: "12px",
              boxShadow: "0 18px 40px -16px rgba(26,22,20,.5)",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              "@keyframes floatBadge": {
                "0%, 100%": { transform: "rotate(-2deg) translateY(0)" },
                "50%":       { transform: "rotate(-2deg) translateY(-6px)" },
              },
              animation: "floatBadge 7s ease-in-out infinite",
            }}
          >
            <Box
              sx={{
                width: 8, height: 8,
                borderRadius: "50%",
                bgcolor: GOLD,
                "@keyframes pulseDot": {
                  "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,160,23,.45)" },
                  "50%":       { boxShadow: "0 0 0 8px rgba(212,160,23,0)" },
                },
                animation: "pulseDot 2s ease-in-out infinite",
              }}
            />
            <span><strong>10</strong> MACCs · <strong>14</strong> semaines · <strong>56</strong> rotations</span>
          </Box>

          {/* Pill — bottom right */}
          <Box
            sx={{
              position: "absolute",
              right: -18, bottom: 50,
              bgcolor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "14px",
              px: "16px", py: "14px",
              boxShadow: "0 18px 40px -18px rgba(26,22,20,.35)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              maxWidth: 250,
              "@keyframes floatPill": {
                "0%, 100%": { transform: "rotate(2deg) translateY(0)" },
                "50%":       { transform: "rotate(2deg) translateY(-8px)" },
              },
              animation: "floatPill 9s ease-in-out infinite",
            }}
          >
            {/* Stacked avatars */}
            <Box sx={{ display: "flex" }}>
              {[
                { initials: "JU", color: "#5b9b6a" },
                { initials: "TE", color: "#d4a017" },
                { initials: "VH", color: "#c46827" },
                { initials: "FR", color: "#6b4cd6" },
              ].map((av, i) => (
                <Box
                  key={av.initials}
                  sx={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    bgcolor: av.color,
                    border: `2px solid ${theme.palette.background.paper}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    ml: i === 0 ? 0 : "-8px",
                  }}
                >
                  {av.initials}
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.35, m: 0 }}>
              <Box component="strong" sx={{ color: "text.primary" }}>Validation mensuelle</Box>
              <br />
              Notifiée au RH automatiquement.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Mobile visual */}
      <Box sx={{ display: { xs: "block", md: "none" }, mt: "32px" }}>
        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 20px 50px -20px rgba(26,22,20,.25)",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            component="img"
            src="/landing/gantt.png"
            alt="Vue Gantt"
            sx={{ width: "100%", display: "block" }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Hero;
