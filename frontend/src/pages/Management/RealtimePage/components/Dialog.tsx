import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

interface DialogProps {
  open: boolean;
  month: number;
  year: number;
  handleClose: () => void;
  handleSelect: (month: number, year: number) => void;
}

const RealtimeDialog = ({ open, month, year, handleClose, handleSelect }: DialogProps) => {
  const { t } = useTranslation();
  const months = t("stats.months", { returnObjects: true }) as string[];
  const [tempMonth, setTempMonth] = useState(month);
  const [tempYear, setTempYear] = useState(year);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setTempMonth(month);
      setTempYear(year);
    }
  }, [open, month, year]);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear; i >= 2021 && years.length < 5; i--) {
    years.push(i);
  }

  return (
    <Dialog disableEscapeKeyDown open={open} onClose={handleClose}>
      <DialogTitle>{t("stats.searchDates")}</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel htmlFor="dialog-month">{t("stats.month")}</InputLabel>
            <Select
              native
              value={tempMonth}
              onChange={(e) => setTempMonth(Number(e.target.value))}
              input={<OutlinedInput label={t("stats.month")} id="dialog-month" />}
            >
              <option aria-label="None" value="" />
              {months.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="dialog-year-label">{t("stats.year")}</InputLabel>
            <Select
              labelId="dialog-year-label"
              value={tempYear}
              onChange={(e) => setTempYear(Number(e.target.value))}
              input={<OutlinedInput label={t("stats.year")} />}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button onClick={() => handleSelect(tempMonth, tempYear)}>{t("common.confirm")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RealtimeDialog;
