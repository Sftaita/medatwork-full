import { TextField } from "@mui/material";

const TextFieldSender = ({ label, value, onChange, error, helperText }) => {
  return (
    <TextField
      autoFocus
      margin="dense"
      id="newValue"
      name="newValue"
      label={label}
      value={value}
      onChange={onChange}
      type="text"
      fullWidth
      variant="standard"
      error={error}
      helperText={helperText}
      required
    />
  );
};

export default TextFieldSender;
