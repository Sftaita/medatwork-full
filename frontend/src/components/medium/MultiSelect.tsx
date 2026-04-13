import { useCallback } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import SvgIcon from "@mui/material/SvgIcon";
import type { ButtonProps } from "@mui/material/Button";

import { usePopover } from "../../hooks/usePopover";

interface MultiSelectOption {
  label: string;
  value: string | number;
}

interface MultiSelectProps extends Omit<ButtonProps, "onChange"> {
  label: string;
  onChange?: (value: string[]) => void;
  options: MultiSelectOption[];
  value?: string[];
}

export const MultiSelect = ({ label, onChange, options, value = [], ...other }: MultiSelectProps) => {
  const popover = usePopover();

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = value.map(String); // Convert all current values to strings
      const valueToToggle = String(event.target.value); // Convert the value to a string

      if (event.target.checked) {
        newValue.push(valueToToggle);
      } else {
        newValue = newValue.filter((item) => item !== valueToToggle);
      }

      onChange?.(newValue);
    },
    [onChange, value]
  );

  return (
    <>
      <Button
        color="inherit"
        endIcon={
          <SvgIcon>
            <KeyboardArrowDownIcon />
          </SvgIcon>
        }
        onClick={popover.handleOpen}
        ref={popover.anchorRef}
        {...other}
      >
        {label}
      </Button>
      <Menu
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
        PaperProps={{ style: { minWidth: 250 } }}
      >
        {options.map((option) => (
          <MenuItem key={option.label}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={value.includes(String(option.value))}
                  onChange={handleValueChange}
                  value={option.value}
                />
              }
              label={option.label}
              sx={{
                flexGrow: 1,
                mr: 0,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
