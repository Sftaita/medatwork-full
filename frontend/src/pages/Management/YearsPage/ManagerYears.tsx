import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import useManagerYears from "../../../hooks/data/useManagerYears";
import { useTopbarSearch } from "../../../hooks/useTopbarSearch";
import YearCard from "./component/YearCard";
import { C } from "../../../styles/tableStyles";
import { tokens } from "../../../doc/CustomizedTheme";
import dayjs from "@/lib/dayjs";

export type YearStatus = "current" | "upcoming" | "archived";

export const getYearStatus = (year: any): YearStatus => {
  const today = dayjs();
  const end = dayjs(year.dateOfEnd);
  const start = dayjs(year.dateOfStart);
  if (end.isBefore(today, "day")) return "archived";
  if (start.isAfter(today, "day")) return "upcoming";
  return "current";
};

// ── Skeleton components ───────────────────────────────────────────────────────

function SectionHeaderSkeleton() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Skeleton variant="circular" width={7} height={7} />
      <Skeleton variant="text" width={90} height={16} sx={{ transform: "none" }} />
      <Skeleton variant="rounded" width={28} height={22} sx={{ borderRadius: "999px" }} />
      <Box sx={{ flex: 1, height: "1px", bgcolor: C.line }} />
    </Box>
  );
}

function YearCardLargeSkeleton() {
  return (
    <Box sx={{
      bgcolor: "background.paper",
      border: `1px solid ${C.line}`,
      borderRadius: "18px",
      overflow: "hidden",
      boxShadow: `0 1px 2px rgba(0,0,0,.02), 0 10px 30px rgba(123,63,160,.06)`,
    }}>
      <Skeleton variant="rectangular" height={4} sx={{ bgcolor: C.line2 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr auto 1fr" } }}>
        {/* LEFT */}
        <Box sx={{ p: { xs: "20px", md: "26px 28px 24px" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Skeleton variant="rounded" width={84} height={26} sx={{ borderRadius: "999px" }} />
            <Skeleton variant="text" width={64} height={14} sx={{ transform: "none" }} />
          </Box>

          <Skeleton variant="text" width="68%" height={30} sx={{ transform: "none", mb: "10px" }} />

          <Box sx={{ display: "flex", gap: "28px", mb: "20px", mt: 0.5 }}>
            {["120px", "100px"].map((w, i) => (
              <Box key={i}>
                <Skeleton variant="text" width={44} height={12} sx={{ transform: "none", mb: "4px" }} />
                <Skeleton variant="text" width={w} height={18} sx={{ transform: "none" }} />
              </Box>
            ))}
          </Box>

          <Skeleton variant="text" width={48} height={12} sx={{ transform: "none", mb: 1 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {[100, 118, 92].map((w, i) => (
              <Skeleton key={i} variant="rounded" width={w} height={32} sx={{ borderRadius: "999px" }} />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: { xs: "none", md: "block" }, width: "1px", bgcolor: C.line }} />

        {/* RIGHT */}
        <Box sx={{
          p: { xs: "20px", md: "26px 28px 24px" },
          display: "flex", flexDirection: "column", gap: 2,
          borderTop: { xs: `1px solid ${C.line}`, md: "none" },
          background: { xs: "none", md: "linear-gradient(180deg, rgba(250,245,252,.8) 0%, transparent 100%)" },
        }}>
          <Box>
            <Skeleton variant="text" width={56} height={12} sx={{ transform: "none", mb: 1 }} />
            <Skeleton variant="rounded" width={128} height={38} sx={{ borderRadius: "8px" }} />
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="rounded" height={50} sx={{ flex: 1, borderRadius: "10px" }} />
            <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: "8px" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function YearCardCompactSkeleton() {
  return (
    <Box sx={{
      bgcolor: "background.paper",
      border: `1px solid ${C.line}`,
      borderRadius: "14px",
      p: "20px",
      display: "flex", flexDirection: "column", gap: "14px",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Skeleton variant="rounded" width={84} height={26} sx={{ borderRadius: "999px" }} />
        <Skeleton variant="rounded" width={108} height={36} sx={{ borderRadius: "8px" }} />
      </Box>

      <Box>
        <Skeleton variant="text" width="58%" height={26} sx={{ transform: "none", mb: "8px" }} />
        <Box sx={{ display: "flex", gap: "14px" }}>
          <Skeleton variant="text" width={148} height={15} sx={{ transform: "none" }} />
          <Skeleton variant="text" width={120} height={15} sx={{ transform: "none" }} />
        </Box>
      </Box>

      <Box sx={{
        p: "10px 12px", bgcolor: C.surface2,
        border: `1px solid ${C.line}`, borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box sx={{ display: "flex" }}>
          {[0, 1, 2].map((_, i) => (
            <Box key={i} sx={{ ml: i === 0 ? 0 : "-8px", zIndex: 3 - i }}>
              <Skeleton variant="circular" width={30} height={30} />
            </Box>
          ))}
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Skeleton variant="text" width={60} height={15} sx={{ transform: "none", mb: "3px" }} />
          <Skeleton variant="text" width={80} height={13} sx={{ transform: "none" }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Skeleton variant="rounded" height={46} sx={{ flex: 1, borderRadius: "10px" }} />
        <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: "8px" }} />
      </Box>
    </Box>
  );
}

function YearsPageSkeleton() {
  return (
    <>
      <Box mb={4}>
        <SectionHeaderSkeleton />
        <YearCardLargeSkeleton />
      </Box>
      <Box>
        <SectionHeaderSkeleton />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>
          <YearCardCompactSkeleton />
          <YearCardCompactSkeleton />
        </Box>
      </Box>
    </>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, dot }: { label: string; count: number; dot: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dot, flexShrink: 0 }} />
      <Typography sx={{
        fontSize: 11.5, fontWeight: 700, color: C.ink,
        letterSpacing: ".08em", textTransform: "uppercase",
      }}>
        {label}
      </Typography>
      <Box component="span" sx={{
        fontSize: 11, color: C.ink3, fontWeight: 600,
        bgcolor: "background.paper", border: `1px solid ${C.line}`,
        px: "8px", py: "2px", borderRadius: "999px", lineHeight: 1.6,
      }}>
        {count}
      </Box>
      <Box sx={{ flex: 1, height: "1px", bgcolor: C.line }} />
    </Box>
  );
}

const ManagerYears = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { years, setYears, loading, setLoading } = useManagerYears();
  const search = useTopbarSearch(t("years.searchPlaceholder"));

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const handleLoading = useCallback((s: boolean) => setLoading(s), [setLoading]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? years.filter(y =>
        y.title?.toLowerCase().includes(q) ||
        y.residents?.some((r: any) =>
          (r.firstname + " " + r.lastname).toLowerCase().includes(q)
        )
      )
    : years;

  const current  = filtered.filter(y => getYearStatus(y) === "current");
  const upcoming = filtered.filter(y => getYearStatus(y) === "upcoming");
  const archived = filtered.filter(y => getYearStatus(y) === "archived");
  const totalMaccs = years.reduce((s: number, y: any) => s + (y.residents?.length ?? 0), 0);

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 3.5 }, maxWidth: 1180, mx: "auto" }}>
      {/* Page header */}
      <Box sx={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        mb: 4, gap: 2, flexWrap: "wrap",
      }}>
        <Box>
          <Typography sx={{
            fontSize: 11, fontWeight: 700, letterSpacing: ".14em",
            textTransform: "uppercase", color: C.ink3, mb: "4px",
          }}>
            {t("years.sectionLabel")}
          </Typography>
          <Typography sx={{
            fontSize: 26, fontWeight: 700, color: C.ink,
            letterSpacing: "-0.015em", mb: "2px", lineHeight: 1.2,
          }}>
            {t("years.title")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: C.ink3 }}>
            {years.length} {t("years.yearsCount")} · {totalMaccs} MACCs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/manager/year")}
        >
          {t("years.add")}
        </Button>
      </Box>

      {loading ? (
        <YearsPageSkeleton />
      ) : (
        <>
          {current.length > 0 && (
            <Box mb={4}>
              <SectionHeader
                label={current.length > 1 ? t("years.sectionCurrentPlural") : t("years.sectionCurrent")}
                count={current.length}
                dot={tokens.primary}
              />
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: current.length > 1 ? "repeat(2,1fr)" : "1fr" },
                gap: 2,
              }}>
                {current.map(y => (
                  <YearCard key={y.id} year={y} status="current"
                    handleLoading={handleLoading} setYears={setYears} years={years} />
                ))}
              </Box>
            </Box>
          )}

          {upcoming.length > 0 && (
            <Box mb={4}>
              <SectionHeader label={t("years.sectionUpcoming")} count={upcoming.length} dot={tokens.warning} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>
                {upcoming.map(y => (
                  <YearCard key={y.id} year={y} status="upcoming"
                    handleLoading={handleLoading} setYears={setYears} years={years} />
                ))}
              </Box>
            </Box>
          )}

          {archived.length > 0 && (
            <Box>
              <SectionHeader label={t("years.sectionArchived")} count={archived.length} dot={C.ink3} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>
                {archived.map(y => (
                  <YearCard key={y.id} year={y} status="archived"
                    handleLoading={handleLoading} setYears={setYears} years={years} />
                ))}
              </Box>
            </Box>
          )}

          {filtered.length === 0 && (
            <Box display="flex" justifyContent="center" alignItems="center" mt="20vh">
              <Typography color="text.secondary">
                {q ? t("years.noResults") : t("years.empty")}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ManagerYears;
