import React from "react";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import "dayjs/locale/fr";

// ─── Styles ───────────────────────────────────────────────────────────────────

export const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ece7df",
  borderRadius: 8,
  padding: "10px",
  fontSize: 13.5,
  fontWeight: 600,
  color: "#1d1b1a",
  fontFamily: "inherit",
  outline: "none",
  background: "#fafaf7",
  minHeight: 44,
  cursor: "pointer",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

export function TLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11, fontWeight: 700, color: "#1d1b1a",
        letterSpacing: ".14em", textTransform: "uppercase",
        marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
      {optional && (
        <span
          style={{
            fontWeight: 500, fontSize: 10, color: "#a89e92",
            letterSpacing: ".04em", textTransform: "none",
            padding: "1px 6px", background: "#f3efe7", borderRadius: 4,
          }}
        >
          facultatif
        </span>
      )}
    </div>
  );
}

export function TField({
  label, hint, optional, error, children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <TLabel optional={optional}>{label}</TLabel>
        {hint && <span style={{ fontSize: 11.5, color: "#a89e92" }}>{hint}</span>}
      </div>
      {children}
      {error && <div style={{ fontSize: 11.5, color: "#ba1a1a", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function TSelect({
  value, options, onChange, placeholder, error, ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  ariaLabel?: string;
}) {
  return (
    <>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#fff",
          border: `1px solid ${error ? "#ba1a1a" : "#ece7df"}`,
          borderRadius: 10, padding: "12px 14px",
          fontSize: 14, color: value ? "#1d1b1a" : "#a89e92",
          fontFamily: "inherit", fontWeight: 500,
          outline: "none", cursor: "pointer",
          appearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23a89e92' d='M5 6 0 0h10z'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 36,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <div style={{ fontSize: 11.5, color: "#ba1a1a", marginTop: 4 }}>{error}</div>}
    </>
  );
}

export function TDateTimeField({
  title, value, onDateChange, onTimeChange, error,
}: {
  title: string;
  value: any;
  onDateChange: (dateStr: string) => void;
  onTimeChange: (timeStr: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  const djs = value ? dayjs(value) : null;
  const isValid = djs?.isValid() ?? false;
  const dateStr = isValid ? djs!.format("YYYY-MM-DD") : "";
  const timeStr = isValid ? djs!.format("HH:mm") : "";
  const dayNum  = isValid ? djs!.date() : "–";
  const monthName = isValid ? djs!.locale("fr").format("MMM") : "—";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${error ? "#ba1a1a" : "#ece7df"}`,
        borderRadius: 10, padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10.5, fontWeight: 700, color: "#8a7d72",
          letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
        {/* Calendar tile */}
        <div
          style={{
            width: 58, borderRadius: 9,
            background: "#faf6ed", border: "1px solid #e8dfca",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            flex: "0 0 auto", padding: "8px 0",
          }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#a86a18", letterSpacing: ".04em", textTransform: "uppercase" }}>
            {monthName}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1, marginTop: 2 }}>
            {dayNum}
          </div>
        </div>

        {/* Date + Time inputs */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: "#a89e92", letterSpacing: ".08em", textTransform: "uppercase", paddingLeft: 2 }}>
              Date
            </span>
            <input type="date" value={dateStr} onChange={(e) => onDateChange(e.target.value)} onClick={(e) => (e.currentTarget as any).showPicker?.()} aria-label={`${title} — date`} style={inputBase} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: "#a89e92", letterSpacing: ".08em", textTransform: "uppercase", paddingLeft: 2 }}>
              Heure
            </span>
            <input type="time" value={timeStr} onChange={(e) => onTimeChange(e.target.value)} onClick={(e) => (e.currentTarget as any).showPicker?.()} aria-label={`${title} — heure`} style={inputBase} />
          </label>
        </div>
      </div>
      {error && <div style={{ fontSize: 11.5, color: "#ba1a1a", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export function TDateField({
  value, onChange, error, ariaLabel,
}: {
  value: any;
  onChange: (dateStr: string) => void;
  error?: string;
  ariaLabel?: string;
}) {
  const theme = useTheme();
  const djs = value ? dayjs(value) : null;
  const isValid = djs?.isValid() ?? false;
  const dateStr   = isValid ? djs!.format("YYYY-MM-DD") : "";
  const dayNum    = isValid ? djs!.date() : "–";
  const monthName = isValid ? djs!.locale("fr").format("MMM") : "—";

  return (
    <>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${error ? "#ba1a1a" : "#ece7df"}`,
          borderRadius: 10, padding: 12,
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <div
          style={{
            width: 52, borderRadius: 9,
            background: "#faf6ed", border: "1px solid #e8dfca",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            flex: "0 0 auto", padding: "6px 0",
          }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#a86a18", letterSpacing: ".04em", textTransform: "uppercase" }}>
            {monthName}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1, marginTop: 2 }}>
            {dayNum}
          </div>
        </div>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#a89e92", letterSpacing: ".08em", textTransform: "uppercase", paddingLeft: 2 }}>
            Date
          </span>
          <input
            type="date"
            value={dateStr}
            aria-label={ariaLabel}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => (e.currentTarget as any).showPicker?.()}
            style={{ ...inputBase, background: "transparent", border: "none", padding: "6px 0" }}
          />
        </label>
      </div>
      {error && <div style={{ fontSize: 11.5, color: "#ba1a1a", marginTop: 4 }}>{error}</div>}
    </>
  );
}

export function TToggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <label
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        background: "#fff", border: "1px solid #ece7df", borderRadius: 10,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 38, height: 22, borderRadius: 22,
          background: checked ? theme.palette.primary.main : "#d2c4ad",
          position: "relative", flex: "0 0 auto", transition: "background .15s",
        }}
      >
        <div
          style={{
            width: 18, height: 18, borderRadius: 18, background: "#fff",
            position: "absolute", top: 2, left: checked ? 18 : 2,
            transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          }}
        />
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#1d1b1a" }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, margin: 0 }}
      />
    </label>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function fmtHM(min: number): string {
  if (min <= 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${String(m).padStart(2, "0")}` : ""}`;
}
