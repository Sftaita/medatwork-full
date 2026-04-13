import * as React from "react";
import PropTypes from "prop-types";

import { styled } from "@mui/material/styles";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import { Box } from "@mui/system";
import dayjs from "@/lib/dayjs";

const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) =>
    prop !== "dayIsBetween" && prop !== "isFirstDay" && prop !== "isLastDay",
})(({ theme, dayIsBetween, isFirstDay, isLastDay }) => ({
  ...(dayIsBetween && {
    borderRadius: 0,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    "&:hover, &:focus": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  ...(isFirstDay && {
    borderTopLeftRadius: "50%",
    borderBottomLeftRadius: "50%",
  }),
  ...(isLastDay && {
    borderTopRightRadius: "50%",
    borderBottomRightRadius: "50%",
  }),
}));

function Day(props) {
  const { day, selectedDay, ...other } = props;

  if (selectedDay === null) {
    return <PickersDay day={day} {...other} />;
  }

  const start = selectedDay.clone().startOf("week");
  const end = selectedDay.clone().endOf("week");

  const dayIsBetween = day.isBetween(start, end, null, "[]");
  const isFirstDay = day.isSame(start, "day");
  const isLastDay = day.isSame(end, "day");

  return (
    <CustomPickersDay
      {...other}
      day={day}
      disableMargin
      dayIsBetween={dayIsBetween}
      isFirstDay={isFirstDay}
      isLastDay={isLastDay}
    />
  );
}

Day.propTypes = {
  day: PropTypes.object.isRequired,
  selectedDay: PropTypes.object,
};

function CustomDay({ startDate, endDate, onDateChange }) {
  const [value, setValue] = React.useState(dayjs(startDate));

  const handleDateChange = (newValue) => {
    setValue(newValue);
    onDateChange(newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: "100%", margin: "auto" }}>
        <DateCalendar
          value={value}
          onChange={handleDateChange}
          minDate={dayjs(startDate)}
          maxDate={dayjs(endDate)}
          slots={{ day: Day }}
          slotProps={{
            day: {
              selectedDay: value,
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}

CustomDay.propTypes = {
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  onDateChange: PropTypes.func.isRequired,
};

export default CustomDay;
