import { specialityLinks } from "../../../../../doc/lists";

import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

const SpecialitySender = ({ error, value, onChange, helperText }) => {
  return (
    <FormControl fullWidth error={error}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        Spécialité
      </Typography>
      <Select variant="outlined" name={"newValue"} type={"text"} value={value} onChange={onChange}>
        {specialityLinks.map((speciality) => (
          <MenuItem key={speciality.value} value={speciality.value}>
            {speciality.title}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};

export default SpecialitySender;
