import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileDateRangePicker } from "@mui/x-date-pickers-pro/MobileDateRangePicker";
import Stack from "@mui/material/Stack";

export default function CustomDateRangePicker({
  value,
  _label,
  onChange,
  minDateTime,
  errorStart = false,
  errorEnd = false,
  helperTextStart,
  helperTextEnd,
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Stack spacing={3}>
        <MobileDateRangePicker
          value={value}
          onChange={(newValue) => {
            onChange(newValue);
          }}
          minDate={minDateTime}
          slotProps={{
            textField: ({ position }) => ({
              fullWidth: true,
              error: position === "start" ? errorStart : errorEnd,
              helperText: position === "start" ? helperTextStart : helperTextEnd,
            }),
          }}
        />
      </Stack>
    </LocalizationProvider>
  );
}
