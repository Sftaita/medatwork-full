import { memo } from "react";
import type { ReactNode, ChangeEvent } from "react";
// Material UI
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

interface CustomSelectProps {
  error?: boolean;
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  item: ReactNode;
  helperText?: string;
}

const CustomSelect = ({
  error,
  label,
  name,
  value,
  onChange,
  disabled,
  loading,
  item,
  helperText,
}: CustomSelectProps) => {
  return (
    <FormControl fullWidth error={error}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }} fontWeight={700}>
        {label}
      </Typography>
      <Select
        variant="outlined"
        name={name}
        type={"text"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        endAdornment={
          <InputAdornment position="end">
            <IconButton sx={{ marginRight: "20px" }}>
              {loading && <CircularProgress size={30} />}
            </IconButton>
          </InputAdornment>
        }
      >
        {item}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
export default memo(CustomSelect);
