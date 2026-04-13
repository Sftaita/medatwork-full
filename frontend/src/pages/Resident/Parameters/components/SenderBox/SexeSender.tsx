import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

const SexeSender = ({ error, value, onChange, helperText, _managers }) => {
  return (
    <FormControl fullWidth error={error}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        Quel est votre genre
      </Typography>
      <Select variant="outlined" name={"newValue"} type={"text"} value={value} onChange={onChange}>
        <MenuItem value={"male"} key={1}>
          {"Je suis un homme"}
        </MenuItem>
        <MenuItem value={"female"} key={2}>
          {"Je suis une femme"}
        </MenuItem>
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};

export default SexeSender;
