import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import timesheetsApi from "../../../../services/timesheetsApi";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router";
import useAuth from "../../../../hooks/useAuth";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import { handleApiError } from "@/services/apiError";

import { TField, TSelect, TDateTimeField, TToggle, fmtHM } from "./timerUi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDefaultDates = () => ({
  dateOfStart: dayjs().set("hour", 8).set("minute", 0).set("second", 0).set("millisecond", 0).toDate(),
  dateOfEnd:   dayjs().set("hour", 18).set("minute", 0).set("second", 0).set("millisecond", 0).toDate(),
});

const EMPTY_ERRORS = { year: "", dateOfStart: "", dateOfEnd: "", pause: "", scientific: "" };

function Bit({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "5px 9px", borderRadius: 6,
        background: "#fff", border: "1px solid #e8dfca",
      }}
    >
      <div style={{ fontSize: 9, color: "#a89e92", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "#1d1b1a", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const Timer = ({
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
  const navigate = useNavigate();
  const { setSelectedMenuItem } = useAuth();
  const { id, type } = useParams();

  const [updateMode, setUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [timesheet, setTimesheet] = useState({
    year: "",
    ...getDefaultDates(),
    pause: 0,
    scientific: 0,
    called: false,
  });

  const [errors, setErrors] = useState(EMPTY_ERRORS);

  const timeOptions = [
    { value: "0",   label: t("timer.time.none") },
    { value: "15",  label: t("timer.time.t15") },
    { value: "30",  label: t("timer.time.t30") },
    { value: "45",  label: t("timer.time.t45") },
    { value: "60",  label: t("timer.time.t60") },
    { value: "75",  label: t("timer.time.t75") },
    { value: "90",  label: t("timer.time.t90") },
    { value: "105", label: t("timer.time.t105") },
    { value: "120", label: t("timer.time.t120") },
  ];

  useEffect(() => {
    if (id && type === "timer") {
      setUpdateMode(true);
      handleFindTimesheet(id);
    } else {
      setUpdateMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  useEffect(() => {
    if (years.length !== 0 && !updateMode) {
      setTimesheet((prev) => ({ ...prev, year: String(years[0].id) }));
    }
  }, [years, updateMode]);

  const handleFindTimesheet = async (timesheetId: string) => {
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.findTimesheetById();
      const request = await axiosPrivate[method](url + timesheetId);
      setTimesheet({
        year:        String(request.data.yearId),
        dateOfStart: dayjs(request.data.dateOfStart).toDate(),
        dateOfEnd:   dayjs(request.data.dateOfEnd).toDate(),
        pause:       request.data.pause,
        scientific:  request.data.scientific,
        called:      request.data.called ?? false,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Date helpers ────────────────────────────────────────────────────────────

  const onStartDateChange = (dateStr: string) => {
    const time = dayjs(timesheet.dateOfStart).format("HH:mm");
    setTimesheet((prev) => ({ ...prev, dateOfStart: dayjs(`${dateStr}T${time}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const onStartTimeChange = (timeStr: string) => {
    const date = dayjs(timesheet.dateOfStart).format("YYYY-MM-DD");
    setTimesheet((prev) => ({ ...prev, dateOfStart: dayjs(`${date}T${timeStr}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfStart: "" }));
  };

  const onEndDateChange = (dateStr: string) => {
    const time = dayjs(timesheet.dateOfEnd).format("HH:mm");
    setTimesheet((prev) => ({ ...prev, dateOfEnd: dayjs(`${dateStr}T${time}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  const onEndTimeChange = (timeStr: string) => {
    const date = dayjs(timesheet.dateOfEnd).format("YYYY-MM-DD");
    setTimesheet((prev) => ({ ...prev, dateOfEnd: dayjs(`${date}T${timeStr}`).toDate() }));
    setErrors((prev) => ({ ...prev, dateOfEnd: "" }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, any> = { status: false };
    if (!timesheet.year) {
      errs.year = t("timer.schedule.errYear");
      errs.status = true;
    }
    if (!timesheet.dateOfStart) {
      errs.dateOfStart = t("timer.schedule.errStart");
      errs.status = true;
    }
    if (!timesheet.dateOfEnd) {
      errs.dateOfEnd = t("timer.schedule.errEnd");
      errs.status = true;
    } else if (
      timesheet.dateOfStart &&
      dayjs(timesheet.dateOfEnd).isBefore(dayjs(timesheet.dateOfStart))
    ) {
      errs.dateOfEnd = t("timer.schedule.errEndBefore");
      errs.status = true;
    }
    if (errs.status) setErrors(errs);
    return errs.status;
  };

  const resetForm = () => {
    setTimesheet((prev) => ({ ...prev, ...getDefaultDates(), pause: 0, scientific: 0, called: false }));
    setErrors(EMPTY_ERRORS);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (validate()) return;
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.create();
      await axiosPrivate[method](url, {
        year:        Number(timesheet.year) || timesheet.year,
        pause:       timesheet.pause,
        scientific:  timesheet.scientific,
        called:      timesheet.called,
        dateOfStart: dayjs(timesheet.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd:   dayjs(timesheet.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      });
      toast.success(t("timer.saved"), { position: "bottom-center", autoClose: 3000, hideProgressBar: true, closeOnClick: true });
      resetForm();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (validate()) return;
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.updateTimesheet();
      await axiosPrivate[method](url + id, {
        year:        Number(timesheet.year) || timesheet.year,
        pause:       timesheet.pause,
        scientific:  timesheet.scientific,
        called:      timesheet.called,
        dateOfStart: dayjs(timesheet.dateOfStart).format("YYYY-MM-DD HH:mm"),
        dateOfEnd:   dayjs(timesheet.dateOfEnd).format("YYYY-MM-DD HH:mm"),
      });
      toast.success(t("timer.saved"), { position: "bottom-center", autoClose: 3000, hideProgressBar: true, closeOnClick: true });
      setSelectedMenuItem("Mes encodages");
      navigate("/maccs/data-management");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Net time ────────────────────────────────────────────────────────────────

  const durationMin = dayjs(timesheet.dateOfEnd).diff(dayjs(timesheet.dateOfStart), "minute");
  const netMin = Math.max(0, durationMin - timesheet.pause - timesheet.scientific);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading && updateMode) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <CircularProgress size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Year */}
      <TField label={t("timer.years")} error={errors.year}>
        <TSelect
          value={String(timesheet.year)}
          options={years.map((y) => ({ value: String(y.id), label: y.title }))}
          onChange={(v) => {
            setTimesheet((prev) => ({ ...prev, year: v }));
            setErrors((prev) => ({ ...prev, year: "" }));
          }}
          placeholder={yearsLoading ? "…" : undefined}
        />
      </TField>

      {/* Period */}
      <TField label={t("timer.schedule.start")} error={errors.dateOfStart}>
        <div
          style={{
            display: compact ? "flex" : "grid",
            flexDirection: compact ? "column" : undefined,
            gridTemplateColumns: compact ? undefined : "1fr 1fr",
            gap: compact ? 10 : 12,
          }}
        >
          <TDateTimeField
            title={t("timer.schedule.start")}
            value={timesheet.dateOfStart}
            onDateChange={onStartDateChange}
            onTimeChange={onStartTimeChange}
          />
          <TDateTimeField
            title={t("timer.schedule.end")}
            value={timesheet.dateOfEnd}
            onDateChange={onEndDateChange}
            onTimeChange={onEndTimeChange}
            error={errors.dateOfEnd}
          />
        </div>
      </TField>

      {/* Callback toggle */}
      <TField label={t("timer.schedule.callBack")} optional>
        <TToggle
          checked={timesheet.called}
          onChange={(v) =>
            setTimesheet((prev) => ({ ...prev, called: v, pause: 0, scientific: 0 }))
          }
          label={t("timer.schedule.callBackDesc")}
        />
      </TField>

      {/* Pause + Scientific */}
      {!timesheet.called && (
        <div
          style={{
            display: compact ? "block" : "grid",
            gridTemplateColumns: compact ? undefined : "1fr 1fr",
            gap: 12,
          }}
        >
          <TField label={t("timer.schedule.pause")} optional>
            <TSelect
              value={String(timesheet.pause)}
              options={timeOptions}
              onChange={(v) =>
                setTimesheet((prev) => ({ ...prev, pause: parseInt(v, 10) }))
              }
            />
          </TField>
          <TField label={t("timer.schedule.scientific")} optional>
            <TSelect
              value={String(timesheet.scientific)}
              options={timeOptions}
              onChange={(v) =>
                setTimesheet((prev) => ({ ...prev, scientific: parseInt(v, 10) }))
              }
            />
          </TField>
        </div>
      )}

      {/* Net time summary */}
      <div
        style={{
          padding: 14, borderRadius: 10,
          background: "#FAF6ED", border: "1px solid #e8dfca",
          display: "flex", flexDirection: compact ? "column" : "row",
          gap: 12, alignItems: compact ? "stretch" : "center",
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 38, borderRadius: 3, background: "#3aa676", flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 10.5, color: "#8a7d72", fontWeight: 600,
                letterSpacing: ".1em", textTransform: "uppercase",
              }}
            >
              {t("timer.schedule.netTime")}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1d1b1a", marginTop: 2 }}>
              {fmtHM(netMin)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {durationMin > 0 && <Bit label={t("timer.schedule.gross")} value={fmtHM(durationMin)} />}
          {timesheet.pause > 0 && <Bit label={t("timer.schedule.pause")} value={`−${fmtHM(timesheet.pause)}`} />}
          {timesheet.scientific > 0 && <Bit label={t("timer.schedule.scientific")} value={`−${fmtHM(timesheet.scientific)}`} />}
        </div>
      </div>

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
          onClick={updateMode ? handleUpdate : handleSubmit}
          disabled={loading || yearsLoading}
          style={{
            background: theme.palette.primary.main, color: "#fff", border: 0,
            borderRadius: compact ? 11 : 10,
            padding: compact ? "14px 18px" : "10px 26px",
            fontSize: compact ? 15 : 13.5, fontWeight: 600,
            cursor: loading || yearsLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: loading || yearsLoading ? 0.7 : 1,
            order: compact ? 1 : 2,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading && <CircularProgress color="inherit" size={16} />}
          {updateMode ? t("timer.edit") : t("timer.save")}
        </button>

        {updateMode && (
          <button
            type="button"
            onClick={() => navigate("/maccs/data-management")}
            style={{
              background: "transparent", color: "#5a544c",
              border: compact ? "0" : "1px solid #ece7df",
              borderRadius: compact ? 11 : 10,
              padding: compact ? "10px" : "10px 20px",
              fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              order: compact ? 2 : 1,
            }}
          >
            {t("timer.cancel")}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: 12, color: "#8a7d72", marginTop: 16, lineHeight: 1.5 }}>
        {t("timer.disclaimer")}
      </p>
    </div>
  );
};

export default Timer;
