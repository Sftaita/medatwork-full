import * as React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { frFR } from "@mui/x-date-pickers/locales";
import dayjs from "dayjs";

import "dayjs/locale/fr";

const frenchLocale = frFR.components.MuiLocalizationProvider.defaultProps.localeText;

export default function DateHandler({
  value,
  label,
  onChange,
  error = false,
  helperText,
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} localeText={frenchLocale} adapterLocale="fr">
      <DatePicker
        label={label}
        sx={{ minWidth: "100%" }}
        value={dayjs(value)}
        onChange={(newValue) => {
          onChange(newValue);
        }}
        slotProps={{
          textField: {
            helperText: helperText,
            error: error,
            fullWidth: true,
          },
        }}
      />
    </LocalizationProvider>
  );
}
