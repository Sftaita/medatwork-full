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
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 2021 && years.length < 5; i--) {
    years.push(i);
  }

  return (
    <Dialog disableEscapeKeyDown open={open} onClose={handleClose}>
      <DialogTitle>Dates recherchées</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel htmlFor="demo-dialog-native">Mois</InputLabel>
            <Select
              native
              value={month}
              onChange={handleMonthChange}
              input={<OutlinedInput label="Month" id="demo-dialog-native" />}
            >
              <option aria-label="None" value="" />
              <option value={1}>JANVIER</option>
              <option value={2}>FEVRIER</option>
              <option value={3}>MARS</option>
              <option value={4}>AVRIL</option>
              <option value={5}>MAI</option>
              <option value={6}>JUIN</option>
              <option value={7}>JUILLET</option>
              <option value={8}>AOUT</option>
              <option value={9}>SEPTEMBRE</option>
              <option value={10}>OCTOBRE</option>
              <option value={11}>NOVEMBRE</option>
              <option value={12}>DECEMBRE</option>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="demo-dialog-select-label">Année</InputLabel>
            <Select
              labelId="demo-dialog-select-label"
              id="demo-dialog-select"
              value={year}
              onChange={handleYearChange}
              input={<OutlinedInput label="Année" />}
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
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSelect}>Valider</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Dialiog;
