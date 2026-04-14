/**
 * NumberSpinnerField — Spinner field using @mui/base Unstable_NumberInput.
 * Styled to match MUI Material outlined TextField.
 *
 * Usage:
 *   <NumberSpinnerField
 *     label="Pause"
 *     value={45}
 *     step={5}
 *     min={0}
 *     onChange={(_, val) => setState(val ?? 0)}
 *     endAdornment="min"
 *   />
 *
 * DOM order produced by BaseNumberInput:
 *   Root > [ DecrementBtn, IncrementBtn, startAdornment, Input, endAdornment ]
 * We assign each slot to a grid cell to achieve the "spinner" layout:
 *   ┌────────────────────┬─────┐
 *   │                    │  ▲  │
 *   │      input         ├─────┤
 *   │                    │  ▼  │
 *   └────────────────────┴─────┘
 */
import * as React from "react";
import { Unstable_NumberInput as BaseNumberInput } from "@mui/base/Unstable_NumberInput";
import { styled } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// ── Grid root ─────────────────────────────────────────────────────────────────

const StyledRoot = styled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 28px",
  gridTemplateRows: "1fr 1fr",
  position: "relative",
  border: `1px solid rgba(0,0,0,0.23)`,
  borderRadius: theme.shape.borderRadius,
  height: "56px",
  overflow: "hidden",
  transition: "border-color 0.15s ease",
  backgroundColor: theme.palette.background.paper,

  "&:hover": {
    borderColor: theme.palette.text.primary,
  },
  "&:focus-within": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "-1px",
    borderColor: "transparent",
  },

  // Decrement = first DOM child → bottom-right cell
  "& > button:first-of-type": {
    gridColumn: 2,
    gridRow: 2,
    borderTop: `1px solid rgba(0,0,0,0.12)`,
    borderLeft: `1px solid rgba(0,0,0,0.12)`,
  },

  // Increment = second DOM child → top-right cell
  "& > button:nth-of-type(2)": {
    gridColumn: 2,
    gridRow: 1,
    borderBottom: `1px solid rgba(0,0,0,0.12)`,
    borderLeft: `1px solid rgba(0,0,0,0.12)`,
  },

  // Input = spans both rows on left
  "& > input": {
    gridColumn: 1,
    gridRow: "1 / span 2",
  },
}));

// ── Stepper buttons ───────────────────────────────────────────────────────────

const StyledButton = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: theme.palette.text.secondary,
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  padding: 0,

  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[700]
        : theme.palette.grey[100],
    color: theme.palette.primary.main,
  },
  "&:disabled": {
    opacity: 0.38,
    cursor: "not-allowed",
  },
  "& svg": {
    fontSize: "18px",
  },
}));

// ── Input ─────────────────────────────────────────────────────────────────────

const StyledInput = styled("input")(({ theme }) => ({
  fontSize: "1rem",
  fontFamily: theme.typography.fontFamily,
  color: theme.palette.text.primary,
  background: "transparent",
  border: "none",
  outline: "none",
  // Padding-top leaves room for the floating label
  padding: "20px 12px 6px 14px",
  width: "100%",
  MozAppearance: "textfield",
  "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
  },
}));

// ── Floating label (rendered via startAdornment, positioned absolute) ─────────

const FloatingLabel = styled("label")(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: "14px",
  transform: "translateY(-50%)",
  fontSize: "0.75rem",
  lineHeight: 1,
  color: "rgba(0,0,0,0.6)",
  backgroundColor: theme.palette.background.paper,
  paddingInline: "4px",
  pointerEvents: "none",
  userSelect: "none",
  // Highlighted when the root is focused
  "div:focus-within > &": {
    color: theme.palette.primary.main,
  },
}));

// ── Adornment text ("min") — also positioned absolute, bottom-left ─────────

const EndAdornment = styled("span")({
  position: "absolute",
  bottom: "7px",
  left: "14px",
  fontSize: "0.72rem",
  color: "rgba(0,0,0,0.45)",
  pointerEvents: "none",
  userSelect: "none",
  lineHeight: 1,
});

// ── Public component ──────────────────────────────────────────────────────────

interface NumberSpinnerFieldProps {
  label: string;
  value: number;
  onChange: (
    event:
      | React.FocusEvent<HTMLInputElement>
      | React.PointerEvent
      | React.KeyboardEvent
      | null,
    value: number | null
  ) => void;
  step?: number;
  min?: number;
  max?: number;
  endAdornment?: string;
}

const NumberSpinnerField = React.forwardRef<HTMLDivElement, NumberSpinnerFieldProps>(
  function NumberSpinnerField(
    { label, value, onChange, step = 1, min, max, endAdornment },
    ref
  ) {
    const inputId = React.useId();

    return (
      <BaseNumberInput
        value={value}
        onChange={onChange}
        step={step}
        min={min}
        max={max}
        aria-label={label}
        slots={{
          root: StyledRoot as React.ElementType,
          input: StyledInput as React.ElementType,
          incrementButton: StyledButton as React.ElementType,
          decrementButton: StyledButton as React.ElementType,
        }}
        slotProps={{
          root: { ref } as any,
          input: { id: inputId } as any,
          incrementButton: {
            children: <KeyboardArrowUpIcon />,
          } as any,
          decrementButton: {
            children: <KeyboardArrowDownIcon />,
          } as any,
        }}
        startAdornment={
          <>
            <FloatingLabel htmlFor={inputId}>{label}</FloatingLabel>
            {endAdornment && <EndAdornment>{endAdornment}</EndAdornment>}
          </>
        }
      />
    );
  }
);

export default NumberSpinnerField;
