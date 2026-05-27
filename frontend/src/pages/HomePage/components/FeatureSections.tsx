import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";

const PRIMARY = "#7B3FA0";
const GOLD = "#d4a017";
const INK = "#1a1614";

function Eyebrow({ children, gold, light }: { children: React.ReactNode; gold?: boolean; light?: boolean }) {
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
        color: light ? "rgba(251,248,241,.65)" : "text.disabled",
        "&::before": {
          content: '""',
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: gold ? GOLD : PRIMARY,
          flexShrink: 0,
        },
      }}
    >
      {children}
    </Box>
  );
}

function CheckItem({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <Box component="li" sx={{ display: "flex", gap: "12px", alignItems: "flex-start", fontSize: { xs: 14, md: 15 }, lineHeight: 1.55 }}>
      <Box
        sx={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "6px",
          bgcolor: gold ? "rgba(212,160,23,.18)" : alpha(PRIMARY, 0.12),
          color: gold ? GOLD : PRIMARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: "1px",
        }}
      >
        <CheckIcon sx={{ fontSize: 12 }} />
      </Box>
      {children}
    </Box>
  );
}

// ── Shared section header ─────────────────────────────────────────────────────

function SectionHead({
  eyebrow,
  title,
  sub,
  gold,
  light,
  dark,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  gold?: boolean;
  light?: boolean;
  dark?: boolean;
}) {
  return (
    <Box sx={{ mb: { xs: "28px", md: "36px" } }}>
      <Eyebrow gold={gold} light={light}>{eyebrow}</Eyebrow>
      <Typography
        sx={{
          fontSize: { xs: 26, sm: 32, md: 44 },
          fontWeight: 700,
          letterSpacing: "-.025em",
          lineHeight: 1.06,
          mt: "14px",
          mb: "18px",
          color: dark ? "#fbf8f1" : "text.primary",
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 15, md: 17 },
          lineHeight: 1.65,
          color: dark ? "rgba(251,248,241,.72)" : "text.secondary",
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
}

// ── Feature 1 — Planning ──────────────────────────────────────────────────────

export function FeaturePlanning() {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, pb: { xs: "56px", sm: "80px", md: "120px" } }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.15fr" },
          gap: { xs: "36px", md: "90px" },
          alignItems: "center",
        }}
      >
        {/* Copy */}
        <Box>
          <SectionHead
            eyebrow="01 · Planning"
            title={<>Qui fait <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>quoi</Box>, semaine après semaine.</>}
            sub="Visualisez d'un coup d'œil la répartition de vos MACCs sur les postes ouverts. Deux vues complémentaires, charge en temps réel, postes incomplets signalés."
          />
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
            <CheckItem><span><strong>Deux vues complémentaires</strong> — Gantt par MACC pour les trajectoires, grille par poste pour les couvertures.</span></CheckItem>
            <CheckItem><span><strong>Charge par MACC</strong> en temps réel, semaines couvertes, postes incomplets signalés.</span></CheckItem>
            <CheckItem><span><strong>Semaines modèles</strong> réutilisables pour accélérer les plannings récurrents.</span></CheckItem>
            <CheckItem><span><strong>Publication en un clic</strong> — les MACCs reçoivent leur planning dès la publication.</span></CheckItem>
          </Box>
        </Box>

        {/* Visual */}
        <Box data-aos="fade-up">
          <Box
            sx={{
              borderRadius: { xs: "12px", md: "14px" },
              overflow: "hidden",
              boxShadow: "0 20px 50px -24px rgba(26,22,20,.3), 0 4px 14px -6px rgba(26,22,20,.1)",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}
          >
            <Box component="img" src="/landing/repartition.png" alt="Répartition des semaines" sx={{ width: "100%", display: "block" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Feature 2 — Encodage (dark) ───────────────────────────────────────────────

export function FeatureEncodage() {
  return (
    <Box component="section" sx={{ bgcolor: INK, color: "#fbf8f1" }}>
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, py: { xs: "56px", sm: "80px", md: "120px" } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 1fr" },
            gap: { xs: "36px", md: "90px" },
            alignItems: "center",
          }}
        >
          {/* Visual — desktop: left / mobile: bottom */}
          <Box data-aos="fade-up" sx={{ order: { xs: 2, md: 1 } }}>
            {/* Mobile : show phone only, centered */}
            <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center" }}>
              <Box
                sx={{
                  width: 200,
                  borderRadius: "26px",
                  overflow: "hidden",
                  boxShadow: "0 24px 50px -18px rgba(26,22,20,.7)",
                  border: "6px solid #2a2421",
                  bgcolor: "#1a1614",
                }}
              >
                <Box component="img" src="/landing/encodage-mobile.png" alt="Encodage — mobile" sx={{ width: "100%", display: "block" }} />
              </Box>
            </Box>

            {/* Desktop : desktop screenshot + phone overlay */}
            <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 540 }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "84%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 30px 60px -28px rgba(26,22,20,.55), 0 4px 14px -6px rgba(26,22,20,.2)",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <Box component="img" src="/landing/encodage-desktop.png" alt="Encodage — desktop" sx={{ width: "100%", display: "block" }} />
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 210,
                  height: 450,
                  borderRadius: "30px",
                  overflow: "hidden",
                  boxShadow: "0 30px 60px -20px rgba(26,22,20,.6)",
                  border: "7px solid #1a1614",
                  bgcolor: "#1a1614",
                }}
              >
                <Box component="img" src="/landing/encodage-mobile.png" alt="Encodage — mobile" sx={{ width: "100%", display: "block" }} />
              </Box>
            </Box>
          </Box>

          {/* Copy */}
          <Box sx={{ order: { xs: 1, md: 2 } }}>
            <SectionHead
              eyebrow="02 · Encodage du temps"
              title={<>Vos MACCs encodent en <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400, color: GOLD }}>30 secondes.</Box></>}
              sub="Trois onglets, trois gestes : Horaires · Gardes · Absences. Interface mobile-first, calcul automatique, rappels avant clôture."
              gold
              light
              dark
            />
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
              <CheckItem gold><span style={{ color: "rgba(251,248,241,.85)" }}><strong style={{ color: "#fbf8f1" }}>Garde appelable vs sur place</strong> avec calcul automatique de la durée.</span></CheckItem>
              <CheckItem gold><span style={{ color: "rgba(251,248,241,.85)" }}><strong style={{ color: "#fbf8f1" }}>Notifications avant clôture</strong> — plus jamais d'oubli de saisie.</span></CheckItem>
              <CheckItem gold><span style={{ color: "rgba(251,248,241,.85)" }}><strong style={{ color: "#fbf8f1" }}>Mode hors ligne</strong> — l'app reste utilisable sans réseau, synchronise plus tard.</span></CheckItem>
              <CheckItem gold><span style={{ color: "rgba(251,248,241,.85)" }}><strong style={{ color: "#fbf8f1" }}>Commentaires facultatifs</strong> pour contextualiser une garde particulière.</span></CheckItem>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Feature 3 — Années ────────────────────────────────────────────────────────

export function FeatureAnnees() {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2.5, md: 4 }, py: { xs: "56px", sm: "80px", md: "120px" } }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.15fr" },
          gap: { xs: "36px", md: "90px" },
          alignItems: "center",
        }}
      >
        {/* Copy */}
        <Box>
          <SectionHead
            eyebrow="03 · Années de formation"
            title={<>Une année <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>complète</Box> en deux étapes.</>}
            sub="Titre, période, spécialité, hôpital : Med@Work calcule la durée, déduit le type de période, et génère un code unique. La carte d'aperçu se met à jour en direct."
          />
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
            <CheckItem><span><strong>Statuts automatiques</strong> — En cours / À venir / Archivée.</span></CheckItem>
            <CheckItem><span><strong>Co-gestion</strong> — invitez d'autres managers avec des droits fins (validation, agenda, exports…).</span></CheckItem>
            <CheckItem><span><strong>Code d'identification</strong> copiable — les MACCs rejoignent l'année en un coup d'œil.</span></CheckItem>
            <CheckItem><span><strong>Statut d'import</strong> par MACC — voyez qui a déjà importé son horaire.</span></CheckItem>
          </Box>
        </Box>

        {/* Visual */}
        <Box data-aos="fade-up">
          {/* Mobile : phone only, centered */}
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center" }}>
            <Box
              sx={{
                width: 200,
                borderRadius: "26px",
                overflow: "hidden",
                boxShadow: "0 24px 50px -18px rgba(26,22,20,.35)",
                border: `6px solid ${theme.palette.mode === "dark" ? "#333" : "#1a1614"}`,
                bgcolor: "#1a1614",
              }}
            >
              <Box component="img" src="/landing/mes-annees-mobile.png" alt="Mes années — mobile" sx={{ width: "100%", display: "block" }} />
            </Box>
          </Box>

          {/* Desktop : desktop screenshot + phone overlay */}
          <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 500 }}>
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "84%",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 30px 60px -28px rgba(26,22,20,.35), 0 4px 14px -6px rgba(26,22,20,.12)",
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
              }}
            >
              <Box component="img" src="/landing/mes-annees-desktop.png" alt="Mes années — desktop" sx={{ width: "100%", display: "block" }} />
            </Box>
            <Box
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 195,
                height: 415,
                borderRadius: "28px",
                overflow: "hidden",
                boxShadow: "0 30px 60px -20px rgba(26,22,20,.45)",
                border: `7px solid ${theme.palette.mode === "dark" ? "#222" : "#1a1614"}`,
                bgcolor: "#1a1614",
              }}
            >
              <Box component="img" src="/landing/mes-annees-mobile.png" alt="Mes années — mobile" sx={{ width: "100%", display: "block" }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
