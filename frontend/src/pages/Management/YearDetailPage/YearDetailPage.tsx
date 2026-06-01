import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useMediaQuery from "@mui/material/useMediaQuery";

// Tab panels — unchanged
import Partners from "./component/Partners";
import Residents from "./component/Residents";
import General from "./component/General";
import Setup from "./component/Setup";
import StaffPlanner from "./component/ParametersViews/StaffPlanner";
import ResidentParameters from "./component/ParametersViews/ResidentParameters";
import Compliance from "./component/Compliance";

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabKey = "general" | "residents" | "partners" | "setup" | "compliance";

interface TabDef {
  key: TabKey;
  labelKey: string;
  count?: number | null;
}

const TAB_DEFS: TabDef[] = [
  { key: "general",    labelKey: "yearDetail.tabs.validation" },
  { key: "residents",  labelKey: "yearDetail.tabs.maccs" },
  { key: "partners",   labelKey: "yearDetail.tabs.partners" },
  { key: "setup",      labelKey: "yearDetail.tabs.settings" },
  { key: "compliance", labelKey: "yearDetail.tabs.compliance" },
];

// Sub-views that live inside the "setup" tab
const SETUP_SUB_VIEWS = ["staffPlanner", "residentParameters"] as const;
type SubView = (typeof SETUP_SUB_VIEWS)[number];
type ActiveLink = TabKey | SubView;

// ── Sticky tab bar ─────────────────────────────────────────────────────────────

interface TabBarProps {
  tabs: TabDef[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}

const TabBar = ({ tabs, active, onChange }: TabBarProps) => {
  const theme = useTheme();
  const isMd   = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { t }  = useTranslation();
  const isDark = theme.palette.mode === "dark";

  const topbarH = { xs: 58, sm: 66, md: 71 };

  const barBg = isDark
    ? alpha(theme.palette.background.paper, 0.86)
    : alpha("#ffffff", 0.86);

  return (
    <Box
      role="tablist"
      aria-label={t("yearDetail.tabBarLabel", "Onglets de l'année")}
      sx={{
        position:       "sticky",
        top:            topbarH,
        zIndex:         20,
        display:        "flex",
        gap:            "4px",
        p:              "6px",
        mb:             3,
        background:     barBg,
        backdropFilter: "blur(10px)",
        border:         `1px solid ${theme.palette.divider}`,
        borderRadius:   "14px",
        boxShadow:      `0 1px 2px ${alpha(theme.palette.common.black, 0.03)}`,
        overflowX:      "auto",
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const isOn = tab.key === active;
        return (
          <Box
            key={tab.key}
            component="button"
            role="tab"
            aria-selected={isOn}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => onChange(tab.key)}
            sx={{
              flex:          "none",
              display:       "flex",
              alignItems:    "center",
              gap:           "8px",
              px:            isMd ? "18px" : "12px",
              py:            "9px",
              borderRadius:  "10px",
              border:        "none",
              cursor:        "pointer",
              fontFamily:    "inherit",
              fontWeight:    600,
              fontSize:      "12.5px",
              letterSpacing: ".07em",
              textTransform: "uppercase",
              whiteSpace:    "nowrap",
              transition:    "background .18s, color .18s, box-shadow .18s",
              outline:       "none",
              "&:focus-visible": {
                outline:       `2px solid ${theme.palette.primary.main}`,
                outlineOffset: "2px",
              },
              background: isOn ? theme.palette.primary.main : "transparent",
              color:      isOn
                ? theme.palette.primary.contrastText
                : theme.palette.text.secondary,
              boxShadow: isOn
                ? `0 4px 12px -3px ${alpha(theme.palette.primary.main, 0.45)}`
                : "none",
              "&:hover": isOn
                ? {}
                : {
                    background: theme.palette.background.default,
                    color:      theme.palette.text.primary,
                  },
            }}
          >
            {t(tab.labelKey)}
            {tab.count != null && (
              <Box
                component="span"
                sx={{
                  fontFamily:   "'JetBrains Mono', 'Roboto Mono', monospace",
                  fontSize:     "10.5px",
                  px:           "6px",
                  py:           "1px",
                  borderRadius: "999px",
                  background:   isOn
                    ? alpha("#fff", 0.22)
                    : theme.palette.custom.primarySoft,
                  color: isOn
                    ? "#fff"
                    : theme.palette.primary.main,
                }}
              >
                {tab.count}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const YearDetailPage = () => {
  const { t }    = useTranslation();
  const theme    = useTheme();
  const isMd     = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const navigate = useNavigate();
  const { state } = useLocation();

  // ── State from navigation ──────────────────────────────────────────────────
  const [id, setId]             = useState<number | null>(null);
  const [title, setTitle]       = useState("");
  const [adminRights, setAdminRights] = useState<boolean | null>(null);

  useEffect(() => {
    if (state) {
      setId(state.id);
      setTitle(state.title);
      setAdminRights(state.adminRights);
    } else {
      navigate("/manager/years");
    }
  }, [navigate, state]);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const defaultTab = (state?.defaultTab as TabKey) ?? "general";
  const [activeLink, setActiveLink] = useState<ActiveLink>(defaultTab);

  const isSubView  = (SETUP_SUB_VIEWS as readonly string[]).includes(activeLink);
  const activeTab  = isSubView ? "setup" : (activeLink as TabKey);

  // ── Tab counts (optional — filled by child callbacks) ─────────────────────
  const [partnerCount, setPartnerCount]   = useState<number | null>(null);
  const [residentCount, setResidentCount] = useState<number | null>(null);

  const tabs: TabDef[] = TAB_DEFS.map((t) => ({
    ...t,
    count:
      t.key === "partners"  ? partnerCount  :
      t.key === "residents" ? residentCount :
      null,
  }));

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (isSubView) {
      setActiveLink("setup");
    } else {
      navigate(-1);
    }
  }, [isSubView, navigate]);

  const handleTabChange = (key: TabKey) => {
    setActiveLink(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Layout values ──────────────────────────────────────────────────────────
  const px = isMd ? 4 : 2;

  return (
    <Box
      sx={{
        px,
        pt: 3,
        pb: 8,
        maxWidth: 1500,
        mx: "auto",
        width: "100%",
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
        mb={2.5}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              fontSize:      "11.5px",
              fontWeight:    700,
              letterSpacing: ".14em",
              color:         "text.disabled",
              lineHeight:    1,
              display:       "block",
              mb:            0.75,
            }}
          >
            {t("yearDetail.breadcrumb", "Tableau de bord")}
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography
              variant="h4"
              sx={{
                fontFamily:    "'Poppins', sans-serif",
                fontWeight:    700,
                fontSize:      { xs: "22px", md: "27px" },
                letterSpacing: "-.01em",
                lineHeight:    1.2,
              }}
            >
              {title || " "}
            </Typography>
            <Chip
              label={t("yearDetail.chip", "Année active")}
              color="primary"
              size="small"
              sx={{ fontWeight: 600, fontSize: 13 }}
            />
          </Box>
        </Box>

        <IconButton
          onClick={handleBack}
          aria-label={t("yearDetail.back")}
          sx={{
            width:        40,
            height:       40,
            borderRadius: "11px",
            border:       `1px solid ${theme.palette.divider}`,
            bgcolor:      "background.paper",
            color:        "text.primary",
            flexShrink:   0,
            "&:hover":    { bgcolor: "background.default" },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Sticky segmented tab bar ─────────────────────────────────────── */}
      {!isSubView && (
        <TabBar
          tabs={tabs}
          active={activeTab}
          onChange={handleTabChange}
        />
      )}

      {/* Sub-view header (staffPlanner / residentParameters) */}
      {isSubView && (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          mb={2.5}
          sx={{
            position:    "sticky",
            top:         { xs: 58, sm: 66, md: 71 },
            zIndex:      20,
            background:  alpha(theme.palette.background.paper, 0.86),
            backdropFilter: "blur(10px)",
            border:      `1px solid ${theme.palette.divider}`,
            borderRadius: "14px",
            px: 2,
            py: "10px",
          }}
        >
          <IconButton
            onClick={() => setActiveLink("setup")}
            aria-label={t("yearDetail.back")}
            size="small"
            sx={{
              borderRadius: "8px",
              border:       `1px solid ${theme.palette.divider}`,
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, fontSize: "12.5px", letterSpacing: ".05em", textTransform: "uppercase" }}
          >
            {t("yearDetail.tabs.settings")}
          </Typography>
        </Box>
      )}

      {/* ── Tab panels ──────────────────────────────────────────────────── */}
      <Box
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeLink === "general" && (
          <General yearId={id} adminRights={adminRights} />
        )}
        {activeLink === "residents" && (
          <Residents
            yearId={id}
            adminRights={adminRights}
            setActiveLink={setActiveLink}
          />
        )}
        {activeLink === "partners" && (
          <Partners id={id} adminRights={adminRights} />
        )}
        {activeLink === "setup" && (
          <Setup setActiveLink={setActiveLink} />
        )}
        {activeLink === "staffPlanner" && (
          <StaffPlanner yearId={id} />
        )}
        {activeLink === "residentParameters" && (
          <ResidentParameters yearId={id} />
        )}
        {activeLink === "compliance" && (
          <Compliance yearId={id} />
        )}
      </Box>
    </Box>
  );
};

export default YearDetailPage;
