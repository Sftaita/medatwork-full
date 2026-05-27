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

const Dialiog = ({
  open,
  month,
  year,
  handleMonthChange,
  handleYearChange,
  handleClose,
  handleSelect,
}) => {
  const { t } = useTranslation();
  const months = t("stats.months", { returnObjects: true }) as string[];

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 2021 && years.length < 5; i--) {
    years.push(i);
  }

  return (
    <Dialog disableEscapeKeyDown open={open} onClose={handleClose}>
      <DialogTitle>{t("stats.searchDates")}</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel htmlFor="demo-dialog-native">{t("stats.month")}</InputLabel>
            <Select
              native
              value={month}
              onChange={handleMonthChange}
              input={<OutlinedInput label={t("stats.month")} id="demo-dialog-native" />}
            >
              <option aria-label="None" value="" />
              {months.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="demo-dialog-select-label">{t("stats.year")}</InputLabel>
            <Select
              labelId="demo-dialog-select-label"
              id="demo-dialog-select"
              value={year}
              onChange={handleYearChange}
              input={<OutlinedInput label={t("stats.year")} />}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button onClick={handleSelect}>{t("common.confirm")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Dialiog;
