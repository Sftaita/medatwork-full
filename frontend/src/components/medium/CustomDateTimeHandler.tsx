/* global HTMLElement */
import * as React from "react";
import Stack from "@mui/material/Stack";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { frFR } from "@mui/x-date-pickers/locales";
import "dayjs/locale/fr";
import dayjs from "dayjs";
import { renderTimeViewClock } from "@mui/x-date-pickers/timeViewRenderers";

const frenchLocale = frFR.components.MuiLocalizationProvider.defaultProps.localeText;

const CustomDateTimePicker = ({
  value,
  label,
  onChange,
  minDateTime = false,
  error = false,
  helperText,
  disableFuture = true,
  views = ["year", "month", "day", "hours", "minutes"],
}) => {
  const shouldDisableDate = (dateTime) => {
    const now = dayjs();
    if (disableFuture) {
      return (
        dateTime.isAfter(dayjs().startOf("day")) &&
        (dateTime.year() > now.year() ||
          dateTime.month() > now.month() ||
          dateTime.date() > now.date())
      );
    }
    return false;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} localeText={frenchLocale} adapterLocale="fr">
      <Stack spacing={3}>
        <DateTimePicker
          label={label}
          value={dayjs(value)}
          onChange={onChange}
          views={views}
          viewRenderers={{
            hours: renderTimeViewClock,
            minutes: renderTimeViewClock,
            seconds: renderTimeViewClock,
          }}
          onViewChange={() => {
            setTimeout(() => {
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            });
          }}
          slotProps={{
            textField: {
              helperText: helperText,
              error: Boolean(helperText),
            },
          }}
          shouldDisableDate={shouldDisableDate}
          minDateTime={dayjs(minDateTime)}
          minutesStep={5}
        />
      </Stack>
    </LocalizationProvider>
  );
};

export default CustomDateTimePicker;
