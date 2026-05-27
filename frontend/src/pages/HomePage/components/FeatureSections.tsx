import React from "react";
import { useTranslation } from "react-i18next";
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

// ── Feature 1 — Planning ──────────────────────────────────────────────────────

export function FeaturePlanning() {
  const theme = useTheme();
  const { t } = useTranslation();

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
          <Box sx={{ mb: { xs: "28px", md: "36px" } }}>
            <Eyebrow>{t("landing.featurePlanning.eyebrow")}</Eyebrow>
            <Typography
              sx={{ fontSize: { xs: 26, sm: 32, md: 44 }, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.06, mt: "14px", mb: "18px", color: "text.primary" }}
            >
              {t("landing.featurePlanning.titleStart")}{" "}
              <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>{t("landing.featurePlanning.titleEm")}</Box>
              {t("landing.featurePlanning.titleEnd")}
            </Typography>
            <Typography sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.65, color: "text.secondary" }}>
              {t("landing.featurePlanning.sub")}
            </Typography>
          </Box>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
            {[0, 1, 2, 3].map((i) => (
              <CheckItem key={i}><span dangerouslySetInnerHTML={{ __html: t(`landing.featurePlanning.check${i}`) }} /></CheckItem>
            ))}
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
            <Box component="img" src="/landing/repartition.png" alt={t("landing.featurePlanning.imgAlt")} sx={{ width: "100%", display: "block" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Feature 2 — Encodage (dark) ───────────────────────────────────────────────

export function FeatureEncodage() {
  const { t } = useTranslation();

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
          {/* Visual */}
          <Box data-aos="fade-up" sx={{ order: { xs: 2, md: 1 } }}>
            <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center" }}>
              <Box sx={{ width: 200, borderRadius: "26px", overflow: "hidden", boxShadow: "0 24px 50px -18px rgba(26,22,20,.7)", border: "6px solid #2a2421", bgcolor: "#1a1614" }}>
                <Box component="img" src="/landing/encodage-mobile.png" alt={t("landing.featureEncodage.imgAltMobile")} sx={{ width: "100%", display: "block" }} />
              </Box>
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 540 }}>
              <Box sx={{ position: "absolute", left: 0, top: 0, width: "84%", borderRadius: "12px", overflow: "hidden", boxShadow: "0 30px 60px -28px rgba(26,22,20,.55), 0 4px 14px -6px rgba(26,22,20,.2)", border: "1px solid rgba(255,255,255,.08)" }}>
                <Box component="img" src="/landing/encodage-desktop.png" alt={t("landing.featureEncodage.imgAltDesktop")} sx={{ width: "100%", display: "block" }} />
              </Box>
              <Box sx={{ position: "absolute", right: 0, bottom: 0, width: 210, height: 450, borderRadius: "30px", overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(26,22,20,.6)", border: "7px solid #1a1614", bgcolor: "#1a1614" }}>
                <Box component="img" src="/landing/encodage-mobile.png" alt={t("landing.featureEncodage.imgAltMobile")} sx={{ width: "100%", display: "block" }} />
              </Box>
            </Box>
          </Box>

          {/* Copy */}
          <Box sx={{ order: { xs: 1, md: 2 } }}>
            <Box sx={{ mb: { xs: "28px", md: "36px" } }}>
              <Eyebrow gold light>{t("landing.featureEncodage.eyebrow")}</Eyebrow>
              <Typography sx={{ fontSize: { xs: 26, sm: 32, md: 44 }, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.06, mt: "14px", mb: "18px", color: "#fbf8f1" }}>
                {t("landing.featureEncodage.titleStart")}{" "}
                <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400, color: GOLD }}>{t("landing.featureEncodage.titleEm")}</Box>
              </Typography>
              <Typography sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.65, color: "rgba(251,248,241,.72)" }}>
                {t("landing.featureEncodage.sub")}
              </Typography>
            </Box>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
              {[0, 1, 2, 3].map((i) => (
                <CheckItem key={i} gold>
                  <span style={{ color: "rgba(251,248,241,.85)" }} dangerouslySetInnerHTML={{ __html: t(`landing.featureEncodage.check${i}`) }} />
                </CheckItem>
              ))}
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
  const { t } = useTranslation();

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
          <Box sx={{ mb: { xs: "28px", md: "36px" } }}>
            <Eyebrow>{t("landing.featureAnnees.eyebrow")}</Eyebrow>
            <Typography sx={{ fontSize: { xs: 26, sm: 32, md: 44 }, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.06, mt: "14px", mb: "18px", color: "text.primary" }}>
              {t("landing.featureAnnees.titleStart")}{" "}
              <Box component="em" sx={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 400 }}>{t("landing.featureAnnees.titleEm")}</Box>{" "}
              {t("landing.featureAnnees.titleEnd")}
            </Typography>
            <Typography sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.65, color: "text.secondary" }}>
              {t("landing.featureAnnees.sub")}
            </Typography>
          </Box>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
            {[0, 1, 2, 3].map((i) => (
              <CheckItem key={i}><span dangerouslySetInnerHTML={{ __html: t(`landing.featureAnnees.check${i}`) }} /></CheckItem>
            ))}
          </Box>
        </Box>

        {/* Visual */}
        <Box data-aos="fade-up">
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center" }}>
            <Box sx={{ width: 200, borderRadius: "26px", overflow: "hidden", boxShadow: "0 24px 50px -18px rgba(26,22,20,.35)", border: `6px solid ${theme.palette.mode === "dark" ? "#333" : "#1a1614"}`, bgcolor: "#1a1614" }}>
              <Box component="img" src="/landing/mes-annees-mobile.png" alt={t("landing.featureAnnees.imgAltMobile")} sx={{ width: "100%", display: "block" }} />
            </Box>
          </Box>
          <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 500 }}>
            <Box sx={{ position: "absolute", left: 0, top: 0, width: "84%", borderRadius: "12px", overflow: "hidden", boxShadow: "0 30px 60px -28px rgba(26,22,20,.35), 0 4px 14px -6px rgba(26,22,20,.12)", border: `1px solid ${theme.palette.divider}`, bgcolor: "background.paper" }}>
              <Box component="img" src="/landing/mes-annees-desktop.png" alt={t("landing.featureAnnees.imgAltDesktop")} sx={{ width: "100%", display: "block" }} />
            </Box>
            <Box sx={{ position: "absolute", right: 0, bottom: 0, width: 195, height: 415, borderRadius: "28px", overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(26,22,20,.45)", border: `7px solid ${theme.palette.mode === "dark" ? "#222" : "#1a1614"}`, bgcolor: "#1a1614" }}>
              <Box component="img" src="/landing/mes-annees-mobile.png" alt={t("landing.featureAnnees.imgAltMobile")} sx={{ width: "100%", display: "block" }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
