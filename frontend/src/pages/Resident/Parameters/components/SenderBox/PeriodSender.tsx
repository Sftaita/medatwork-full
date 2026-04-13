import { useEffect } from "react";

import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

const PeriodSender = ({ error, value, onChange, helperText, actualPeriod }) => {
  const currentYear = new Date().getFullYear();
  const periods = [
    { value: currentYear + "-" + (currentYear + 1) },
    { value: currentYear - 1 + "-" + currentYear },
  ];

  useEffect(() => {
    periods.push({
      value: actualPeriod,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: initialize period list once on mount

  return (
    <FormControl fullWidth error={error}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        Période de stage
      </Typography>
      <Select variant="outlined" name={"newValue"} type={"text"} value={value} onChange={onChange}>
        {periods.map((period) => (
          <MenuItem key={period.value} value={period.value}>
            {period.value}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};

export default PeriodSender;
