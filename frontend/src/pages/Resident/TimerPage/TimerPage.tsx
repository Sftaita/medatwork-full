import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import yearsApi from "../../../services/yearsApi";
import { useLocation, useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Timer from "./components/Timer";
import Garde from "./components/Garde";
import Absence from "./components/Absence";
import HelpDialog from "./components/HelpDialog";

import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

const PAGE_IDS = ["timer", "garde", "absence"] as const;
type PageId = (typeof PAGE_IDS)[number];

const TimerPage = () => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));

  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [noYears, setNoYears] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [activeLink, setActiveLink] = useState<PageId>("timer");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const findYears = async () => {
      setYearsLoading(true);
      try {
        const { method, url } = yearsApi.findResidentYears();
        const request = await axiosPrivate[method](url);
        if (request?.data?.length === 0) setNoYears(true);
        setYears(request.data);
      } catch (error) {
        handleApiError(error);
        const status = (error as any)?.response?.status;
        if (status === 401 || status === 403) {
          navigate("/login", { state: { from: location }, replace: true });
        }
      } finally {
        setYearsLoading(false);
      }
    };
    findYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const tabs: { id: PageId; label: string }[] = PAGE_IDS.map((id) => ({
    id,
    label: t(`timer.tabs.${id}`),
  }));

  return (
    <Box
      sx={{
        fontFamily: 'Inter, -apple-system, "Segoe UI", system-ui, sans-serif',
        color: "#1d1b1a",
        px: compact ? 2 : 3.5,
        pt: compact ? 2 : 3,
        pb: 4,
        boxSizing: "border-box",
        minHeight: "100%",
      }}
    >
      {noYears && (
        <Stack sx={{ width: "100%" }} spacing={2}>
          <Alert severity="info">
            <span dangerouslySetInnerHTML={{ __html: t("timer.noYears") }} />
          </Alert>
        </Stack>
      )}

      {!noYears && (
        <>
          {/* ── Page header ─────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: compact ? "center" : "flex-end",
              justifyContent: "space-between",
              marginBottom: compact ? 14 : 22,
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: compact ? 10.5 : 11.5, fontWeight: 600,
                  letterSpacing: ".12em", textTransform: "uppercase", color: "#8a7d72",
                }}
              >
                {t("timer.pageSubtitle")}
              </div>
              <h1
                style={{
                  margin: compact ? "4px 0 0" : "6px 0 0",
                  fontSize: compact ? 22 : 28,
                  fontWeight: 600,
                  letterSpacing: "-.01em",
                  color: "#1d1b1a",
                }}
              >
                {t("timer.pageTitle")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#fff", border: "1px solid #e7e2da",
                borderRadius: 10, padding: compact ? "7px 11px" : "9px 14px",
                fontSize: compact ? 12.5 : 13, fontWeight: 500, color: "#5a544c",
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: 18,
                  background: theme.palette.primary.main, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}
              >
                ?
              </span>
              {compact ? t("timer.helpShort") : t("timer.howItWorks")}
            </button>
          </div>

          {/* ── Tab bar ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              background: "#fff",
              border: "1px solid #e7e2da",
              borderRadius: 12,
              padding: compact ? 3 : 4,
              marginBottom: compact ? 14 : 18,
            }}
          >
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveLink(id)}
                style={{
                  flex: 1, border: 0,
                  padding: compact ? "8px 0" : "8px 18px",
                  borderRadius: 8,
                  fontSize: compact ? 13 : 13.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                  background: activeLink === id ? theme.palette.primary.main : "transparent",
                  color: activeLink === id ? "#fff" : "#5a544c",
                  transition: "all .12s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Form card ───────────────────────────────────────────── */}
          <div
            style={
              compact
                ? {}
                : {
                    background: "#fff",
                    border: "1px solid #ece7df",
                    borderRadius: 16,
                    padding: 28,
                    boxShadow: "0 1px 2px rgba(0,0,0,.02), 0 8px 28px rgba(40,30,20,.04)",
                  }
            }
          >
            {activeLink === "timer" && (
              <Timer years={years} yearsLoading={yearsLoading} compact={compact} />
            )}
            {activeLink === "garde" && (
              <Garde years={years} yearsLoading={yearsLoading} compact={compact} />
            )}
            {activeLink === "absence" && (
              <Absence years={years} yearsLoading={yearsLoading} compact={compact} />
            )}
          </div>
        </>
      )}

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialTab={activeLink}
      />
    </Box>
  );
};

export default TimerPage;
