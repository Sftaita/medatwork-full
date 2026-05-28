import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import absencesApi from "../../../../services/absencesApi";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import { handleApiError } from "@/services/apiError";

import { TField, TSelect, TDateField, TToggle } from "./timerUi";

// ─── Absence types with optional note ─────────────────────────────────────────

const SPECIAL_NOTES: Record<string, "sick" | "paternity" | "maternity"> = {
  sickLeave:      "sick",
  paternityLeave: "paternity",
  maternityLeave: "maternity",
};

const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", type: "" };

// ─── Component ────────────────────────────────────────────────────────────────

const Absence = ({
  years,
  yearsLoading,
  compact,
}: {
  years: any[];
  yearsLoading: boolean;
  compact: boolean;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);

  const [absence, setAbsence] = useState({
    year:        "",
    dateOfStart: dayjs().format("YYYY-MM-DD"),
    dateOfEnd:   "",
    type:        "",
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [multidate, setMultidate] = useState(false);

  useEffect(() => {
    if (years.length !== 0) {
      setAbsence((prev) => ({ ...prev, year: String(years[0].id) }));
    }
  }, [years]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!absence.year)        errs.year      = t("timer.absence.errYear");
    if (!absence.type)        errs.type      = t("timer.absence.errType");
    if (!absence.dateOfStart) errs.dateOfStart = t("timer.absence.errStart");
    if (multidate) {
      if (!absence.dateOfEnd) {
        errs.dateOfEnd = t("timer.absence.errEnd");
      } else if (absence.dateOfEnd <= absence.dateOfStart) {
        errs.dateOfEnd = t("timer.absence.errEndBefore");
      }
    }
    const hasErrors = Object.keys(errs).length > 0;
    if (hasErrors) setErrors((prev) => ({ ...prev, ...errs }));
    return hasErrors;
  };

  const resetForm = () => {
    setAbsence((prev) => ({ ...prev, dateOfStart: dayjs().format("YYYY-MM-DD"), dateOfEnd: "", type: "" }));
    setMultidate(false);
    setErrors(EMPTY_ERRORS);
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (validate()) return;
    setLoading(true);
    try {
      const { method, url } = absencesApi.create();
      await axiosPrivate[method](url, {
        year:        Number(absence.year) || absence.year,
        type:        absence.type,
        dateOfStart: absence.dateOfStart,
        dateOfEnd:   absence.dateOfEnd || null,
      });
      toast.success(t("timer.saved"), { position: "bottom-center", autoClose: 3000, hideProgressBar: true, closeOnClick: true });
      resetForm();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Special note for sensitive absence types ─────────────────────────────────

  const noteKey = SPECIAL_NOTES[absence.type];
  const noteMap: Record<"sick" | "paternity" | "maternity", { title: string; text: string }> = {
    sick:      { title: t("timer.absence.sickLeaveTitle"),  text: t("timer.absence.sickLeaveText") },
    paternity: { title: t("timer.absence.birthCertTitle"),  text: t("timer.absence.paternityLeaveText") },
    maternity: { title: t("timer.absence.birthCertTitle"),  text: t("timer.absence.maternityLeaveText") },
  };
  const note = noteKey ? noteMap[noteKey] : null;

  const absenceTypes = [
    { value: "annualLeave",             label: t("timer.absence.annualLeave") },
    { value: "paidLeave",               label: t("timer.absence.paidLeave") },
    { value: "sickLeave",               label: t("timer.absence.sickLeave") },
    { value: "paternityLeave",          label: t("timer.absence.paternityLeave") },
    { value: "maternityLeave",          label: t("timer.absence.maternityLeave") },
    { value: "scientificLeave",         label: t("timer.absence.scientificLeave") },
    { value: "casualLeave",             label: t("timer.absence.casualLeave") },
    { value: "unpaidLeave",             label: t("timer.absence.unpaidLeave") },
    { value: "compensatoryHolidayLeave", label: t("timer.absence.compensatoryLeave") },
    { value: "recovery",                label: t("timer.absence.recovery") },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Year */}
      <TField label={t("timer.years")} error={errors.year}>
        <TSelect
          value={String(absence.year)}
          options={years.map((y) => ({ value: String(y.id), label: y.title }))}
          onChange={(v) => {
            setAbsence((prev) => ({ ...prev, year: v }));
            setErrors((prev) => ({ ...prev, year: "" }));
          }}
          placeholder={yearsLoading ? "…" : undefined}
        />
      </TField>

      {/* Multidate toggle */}
      <TField label={t("timer.absence.multidate")} optional>
        <TToggle
          checked={multidate}
          onChange={(v) => {
            setMultidate(v);
            if (!v) {
              setAbsence((prev) => ({ ...prev, dateOfEnd: null }));
              setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
            }
          }}
          label={t("timer.absence.multidateDesc")}
        />
      </TField>

      {/* Date fields */}
      <div
        style={{
          display: compact || !multidate ? "block" : "grid",
          gridTemplateColumns: compact || !multidate ? undefined : "1fr 1fr",
          gap: 12,
        }}
      >
        <TField
          label={multidate ? t("timer.absence.start") : t("timer.absence.date")}
          error={errors.dateOfStart}
        >
          <TDateField
            value={absence.dateOfStart}
            ariaLabel={t("timer.absence.start")}
            onChange={(dateStr) => {
              setAbsence((prev) => ({ ...prev, dateOfStart: dateStr || "" }));
              setErrors((prev) => ({ ...prev, dateOfStart: "" }));
            }}
          />
        </TField>

        {multidate && (
          <TField label={t("timer.absence.end")} error={errors.dateOfEnd}>
            <TDateField
              value={absence.dateOfEnd}
              ariaLabel={t("timer.absence.end")}
              onChange={(dateStr) => {
                setAbsence((prev) => ({ ...prev, dateOfEnd: dateStr || "" }));
                setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
              }}
            />
          </TField>
        )}
      </div>

      {/* Type */}
      <TField label={t("timer.absence.type")} error={errors.type}>
        <TSelect
          value={absence.type}
          options={absenceTypes}
          onChange={(v) => {
            setAbsence((prev) => ({ ...prev, type: v }));
            setErrors((prev) => ({ ...prev, type: "" }));
          }}
          placeholder={t("timer.absence.typePlaceholder")}
          ariaLabel={t("timer.absence.type")}
        />
      </TField>

      {/* Inline note for special types */}
      {note && (
        <div
          style={{
            padding: 14, borderRadius: 10, marginBottom: 18,
            background: "#faf6ed", border: "1px solid #e8dfca",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 22, height: 22, borderRadius: 22,
              background: "#d4a017", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}
          >
            !
          </div>
          <div style={{ fontSize: 13, color: "#1d1b1a", lineHeight: 1.4 }}>
            <strong>{note.title}</strong>
            <br />
            <span style={{ color: "#5a544c" }}>{note.text}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          paddingTop: compact ? 0 : 20,
          borderTop: compact ? "none" : "1px solid #f3efe7",
          display: "flex", flexDirection: compact ? "column" : "row",
          justifyContent: "flex-end", gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || yearsLoading}
          style={{
            background: theme.palette.primary.main, color: "#fff", border: 0,
            borderRadius: compact ? 11 : 10,
            padding: compact ? "14px 18px" : "10px 26px",
            fontSize: compact ? 15 : 13.5, fontWeight: 600,
            cursor: loading || yearsLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: loading || yearsLoading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading && <CircularProgress color="inherit" size={16} />}
          {t("timer.save")}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#8a7d72", marginTop: 16, lineHeight: 1.5 }}>
        {t("timer.disclaimerShared")}
      </p>
    </div>
  );
};

export default Absence;
