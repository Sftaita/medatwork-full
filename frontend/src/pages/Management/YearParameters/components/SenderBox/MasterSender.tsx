import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

const MasterSender = ({ error, value, onChange, helperText, managers }) => {
  return (
    <FormControl fullWidth error={error}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        Maître de stage
      </Typography>
      <Select variant="outlined" name={"newValue"} type={"text"} value={value} onChange={onChange}>
        {managers.map((manager) => (
          <MenuItem key={manager?.managerId} value={manager?.managerId}>
            {manager?.lastname + " " + manager?.firstname}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};

export default MasterSender;
