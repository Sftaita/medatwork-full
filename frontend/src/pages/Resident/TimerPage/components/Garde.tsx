import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import gardesApi from "../../../../services/gardesApi";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import dayjs from "dayjs";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import { handleApiError } from "@/services/apiError";

import { TField, TSelect, TDateTimeField, fmtHM } from "./timerUi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDefaultDates = () => {
  const start = dayjs().subtract(1, "day").set("hour", 18).set("minute", 0).set("second", 0).toDate();
  const end   = dayjs().set("hour", 8).set("minute", 0).set("second", 0).toDate();
  return { dateOfStart: start, dateOfEnd: end };
};

const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", type: "", comment: "" };

// ─── GardeTypePicker ──────────────────────────────────────────────────────────

function GardeTypePicker({
  value, onChange, callableLabel, callableDesc, hospitalLabel, hospitalDesc, error,
}: {
  value: string;
  onChange: (v: string) => void;
  callableLabel: string;
  callableDesc: string;
  hospitalLabel: string;
  hospitalDesc: string;
  error?: string;
}) {
  const theme = useTheme();
  const types = [
    { id: "callable", label: callableLabel, desc: callableDesc },
    { id: "hospital", label: hospitalLabel, desc: hospitalDesc },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {types.map((tp) => {
          const sel = value === tp.id;
          return (
            <button
              key={tp.id}
              type="button"
              onClick={() => onChange(tp.id)}
              style={{
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                border: sel ? `2px solid ${theme.palette.primary.main}` : "1px solid #ece7df",
                background: sel ? "#faf2ff" : "#fff",
                borderRadius: 11, padding: "14px 14px",
                display: "flex", flexDirection: "column", gap: 4,
                transition: "all .12s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    width: 16, height: 16, borderRadius: 16,
                    background: sel ? theme.palette.primary.main : "#fff",
                    border: sel ? "none" : "1.5px solid #d2c4ad",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {sel && <div style={{ width: 6, height: 6, borderRadius: 6, background: "#fff" }} />}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1d1b1a" }}>{tp.label}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "#5a544c", lineHeight: 1.4, paddingLeft: 24 }}>
                {tp.desc}
              </div>
            </button>
          );
        })}
      </div>
      {error && <div style={{ fontSize: 11.5, color: "#ba1a1a", marginTop: 4 }}>{error}</div>}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const Garde = ({
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

  const [garde, setGarde] = useState({
    year: "",
    type: "",
    ...getDefaultDates(),
    comment: "",
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [addComment, setAddComment] = useState(false);

  useEffect(() => {
    if (years.length !== 0) {
      setGarde((prev) => ({ ...prev, year: String(years[0].id) }));
    }
  }, [years]);

  // ── Date helpers ────────────────────────────────────────────────────────────

  const onStartDateChange = (dateStr: string) => {
    const time = dayjs(garde.dateOfStart).format("HH:mm");
    setGarde((prev) => ({ ...prev, dateOfStart: dayjs(`${dateStr}T${time}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const onStartTimeChange = (timeStr: string) => {
    const date = dayjs(garde.dateOfStart).format("YYYY-MM-DD");
    setGarde((prev) => ({ ...prev, dateOfStart: dayjs(`${date}T${timeStr}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const onEndDateChange = (dateStr: string) => {
    const time = dayjs(garde.dateOfEnd).format("HH:mm");
    setGarde((prev) => ({ ...prev, dateOfEnd: dayjs(`${dateStr}T${time}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  const onEndTimeChange = (timeStr: string) => {
    const date = dayjs(garde.dateOfEnd).format("YYYY-MM-DD");
    setGarde((prev) => ({ ...prev, dateOfEnd: dayjs(`${date}T${timeStr}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, any> = { status: false };
    if (!garde.year) { errs.year = t("timer.garde.errYear"); errs.status = true; }
    if (!garde.dateOfStart) { errs.dateOfStart = t("timer.garde.errStart"); errs.status = true; }
    if (!garde.dateOfEnd) { errs.dateOfEnd = t("timer.garde.errEnd"); errs.status = true; }
    if (!garde.type) { errs.type = t("timer.garde.errType"); errs.status = true; }
    if (errs.status) setErrors(errs);
    return errs.status;
  };

  const resetForm = () => {
    setGarde((prev) => ({ ...prev, ...getDefaultDates(), type: "", comment: "" }));
    setErrors(EMPTY_ERRORS);
    setAddComment(false);
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (validate()) return;
    setLoading(true);
    try {
      const { method, url } = gardesApi.create();
      await axiosPrivate[method](url, {
        year:        Number(garde.year) || garde.year,
        type:        garde.type,
        comment:     garde.comment,
        dateOfStart: dayjs(garde.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd:   dayjs(garde.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      });
      toast.success(t("timer.saved"), { position: "bottom-center", autoClose: 3000, hideProgressBar: true, closeOnClick: true });
      resetForm();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Duration ─────────────────────────────────────────────────────────────────

  const durationMin = garde.dateOfStart && garde.dateOfEnd
    ? dayjs(garde.dateOfEnd).diff(dayjs(garde.dateOfStart), "minute")
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Year */}
      <TField label={t("timer.years")} error={errors.year}>
        <TSelect
          value={String(garde.year)}
          options={years.map((y) => ({ value: String(y.id), label: y.title }))}
          onChange={(v) => {
            setGarde((prev) => ({ ...prev, year: v }));
            setErrors((prev) => ({ ...prev, year: "" }));
          }}
          placeholder={yearsLoading ? "…" : undefined}
        />
      </TField>

      {/* Garde period */}
      <TField label={t("timer.garde.start")} error={errors.dateOfStart}>
        <div
          style={{
            display: compact ? "flex" : "grid",
            flexDirection: compact ? "column" : undefined,
            gridTemplateColumns: compact ? undefined : "1fr 1fr",
            gap: compact ? 10 : 12,
          }}
        >
          <TDateTimeField
            title={t("timer.garde.start")}
            value={garde.dateOfStart}
            onDateChange={onStartDateChange}
            onTimeChange={onStartTimeChange}
          />
          <TDateTimeField
            title={t("timer.garde.end")}
            value={garde.dateOfEnd}
            onDateChange={onEndDateChange}
            onTimeChange={onEndTimeChange}
            error={errors.dateOfEnd}
          />
        </div>

        {/* Duration badge */}
        {durationMin !== null && durationMin > 0 && (
          <div
            style={{
              marginTop: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
              background: "#faf6ed", border: "1px solid #e8dfca", borderRadius: 10,
              fontSize: 13, color: "#5a544c",
            }}
          >
            <span style={{ flex: 1 }}>{t("timer.garde.duration")}</span>
            <span style={{ fontWeight: 700, color: "#1d1b1a", fontSize: 14 }}>
              {fmtHM(durationMin)}
            </span>
          </div>
        )}
      </TField>

      {/* Type de garde */}
      <TField label={t("timer.garde.type")}>
        <GardeTypePicker
          value={garde.type}
          onChange={(v) => {
            setGarde((prev) => ({ ...prev, type: v }));
            setErrors((prev) => ({ ...prev, type: "" }));
          }}
          callableLabel={t("timer.garde.callable")}
          callableDesc={t("timer.garde.callableDesc")}
          hospitalLabel={t("timer.garde.hospital")}
          hospitalDesc={t("timer.garde.hospitalDesc")}
          error={errors.type}
        />
      </TField>

      {/* Comment toggle */}
      <TField label={t("timer.garde.comment")} optional>
        {!addComment ? (
          <button
            type="button"
            onClick={() => setAddComment(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#faf8f4", border: "1.5px dashed #d2c4ad",
              borderRadius: 10, padding: "12px 14px",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 13.5, color: "#8a7d72", width: "100%",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
            <span>{t("timer.garde.addComment")}</span>
          </button>
        ) : (
          <textarea
            aria-label={t("timer.garde.comment")}
            value={garde.comment}
            onChange={(e) => setGarde((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder={t("timer.garde.commentPlaceholder")}
            rows={3}
            maxLength={250}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1px solid #ece7df", borderRadius: 10,
              padding: "10px 14px", fontSize: 13.5, color: "#1d1b1a",
              fontFamily: "inherit", resize: "vertical", outline: "none",
              background: "#fff",
            }}
          />
        )}
      </TField>

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

export default Garde;
