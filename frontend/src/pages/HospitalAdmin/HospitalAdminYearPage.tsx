import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as yup from "yup";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { specialityLinks } from "../../doc/lists";
import hospitalAdminApi from "../../services/hospitalAdminApi";
import useAuth from "../../hooks/useAuth";
import { C } from "../../styles/tableStyles";
import { tokens as themeTokens } from "../../doc/CustomizedTheme";
import { toastSuccess } from "../../doc/ToastParams";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyIcon from "@mui/icons-material/Key";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Divider from "@mui/material/Divider";
import DateHandler from "../../components/medium/DateHandler";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TITLE = 60;

const SPECIALITIES = specialityLinks.map((s) => s.title);

function buildPeriodOptions(): string[] {
  const now = new Date();
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const options: string[] = [];
  for (let i = -1; i <= 3; i++) {
    const y = baseYear + i;
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${baseYear}-${baseYear + 1}`;
}

interface DurStats { days: number; weeks: number; months: number }

// ── Validation ────────────────────────────────────────────────────────────────

const buildSchema = (t: any) =>
  yup.object({
    title: yup.string().required(t("yearCreate.errTitleRequired")).min(2, t("yearCreate.errTooShort")),
    speciality: yup.string().required(t("yearCreate.errSpecialityRequired")).min(2, t("yearCreate.errTooShort")),
    period: yup.string().required(t("yearCreate.errPeriodRequired")),
    dateOfStart: yup.mixed().required(t("yearCreate.errDateStartRequired")),
    dateOfEnd: yup.mixed().required(t("yearCreate.errDateEndRequired")),
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
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-.005em" }}>{title}</Typography>
        <Typography sx={{ fontSize: 12.5, color: C.ink3, mt: "1px" }}>{sub}</Typography>
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

function StatBox({ n, label, divider }: { n: number; label: string; divider?: boolean }) {
  return (
    <Box sx={{
      textAlign: "center", position: "relative",
      ...(divider && { "&::before": { content: '""', position: "absolute", left: 0, top: "20%", height: "60%", width: "1px", bgcolor: C.line } }),
    }}>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{n}</Typography>
      <Typography sx={{ fontSize: 10.5, color: C.ink3, mt: "2px", letterSpacing: ".04em" }}>{label}</Typography>
    </Box>
  );
}

function PreviewRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, letterSpacing: ".1em", textTransform: "uppercase", minWidth: 80, flexShrink: 0, mt: "1px" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: C.ink, fontWeight: 600, ...(mono && { fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }) }}>
        {children}
      </Typography>
    </Box>
  );
}

// ── Title field ───────────────────────────────────────────────────────────────

interface TitleFieldProps {
  value: string;
  onChange: (v: string) => void;
  specialityLabel: string;
  yearRange: string;
  suggestions: string[];
  error?: boolean;
  helperText?: string;
  t: any;
}

function TitleField({ value, onChange, specialityLabel, yearRange, suggestions, error, helperText, t }: TitleFieldProps) {
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
        <Box
          sx={{ px: 2, py: 1.75, display: "flex", alignItems: "center", gap: 1.5, bgcolor: focused ? "background.paper" : C.surface2, transition: "background .15s", cursor: "text" }}
          onClick={() => (document.getElementById("ha-year-title-input") as HTMLInputElement)?.focus()}
        >
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, letterSpacing: ".12em", textTransform: "uppercase", flexShrink: 0 }}>
            {t("yearCreate.titleLabel")}
          </Typography>
          <Box
            id="ha-year-title-input"
            component="input"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={specialityLabel || t("yearCreate.titlePlaceholder")}
            sx={{ flex: 1, border: 0, outline: "none", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: C.ink, bgcolor: "transparent", p: 0, "::placeholder": { color: C.ink4, fontWeight: 400 } }}
          />
          <Typography sx={{ fontSize: 11, color: remaining < 10 ? "#b07023" : C.ink4, fontWeight: 600, flexShrink: 0, fontFeatureSettings: '"tnum"' }}>
            {value.length}/{MAX_TITLE}
          </Typography>
        </Box>

        {suggestions.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: `1px dashed ${C.line2}` }}>
            <Typography sx={{ fontSize: 10, color: C.ink3, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", mb: 0.75 }}>
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
                    sx={{ bgcolor: active ? themeTokens.primary : "background.paper", color: active ? "#fff" : C.ink2, border: `1px solid ${active ? themeTokens.primary : C.line}`, borderRadius: "999px", px: "12px", py: "5px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}
                  >
                    {s}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ px: 2, py: 1.25, borderTop: `1px dashed ${C.line2}`, bgcolor: themeTokens.primarySofter, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 13, color: C.ink3, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-.005em" }}>
              {displayed}
            </Typography>
            {yearRange && (
              <Typography sx={{ color: C.ink4, fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
                {yearRange}
              </Typography>
            )}
          </Box>
          {!usingDefault && (
            <Box
              component="button"
              type="button"
              onClick={() => onChange("")}
              sx={{ border: `1px solid ${C.line}`, bgcolor: "background.paper", borderRadius: "999px", px: "10px", py: "3px", fontSize: 11, fontWeight: 600, color: C.ink3, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              {t("yearCreate.titleReset")}
            </Box>
          )}
          {usingDefault && (
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: ".1em", textTransform: "uppercase", bgcolor: "background.paper", border: `1px solid ${C.line}`, px: "8px", py: "2px", borderRadius: "999px", flexShrink: 0 }}>
              {t("yearCreate.titleDefault")}
            </Typography>
          )}
        </Box>
      </Box>
      {helperText && (
        <Typography sx={{ fontSize: 11, color: themeTokens.danger, mt: "6px", ml: "4px" }}>{helperText}</Typography>
      )}
    </Box>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────

interface LivePreviewProps {
  title: string;
  specialityLabel: string;
  location: string;
  period: string;
  dateOfStart: any;
  dateOfEnd: any;
  dur: DurStats | null;
  t: any;
}

function LivePreview({ title, specialityLabel, location, period, dateOfStart, dateOfEnd, dur, t }: LivePreviewProps) {
  const displayTitle = title?.trim() || specialityLabel || t("yearCreate.titlePlaceholder");
  const startDate = dateOfStart ? dayjs(dateOfStart).format("DD/MM/YYYY") : "JJ/MM/AAAA";
  const endDate = dateOfEnd ? dayjs(dateOfEnd).format("DD/MM/YYYY") : "JJ/MM/AAAA";
  const sy = dateOfStart ? dayjs(dateOfStart).year() : null;
  const ey = dateOfEnd ? dayjs(dateOfEnd).year() : null;
  const yearRange = (sy && ey) ? (sy === ey ? String(sy) : `${sy} – ${ey}`) : "— – —";

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
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px dashed ${C.line2}`, bgcolor: C.surface2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: C.ink3, letterSpacing: ".14em", textTransform: "uppercase" }}>
          {t("yearCreate.previewLabel")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: themeTokens.success }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: C.ink3 }}>{t("yearCreate.previewLive")}</Typography>
        </Box>
      </Box>

      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${themeTokens.primary} 0%, #b07ad2 100%)` }} />

      <Box sx={{ p: "20px 22px 22px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25 }}>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "6px", bgcolor: "#FFF6E6", color: "#B07023", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", px: "10px", py: "4px", borderRadius: "999px" }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#E8A23B" }} />
            {t("years.statusUpcoming")}
          </Box>
          <Typography sx={{ fontSize: 11, color: C.ink3, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" }}>
            {t("yearCreate.previewNew")}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-.01em", lineHeight: 1.2 }}>
          {displayTitle}{" "}
          <Box component="span" sx={{ color: C.ink4, fontWeight: 600 }}>{yearRange}</Box>
        </Typography>

        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <PreviewRow label={t("yearCreate.periodLabel")} mono>
            {startDate} – {endDate}
          </PreviewRow>
          <PreviewRow label={t("yearCreate.specialityLabel")}>
            {specialityLabel || <Box component="em" sx={{ color: C.ink4, fontStyle: "normal" }}>— à définir —</Box>}
          </PreviewRow>
          <PreviewRow label={t("haYear.locationLabel")}>
            {location || <Box component="em" sx={{ color: C.ink4, fontStyle: "normal" }}>— à définir —</Box>}
          </PreviewRow>
        </Box>

        {dur && (
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", bgcolor: C.surface2, border: `1px solid ${C.line}`, borderRadius: "12px", p: "12px" }}>
            <StatBox n={dur.days} label="jours" />
            <StatBox n={dur.weeks} label="semaines" divider />
            <StatBox n={dur.months} label="mois" divider />
          </Box>
        )}

        <Box sx={{ mt: 2, display: "flex", alignItems: "flex-start", gap: 1.25, p: "10px 12px", bgcolor: C.surface2, border: `1px dashed ${C.line2}`, borderRadius: "10px" }}>
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

const HospitalAdminYearPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { authentication } = useAuth();
  const [loading, setLoading] = useState(false);

  const periodOptions = buildPeriodOptions();

  const formik = useFormik({
    initialValues: {
      title: "",
      speciality: "",
      location: authentication?.hospitalName ?? "",
      period: getCurrentAcademicYear(),
      dateOfStart: null as any,
      dateOfEnd: null as any,
    },
    validationSchema: buildSchema(t),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await hospitalAdminApi.createYear({
          title: values.title.trim() || values.speciality,
          speciality: values.speciality,
          location: values.location,
          period: values.period,
          dateOfStart: dayjs(values.dateOfStart).format("YYYY-MM-DD"),
          dateOfEnd: dayjs(values.dateOfEnd).format("YYYY-MM-DD"),
          comment: "",
        });
        toast.success(t("yearCreate.toast"), toastSuccess);
        navigate("/hospital-admin/dashboard");
      } catch {
        toast.error(t("haDash.toast.createError"));
      } finally {
        setLoading(false);
      }
    },
  });

  // Auto-deduce period from dates
  useEffect(() => {
    if (!formik.values.dateOfStart || !formik.values.dateOfEnd) return;
    const start = dayjs(formik.values.dateOfStart);
    const end = dayjs(formik.values.dateOfEnd);
    if (!start.isValid() || !end.isValid()) return;
    const sy = start.year();
    const ey = end.year();
    const deduced = sy === ey ? `${sy}-${sy + 1}` : `${sy}-${ey}`;
    if (periodOptions.includes(deduced) && formik.values.period !== deduced) {
      formik.setFieldValue("period", deduced);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.dateOfStart, formik.values.dateOfEnd]);

  // Derived values
  const specialityLabel = formik.values.speciality || "";
  const sy = formik.values.dateOfStart ? dayjs(formik.values.dateOfStart).year() : null;
  const ey = formik.values.dateOfEnd ? dayjs(formik.values.dateOfEnd).year() : null;
  const yearRange = (sy && ey) ? (sy === ey ? String(sy) : `${sy} – ${ey}`) : "";

  const dur: DurStats | null = useMemo(() => {
    if (!formik.values.dateOfStart || !formik.values.dateOfEnd) return null;
    const s = dayjs(formik.values.dateOfStart);
    const e = dayjs(formik.values.dateOfEnd);
    if (!s.isValid() || !e.isValid() || e.isBefore(s)) return null;
    const days = e.diff(s, "day");
    return { days, weeks: Math.round(days / 7), months: Math.round(days / 30.44) };
  }, [formik.values.dateOfStart, formik.values.dateOfEnd]);

  const suggestions = useMemo(() => {
    const parts: string[] = [];
    if (specialityLabel) parts.push(specialityLabel);
    if (specialityLabel && formik.values.location) parts.push(`${specialityLabel} – ${formik.values.location}`);
    if (specialityLabel && formik.values.period) parts.push(`${specialityLabel} ${formik.values.period}`);
    return parts.slice(0, 3);
  }, [specialityLabel, formik.values.location, formik.values.period]);

  return (
    <Box component="form" onSubmit={formik.handleSubmit} noValidate>
      {/* ── Top bar ── */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 10,
        bgcolor: "background.paper",
        borderBottom: `1px solid ${C.line}`,
        px: { xs: 2.5, md: 4 }, py: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 2,
      }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-.015em" }}>
            {t("haYear.pageTitle")}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: C.ink3, mt: "1px" }}>
            {t("haYear.subtitle")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Button
            type="button"
            variant="text"
            onClick={() => navigate("/hospital-admin/dashboard")}
            sx={{ color: C.ink3, fontWeight: 600, borderRadius: "10px" }}
          >
            {t("yearCreate.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            endIcon={<ArrowForwardIcon />}
            sx={{ fontWeight: 700, borderRadius: "10px", py: 1.25, whiteSpace: "nowrap" }}
          >
            {t("haYear.createBtn")}
          </Button>
        </Box>
      </Box>

      {/* ── Body ── */}
      <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1100, mx: "auto" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" }, gap: { xs: 3, lg: 5 }, alignItems: "flex-start" }}>

          {/* ── Form panel ── */}
          <Box sx={{ bgcolor: "background.paper", border: `1px solid ${C.line}`, borderRadius: "18px", p: { xs: "20px", md: "30px" } }}>

            {/* Section ① — Period */}
            <SectionHeader n={1} title={t("yearCreate.sectionPeriodTitle")} sub={t("yearCreate.sectionPeriodSub")} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
              <Box>
                <FieldLabel error={formik.touched.dateOfStart && Boolean(formik.errors.dateOfStart)}>
                  {t("yearCreate.dateStartLabel")}
                </FieldLabel>
                <DateHandler
                  label={t("yearCreate.dateStartField")}
                  value={formik.values.dateOfStart}
                  onChange={(v: any) => formik.setFieldValue("dateOfStart", v)}
                  error={formik.touched.dateOfStart && Boolean(formik.errors.dateOfStart)}
                  helperText={formik.touched.dateOfStart && (formik.errors.dateOfStart as string)}
                />
              </Box>
              <Box>
                <FieldLabel error={formik.touched.dateOfEnd && Boolean(formik.errors.dateOfEnd)}>
                  {t("yearCreate.dateEndLabel")}
                </FieldLabel>
                <DateHandler
                  label={t("yearCreate.dateEndField")}
                  value={formik.values.dateOfEnd}
                  onChange={(v: any) => formik.setFieldValue("dateOfEnd", v)}
                  error={formik.touched.dateOfEnd && Boolean(formik.errors.dateOfEnd)}
                  helperText={formik.touched.dateOfEnd && (formik.errors.dateOfEnd as string)}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <FieldLabel error={formik.touched.period && Boolean(formik.errors.period)}>
                {t("yearCreate.periodLabel")}
              </FieldLabel>
              <FormControl fullWidth error={formik.touched.period && Boolean(formik.errors.period)}>
                <Select
                  name="period"
                  value={formik.values.period}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  size="small"
                >
                  {periodOptions.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
                <FormHelperText>{formik.touched.period && formik.errors.period}</FormHelperText>
              </FormControl>
            </Box>

            <FormSectionDivider />

            {/* Section ② — Stage */}
            <SectionHeader n={2} title={t("yearCreate.sectionStageTitle")} sub={t("yearCreate.sectionStageSub")} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
              <Box>
                <FieldLabel error={formik.touched.speciality && Boolean(formik.errors.speciality)}>
                  {t("yearCreate.specialityLabel")}
                </FieldLabel>
                <Autocomplete
                  options={SPECIALITIES}
                  value={formik.values.speciality || null}
                  onChange={(_, v) => formik.setFieldValue("speciality", v ?? "")}
                  onBlur={() => formik.setFieldTouched("speciality", true)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      error={formik.touched.speciality && Boolean(formik.errors.speciality)}
                      helperText={formik.touched.speciality && formik.errors.speciality}
                    />
                  )}
                />
              </Box>
              <Box>
                <FieldLabel>{t("haYear.locationLabel")}</FieldLabel>
                <TextField
                  name="location"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  fullWidth
                  size="small"
                />
              </Box>
            </Box>

            <FormSectionDivider />

            {/* Section ③ — Title */}
            <SectionHeader n={3} title={t("yearCreate.sectionTitleTitle")} sub={t("yearCreate.sectionTitleSub")} />

            <TitleField
              value={formik.values.title}
              onChange={(v) => formik.setFieldValue("title", v.slice(0, MAX_TITLE))}
              specialityLabel={specialityLabel}
              yearRange={yearRange}
              suggestions={suggestions}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title ? (formik.errors.title as string) : undefined}
              t={t}
            />

          </Box>

          {/* ── Preview panel ── */}
          <LivePreview
            title={formik.values.title}
            specialityLabel={specialityLabel}
            location={formik.values.location}
            period={formik.values.period}
            dateOfStart={formik.values.dateOfStart}
            dateOfEnd={formik.values.dateOfEnd}
            dur={dur}
            t={t}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default HospitalAdminYearPage;
