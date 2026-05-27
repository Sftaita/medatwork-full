import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";

import useAuth from "../../hooks/useAuth";
import Hero from "./components/Hero";
import TrustBar from "./components/TrustBar";
import MarqueeStrip from "./components/MarqueeStrip";
import Audiences from "./components/Audiences";
import { FeaturePlanning, FeatureEncodage, FeatureAnnees } from "./components/FeatureSections";
import WorkflowSection from "./components/WorkflowSection";
import FeatureGrid12 from "./components/FeatureGrid12";
import TechStrip from "./components/TechStrip";
import FinalCta from "./components/FinalCta";

const ROLE_HOME: Record<string, string> = {
  manager:        "/manager/years",
  hospital_admin: "/hospital-admin/dashboard",
  resident:       "/maccs/years",
  super_admin:    "/admin",
};

const HomePage = () => {
  const theme    = useTheme();
  const navigate = useNavigate();
  const { authentication } = useAuth();

  // Redirect uniquement si un access token actif est déjà en mémoire
  // (= même session, pas juste un cookie persisté).
  // Après logout, AccessToken est null → pas de redirect.
  useEffect(() => {
    if (authentication.AccessToken && authentication.role) {
      const target = ROLE_HOME[authentication.role] ?? "/login";
      navigate(target, { replace: true });
    }
  }, [authentication.AccessToken, authentication.role]);

  return (
    <Box>
      {/* ── Hero ── */}
      <Box
        position={"relative"}
        sx={{
          marginTop: -13,
          paddingTop: { xs: 13, md: 16 },
          paddingBottom: { xs: "20px", md: "40px" },
          backgroundColor: theme.palette.alternate.main,
          backgroundImage: `linear-gradient(120deg, ${theme.palette.background.paper} 0%, ${theme.palette.alternate.main} 100%)`,
        }}
      >
        <Hero />
        <Box
          component={"svg"}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          viewBox="0 0 1920 100.1"
          sx={{ width: "100%", marginBottom: theme.spacing(-1) }}
        >
          <path fill={theme.palette.background.default} d="M0,0c0,0,934.4,93.4,1920,0v100.1H0L0,0z" />
        </Box>
      </Box>

      {/* ── Trustbar ── */}
      <TrustBar />

      {/* ── Marquee ticker ── */}
      <MarqueeStrip />

      {/* ── Audiences ── */}
      <Box id="audiences" sx={{ scrollMarginTop: { xs: "34px", sm: "42px", md: "47px" } }}>
        <Audiences />
      </Box>

      {/* ── Feature 1 — Planning ── */}
      <Box id="planning" sx={{ scrollMarginTop: { xs: "58px", sm: "66px", md: "71px" } }}>
        <FeaturePlanning />
      </Box>

      {/* ── Feature 2 — Encodage (dark) ── */}
      <FeatureEncodage />

      {/* ── Feature 3 — Années ── */}
      <FeatureAnnees />

      {/* ── Workflow ── */}
      <Box id="workflow" sx={{ scrollMarginTop: { xs: "58px", sm: "66px", md: "71px" } }}>
        <WorkflowSection />
      </Box>

      {/* ── 12 fonctionnalités (dark) ── */}
      <FeatureGrid12 />

      {/* ── Sécurité & tech ── */}
      <Box id="tech" sx={{ scrollMarginTop: { xs: "34px", sm: "42px", md: "47px" } }}>
        <TechStrip />
      </Box>

      {/* ── Final CTA ── */}
      <FinalCta />
    </Box>
  );
};

export default HomePage;
