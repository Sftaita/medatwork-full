import React, { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useNavigate, useLocation } from "react-router";
import * as yup from "yup";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { specialityLinks } from "../../../doc/lists";
import yearsApi from "../../../services/yearsApi";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import { MANAGER_YEARS_KEY } from "../../../hooks/data/useManagerYears";
import { toast } from "react-toastify";
import { toastSuccess } from "../../../doc/ToastParams";
import dayjs from "dayjs";
import { API_URL } from "../../../config";
import { C } from "../../../styles/tableStyles";
import { tokens as themeTokens } from "../../../doc/CustomizedTheme";
import { computeAcademicPeriod } from "../../../utils/academicPeriod";

// Icons
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyIcon from "@mui/icons-material/Key";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";

// General components
import DateHandler from "../../../components/medium/DateHandler";
import { handleApiError } from "@/services/apiError";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Hospital {
  id: number;
  name: string;
  city: string | null;
}

interface DurStats {
  days: number;
  weeks: number;
  months: number;
}

const MAX_TITLE = 60;

// ── Validation ────────────────────────────────────────────────────────────────

export const buildValidationSchema = (t: any) =>
  yup.object({
    hospitalId: yup
      .number()
      .required(t("yearCreate.errHospitalRequired"))
      .positive(t("yearCreate.errHospitalInvalid")),
    speciality: yup
      .string()
      .required(t("yearCreate.errSpecialityRequired"))
      .min(2, t("yearCreate.errTooShort")),
    title: yup
      .string()
      .required(t("yearCreate.errTitleRequired"))
      .min(2, t("yearCreate.errTooShort")),
    dateOfStart: yup.mixed().required(t("yearCreate.errDateStartRequired")),
    dateOfEnd: yup.mixed()
      .required(t("yearCreate.errDateEndRequired"))
      .test("span", t("yearCreate.errDateSpan"), function (value) {
        const { dateOfStart } = this.parent;
        if (!dateOfStart || !value) return true;
        return dayjs(value).year() - dayjs(dateOfStart).year() <= 1;
      }),
  });

// ── Atoms ─────────────────────────────────────────────────────────────────────

function SectionHeader({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
      <Box sx={{
        width: 26, height: 26, borderRadius: "50%",
        bgcolor: themeTokens.primarySoft, color: themeTokens.primary,
        fontSize: 12, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontFeatureSettings: '"tnum"',
      }}>
        {n}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-.005em" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: C.ink3, mt: "1px" }}>
          {sub}
        </Typography>
      </Box>
    </Box>
  );
}

function FieldLabel({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <Typography sx={{
      fontSize: 11, fontWeight: 700,
      color: error ? themeTokens.danger : C.ink,
      letterSpacing: ".12em", textTransform: "uppercase", mb: 1,
    }}>
      {children}
    </Typography>
  );
}

function FormSectionDivider() {
  return <Divider sx={{ my: "26px", mx: { xs: "-20px", md: "-30px" } }} />;
}

// ── Title field — input first, preview below ──────────────────────────────────

interface TitleFieldProps {
  value: string;
  onChange: (v: string) => void;
  onUseDefault: () => void;
  specialityLabel: string;
  yearRange: string;
  suggestions: string[];
  error?: boolean;
  helperText?: string;
  t: any;
}

function TitleField({
  value, onChange, onUseDefault,
  specialityLabel, yearRange, suggestions,
  error, helperText, t,
}: TitleFieldProps) {
  const [focused, setFocused] = useState(false);
  const usingDefault = value.trim() === "";
  const displayed = usingDefault ? (specialityLabel || "—") : value;
  const remaining = MAX_TITLE - value.length;

  return (
    <Box>
      <Box sx={{
        bgcolor: "background.paper",
        border: `1px solid ${error ? themeTokens.danger : focused ? themeTokens.primary : C.line}`,
        borderRadius: "14px",
        boxShadow: focused ? `0 0 0 3px ${themeTokens.primarySoft}` : "none",
        transition: "all .15s",
        overflow: "hidden",
      }}>
        {/* ① Input first — where you type */}
        <Box
          sx={{
            px: 2, py: 1.75,
            display: "flex", alignItems: "center", gap: 1.5,
            bgcolor: focused ? "background.paper" : C.surface2,
            transition: "background .15s",
            cursor: "text",
          }}
          onClick={() => (document.getElementById("year-title-input") as HTMLInputElement)?.focus()}
        >
          <Typography sx={{
            fontSize: 10.5, fontWeight: 700, color: C.ink3,
            letterSpacing: ".12em", textTransform: "uppercase", flexShrink: 0,
          }}>
            {t("yearCreate.titleLabel")}
          </Typography>
          <Box
            id="year-title-input"
            component="input"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={specialityLabel || t("yearCreate.titlePlaceholder")}
            sx={{
              flex: 1, border: 0, outline: "none",
              fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: C.ink,
              bgcolor: "transparent", p: 0,
              "::placeholder": { color: C.ink4, fontWeight: 400 },
            }}
          />
          <Typography sx={{
            fontSize: 11,
            color: remaining < 10 ? "#b07023" : C.ink4,
            fontWeight: 600, flexShrink: 0, fontFeatureSettings: '"tnum"',
          }}>
            {value.length}/{MAX_TITLE}
          </Typography>
        </Box>

        {/* ② Suggestions */}
        {suggestions.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: `1px dashed ${C.line2}` }}>
            <Typography sx={{
              fontSize: 10, color: C.ink3, fontWeight: 700,
              letterSpacing: ".12em", textTransform: "uppercase", mb: 0.75,
            }}>
              {t("yearCreate.suggestions")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {suggestions.map(s => {
                const active = value === s;
                return (
                  <Box
                    key={s}
                    component="button"
                    type="button"
                    onClick={() => onChange(s.slice(0, MAX_TITLE))}
                    sx={{
                      bgcolor: active ? themeTokens.primary : "background.paper",
                      color: active ? "#fff" : C.ink2,
                      border: `1px solid ${active ? themeTokens.primary : C.line}`,
                      borderRadius: "999px", px: "12px", py: "5px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", transition: "all .12s",
                    }}
                  >
                    {s}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ③ Live preview strip at bottom */}
        <Box sx={{
          px: 2, py: 1.25,
          borderTop: `1px dashed ${C.line2}`,
          bgcolor: themeTokens.primarySofter,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 13, color: C.ink3, flexShrink: 0 }} />
            <Typography sx={{
              fontSize: 13.5, fontWeight: 700, color: C.ink,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              letterSpacing: "-.005em",
            }}>
              {displayed}
            </Typography>
            {yearRange && (
              <Typography sx={{ color: C.ink4, fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
                {yearRange}
              </Typography>
            )}
          </Box>
          {usingDefault ? (
            <Typography sx={{
              fontSize: 10, fontWeight: 700, color: C.ink3,
              letterSpacing: ".1em", textTransform: "uppercase",
              bgcolor: "background.paper", border: `1px solid ${C.line}`,
              px: "8px", py: "2px", borderRadius: "999px", flexShrink: 0,
            }}>
              {t("yearCreate.titleDefault")}
            </Typography>
          ) : (
            <Box
              component="button"
              type="button"
              onClick={onUseDefault}
              sx={{
                background: "none", border: 0, cursor: "pointer",
                color: themeTokens.primary, fontSize: 11, fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase",
                flexShrink: 0, p: "2px 6px", fontFamily: "inherit",
              }}
            >
              ↺ {t("yearCreate.titleReset")}
            </Box>
          )}
        </Box>
      </Box>

      {helperText && (
        <Typography sx={{ fontSize: 11.5, color: themeTokens.danger, mt: 0.5, ml: 1.5 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}

// ── Toggle card ───────────────────────────────────────────────────────────────

function ToggleCard({
  checked, onChange, title, sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  sub: string;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onChange(!checked)}
      sx={{
        width: "100%", display: "flex", alignItems: "center", gap: 1.75,
        background: checked
          ? "linear-gradient(180deg, rgba(243,232,248,.6) 0%, #fff 100%)"
          : "background.paper",
        border: `1px solid ${checked ? "#ead8f0" : C.line}`,
        borderRadius: "14px", p: "14px 16px",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        transition: "all .15s", bgcolor: "background.paper",
      }}
    >
      <Box sx={{
        width: 44, height: 26, borderRadius: "999px",
        bgcolor: checked ? themeTokens.primary : C.line2,
        position: "relative", flexShrink: 0, transition: "background .2s",
      }}>
        <Box sx={{
          position: "absolute", top: 3,
          left: checked ? "21px" : "3px",
          width: 20, height: 20, borderRadius: "50%",
          bgcolor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.18)",
          transition: "left .2s",
        }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: C.ink3, mt: "2px", lineHeight: 1.4 }}>{sub}</Typography>
      </Box>
    </Box>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────

function StatBox({ n, label, divider }: { n: number; label: string; divider?: boolean }) {
  return (
    <Box sx={{
      textAlign: "center",
      borderLeft: divider ? `1px solid ${C.line}` : "none",
      px: "6px", py: "2px",
    }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
        {n}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: C.ink3, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", mt: "4px" }}>
        {label}
      </Typography>
    </Box>
  );
}

function PreviewRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25 }}>
      <Typography sx={{
        fontSize: 10.5, color: C.ink3, fontWeight: 700,
        letterSpacing: ".1em", textTransform: "uppercase",
        width: 90, flexShrink: 0,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: 13.5, color: C.ink, fontWeight: 500, flex: 1,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        letterSpacing: mono ? ".02em" : 0,
      }}>
        {children}
      </Typography>
    </Box>
  );
}

interface LivePreviewProps {
  values: any;
  dur: DurStats | null;
  specialityLabel: string;
  hospital: Hospital | undefined;
  isMaster: boolean;
  t: any;
}

function LivePreview({ values, dur, specialityLabel, hospital, isMaster, t }: LivePreviewProps) {
  const title = values.title?.trim() || specialityLabel || t("yearCreate.titlePlaceholder");
  const startDate = values.dateOfStart ? dayjs(values.dateOfStart).format("DD/MM/YYYY") : "JJ/MM/AAAA";
  const endDate = values.dateOfEnd ? dayjs(values.dateOfEnd).format("DD/MM/YYYY") : "JJ/MM/AAAA";
  const yearRange = (values.dateOfStart && values.dateOfEnd)
    ? (computeAcademicPeriod(
        dayjs(values.dateOfStart).format("YYYY-MM-DD"),
        dayjs(values.dateOfEnd).format("YYYY-MM-DD"),
      ).replace("-", " – ") || "— – —")
    : "— – —";

  return (
    <Box sx={{
      bgcolor: "background.paper",
      border: `1px solid ${C.line}`,
      borderRadius: "18px",
      overflow: "hidden",
      position: { xs: "static", lg: "sticky" },
      top: 24,
      boxShadow: `0 1px 2px rgba(0,0,0,.02), 0 10px 30px rgba(123,63,160,.06)`,
    }}>
      <Box sx={{
        px: 2.5, py: 1.5,
        borderBottom: `1px dashed ${C.line2}`,
        bgcolor: C.surface2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, letterSpacing: ".14em", textTransform: "uppercase" }}>
          {t("yearCreate.previewLabel")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: themeTokens.success }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: C.ink3 }}>
            {t("yearCreate.previewLive")}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${themeTokens.primary} 0%, #b07ad2 100%)` }} />

      <Box sx={{ p: "20px 22px 22px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25 }}>
          <Box component="span" sx={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            bgcolor: "#FFF6E6", color: "#B07023",
            fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
            px: "10px", py: "4px", borderRadius: "999px",
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#E8A23B" }} />
            {t("years.statusUpcoming")}
          </Box>
          <Typography sx={{ fontSize: 11, color: C.ink3, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" }}>
            {t("yearCreate.previewNew")}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-.01em", lineHeight: 1.2 }}>
          {title}{" "}
          <Box component="span" sx={{ color: C.ink4, fontWeight: 600 }}>{yearRange}</Box>
        </Typography>

        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <PreviewRow label={t("yearCreate.periodLabel")} mono>
            {startDate} – {endDate}
          </PreviewRow>
          <PreviewRow label={t("yearCreate.specialityLabel")}>
            {specialityLabel || <Box component="em" sx={{ color: C.ink4, fontStyle: "normal" }}>— à définir —</Box>}
          </PreviewRow>
          <PreviewRow label={t("yearCreate.hospitalLabel")}>
            {hospital
              ? `${hospital.name}${hospital.city ? ` · ${hospital.city}` : ""}`
              : <Box component="em" sx={{ color: C.ink4, fontStyle: "normal" }}>— à définir —</Box>
            }
          </PreviewRow>
          <PreviewRow label={t("yearCreate.isMaster")}>
            {isMaster ? "Oui" : "Non"}
          </PreviewRow>
        </Box>

        {dur && (
          <Box sx={{
            mt: 2,
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            bgcolor: C.surface2, border: `1px solid ${C.line}`,
            borderRadius: "12px", p: "12px",
          }}>
            <StatBox n={dur.days} label="jours" />
            <StatBox n={dur.weeks} label="semaines" divider />
            <StatBox n={dur.months} label="mois" divider />
          </Box>
        )}

        <Box sx={{
          mt: 2, display: "flex", alignItems: "flex-start", gap: 1.25,
          p: "10px 12px",
          bgcolor: C.surface2, border: `1px dashed ${C.line2}`,
          borderRadius: "10px",
        }}>
          <KeyIcon sx={{ fontSize: 16, color: C.ink3, mt: "1px", flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}>
            {t("yearCreate.previewCode")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const YearPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { authentication } = useAuth();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [editing, setEditing] = useState(false);
  const [isMaster, setIsMaster] = useState(true);


  const initialValues = {
    hospitalId: "" as number | "",
    speciality: "",
    title: "",
    period: "",
    dateOfStart: null as any,
    dateOfEnd: null as any,
  };

  const [loadedValues, setLoadedValues] = useState(initialValues);

  // Fetch only the hospitals the manager belongs to.
  // Primary: managers/hospitals (authenticated, server-side filtered).
  // Fallback: filter all hospitals by auth.hospitalId (client-side).
  useEffect(() => {
    const { method, url } = yearsApi.getManagerHospitals();
    axiosPrivate[method]<Hospital[]>(url)
      .then(r => setHospitals(r.data))
      .catch(() => {
        const hid = authentication.hospitalId;
        if (!hid) return;
        axios
          .get<Hospital[]>(`${API_URL}hospitals`)
          .then(r => setHospitals(r.data.filter(h => h.id === hid)))
          .catch(() => {});
      });

    if (state?.yearId) {
      setEditing(true);
      fetchYear(state.yearId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchYear = async (yearId: number) => {
    setLoading(true);
    try {
      const { method, url } = yearsApi.getYearById();
      const { data: year } = await axiosPrivate[method](url + yearId);
      setLoadedValues({
        hospitalId: year.hospitalId ?? "",
        speciality: year.speciality ?? "",
        title: year.title ?? "",
        period: year.period ?? "",
        dateOfStart: year.dateOfStart ? dayjs(year.dateOfStart) : null,
        dateOfEnd: year.dateOfEnd ? dayjs(year.dateOfEnd) : null,
      });
      if (year.isMaster !== undefined) setIsMaster(year.isMaster);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async ({ hospitalId, speciality, title, period, dateOfStart, dateOfEnd }: any) => {
    setLoading(true);
    const data = {
      title,
      dateOfStart: dayjs(dateOfStart).format("YYYY-MM-DD"),
      dateOfEnd: dayjs(dateOfEnd).format("YYYY-MM-DD"),
      period,
      location: "",
      comment: "",
      speciality,
      isMaster,
      hospitalId: hospitalId !== "" ? hospitalId : null,
    };
    try {
      const { method, url } = yearsApi.create();
      await axiosPrivate[method](url, data);
      toast.success(t("yearCreate.toast"), toastSuccess);
      queryClient.invalidateQueries({ queryKey: MANAGER_YEARS_KEY });
      navigate("/manager/years");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: editing ? loadedValues : initialValues,
    validationSchema: buildValidationSchema(t),
    onSubmit,
    enableReinitialize: true,
  });

  // Compute period from dates (non-editable)
  useEffect(() => {
    const s = formik.values.dateOfStart;
    const e = formik.values.dateOfEnd;
    if (!s || !e) return;
    const ds = dayjs(s), de = dayjs(e);
    if (!ds.isValid() || !de.isValid()) return;
    const period = computeAcademicPeriod(ds.format("YYYY-MM-DD"), de.format("YYYY-MM-DD"));
    if (formik.values.period !== period) {
      formik.setFieldValue("period", period, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.dateOfStart, formik.values.dateOfEnd]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const dur = useMemo((): DurStats | null => {
    const s = formik.values.dateOfStart;
    const e = formik.values.dateOfEnd;
    if (!s || !e) return null;
    const start = dayjs(s);
    const end = dayjs(e);
    if (!end.isAfter(start)) return null;
    const days = end.diff(start, "day");
    return { days, weeks: Math.round(days / 7), months: Math.round(days / 30.44) };
  }, [formik.values.dateOfStart, formik.values.dateOfEnd]);

  const specialityLabel = useMemo(
    () => specialityLinks.find(s => s.value === formik.values.speciality)?.title ?? "",
    [formik.values.speciality],
  );

  const yearRange = useMemo(() => {
    const s = formik.values.dateOfStart;
    const e = formik.values.dateOfEnd;
    if (!s || !e) return "";
    const ds = dayjs(s), de = dayjs(e);
    if (!ds.isValid() || !de.isValid()) return "";
    return computeAcademicPeriod(ds.format("YYYY-MM-DD"), de.format("YYYY-MM-DD")).replace("-", "–");
  }, [formik.values.dateOfStart, formik.values.dateOfEnd]);

  const suggestions = useMemo(() => {
    const arr: string[] = [];
    if (specialityLabel) {
      arr.push(specialityLabel);
      if (yearRange) arr.push(`${specialityLabel} ${yearRange}`);
    }
    return arr;
  }, [specialityLabel, yearRange]);

  const selectedHospital = useMemo(
    () => hospitals.find(h => h.id === formik.values.hospitalId),
    [hospitals, formik.values.hospitalId],
  );


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 3.5 }, maxWidth: 1160, mx: "auto" }}>
      {/* Page header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, color: C.ink3,
          letterSpacing: ".14em", textTransform: "uppercase", mb: 0.5,
        }}>
          {t("nav.years")} · {t("yearCreate.pageTitle")}
        </Typography>
        <Typography sx={{ fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: "-.015em", mb: 0.5 }}>
          {t("yearCreate.pageTitle")}
        </Typography>
        <Typography sx={{ fontSize: 14, color: C.ink3 }}>
          {t("yearCreate.subtitle")}
        </Typography>
      </Box>

      {/* 2-column grid */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1fr 360px" },
        gap: "28px",
        alignItems: "start",
      }}>
        {/* ── LEFT: form card ── */}
        <Box
          sx={{
            bgcolor: "background.paper",
            border: `1px solid ${C.line}`,
            borderRadius: "18px",
            p: { xs: "20px", md: "28px 30px 28px" },
            boxShadow: C.shadowSm,
            // Override global surface2 background on all inputs inside this card
            "& .MuiOutlinedInput-root": { bgcolor: "background.paper" },
          }}
        >
          <form onSubmit={formik.handleSubmit}>

            {/* ① Période */}
            <SectionHeader
              n={1}
              title={t("yearCreate.sectionPeriodTitle")}
              sub={t("yearCreate.sectionPeriodSub")}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <DateHandler
                value={formik.values.dateOfStart}
                onChange={(nv: any) => formik.setFieldValue("dateOfStart", dayjs(nv))}
                label={t("yearCreate.dateStartField")}
                error={formik.touched.dateOfStart && Boolean(formik.errors.dateOfStart)}
                helperText={formik.touched.dateOfStart ? (formik.errors.dateOfStart as string) : ""}
              />
              <DateHandler
                value={formik.values.dateOfEnd}
                onChange={(nv: any) => formik.setFieldValue("dateOfEnd", nv)}
                label={t("yearCreate.dateEndField")}
                error={formik.touched.dateOfEnd && Boolean(formik.errors.dateOfEnd)}
                helperText={formik.touched.dateOfEnd ? (formik.errors.dateOfEnd as string) : ""}
              />
            </Box>

            {dur && (
              <Box sx={{
                display: "flex", alignItems: "center", gap: 2,
                p: "10px 14px", borderRadius: "10px",
                bgcolor: C.surface2, border: `1px solid ${C.line}`,
                mb: 2.5, flexWrap: "wrap",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: themeTokens.primary }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: themeTokens.primary }}>
                    {t("yearCreate.durationLabel")}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12.5, color: C.ink }}><b>{dur.weeks}</b> semaines</Typography>
                <Typography sx={{ fontSize: 12.5, color: C.ink4 }}>·</Typography>
                <Typography sx={{ fontSize: 12.5, color: C.ink }}><b>{dur.months}</b> mois</Typography>
                <Typography sx={{ fontSize: 12.5, color: C.ink4 }}>·</Typography>
                <Typography sx={{ fontSize: 12.5, color: C.ink }}><b>{dur.days}</b> jours</Typography>
              </Box>
            )}

            <Box>
              <FieldLabel>{t("yearCreate.periodLabel")}</FieldLabel>
              <TextField
                value={formik.values.period || "—"}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                helperText={t("yearCreate.periodAuto")}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Box>

            <FormSectionDivider />

            {/* ② Stage */}
            <SectionHeader
              n={2}
              title={t("yearCreate.sectionStageTitle")}
              sub={t("yearCreate.sectionStageSub")}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <FieldLabel error={formik.touched.speciality && Boolean(formik.errors.speciality)}>
                  {t("yearCreate.specialityLabel")}
                </FieldLabel>
                <FormControl fullWidth error={formik.touched.speciality && Boolean(formik.errors.speciality)}>
                  <Select
                    name="speciality"
                    value={formik.values.speciality}
                    onChange={formik.handleChange}
                    displayEmpty
                    sx={{ borderRadius: "12px" }}
                  >
                    <MenuItem value="" disabled>
                      <em style={{ color: C.ink4 }}>—</em>
                    </MenuItem>
                    {specialityLinks.map(sp => (
                      <MenuItem key={sp.value} value={sp.value}>{sp.title}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{formik.touched.speciality && formik.errors.speciality}</FormHelperText>
                </FormControl>
              </Box>

              <Box>
                <FieldLabel error={formik.touched.hospitalId && Boolean(formik.errors.hospitalId)}>
                  {t("yearCreate.hospitalLabel")}
                </FieldLabel>
                <FormControl fullWidth error={formik.touched.hospitalId && Boolean(formik.errors.hospitalId)}>
                  <Select
                    name="hospitalId"
                    value={formik.values.hospitalId}
                    onChange={formik.handleChange}
                    displayEmpty
                    sx={{ borderRadius: "12px" }}
                  >
                    <MenuItem value="" disabled>
                      <em style={{ color: C.ink4 }}>—</em>
                    </MenuItem>
                    {hospitals.map(h => (
                      <MenuItem key={h.id} value={h.id}>
                        {h.name}{h.city ? ` — ${h.city}` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{formik.touched.hospitalId && formik.errors.hospitalId}</FormHelperText>
                </FormControl>
              </Box>
            </Box>

            <FormSectionDivider />

            {/* ③ Titre */}
            <SectionHeader
              n={3}
              title={t("yearCreate.sectionTitleTitle")}
              sub={t("yearCreate.sectionTitleSub")}
            />
            <TitleField
              value={formik.values.title}
              onChange={v => formik.setFieldValue("title", v.slice(0, MAX_TITLE))}
              onUseDefault={() => formik.setFieldValue("title", "")}
              specialityLabel={specialityLabel}
              yearRange={yearRange}
              suggestions={suggestions}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title ? (formik.errors.title as string) : ""}
              t={t}
            />

            <FormSectionDivider />

            {/* ④ Rôle */}
            <SectionHeader
              n={4}
              title={t("yearCreate.sectionRoleTitle")}
              sub={t("yearCreate.sectionRoleSub")}
            />
            <ToggleCard
              checked={isMaster}
              onChange={setIsMaster}
              title={t("yearCreate.isMaster")}
              sub={t("yearCreate.isMasterSub")}
            />

            {/* Footer */}
            <Box sx={{
              mt: "26px", pt: "22px",
              borderTop: `1px solid ${C.line}`,
              display: "flex", alignItems: "center",
              justifyContent: { xs: "center", sm: "space-between" },
              gap: 1.5, flexWrap: "wrap",
            }}>
              <Typography sx={{ fontSize: 12.5, color: C.ink3, maxWidth: 340 }}>
                {t("yearCreate.saveHint1")}
                <Box component="span" sx={{ color: themeTokens.primary, fontWeight: 600 }}>
                  {t("yearCreate.saveHintLink")}
                </Box>
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => navigate("/manager/years")}
                  sx={{ color: C.ink3, fontWeight: 600, borderRadius: "10px" }}
                >
                  {t("yearCreate.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={loading}
                  sx={{ fontWeight: 700, borderRadius: "10px", py: 1.25 }}
                >
                  {t("yearCreate.save")}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ fontWeight: 700, borderRadius: "10px", py: 1.25, whiteSpace: "nowrap" }}
                >
                  {t("yearCreate.saveAndAddMaccs")}
                </Button>
              </Box>
            </Box>

          </form>
        </Box>

        {/* ── RIGHT: live preview ── */}
        <LivePreview
          values={formik.values}
          dur={dur}
          specialityLabel={specialityLabel}
          hospital={selectedHospital}
          isMaster={isMaster}
          t={t}
        />
      </Box>
    </Box>
  );
};

export default YearPage;
