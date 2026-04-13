import { useState, useEffect } from "react";
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
      <DialogTitle>Dates recherchées</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel htmlFor="dialog-month">Mois</InputLabel>
            <Select
              native
              value={tempMonth}
              onChange={(e) => setTempMonth(Number(e.target.value))}
              input={<OutlinedInput label="Mois" id="dialog-month" />}
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
            <InputLabel id="dialog-year-label">Année</InputLabel>
            <Select
              labelId="dialog-year-label"
              value={tempYear}
              onChange={(e) => setTempYear(Number(e.target.value))}
              input={<OutlinedInput label="Année" />}
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
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={() => handleSelect(tempMonth, tempYear)}>Valider</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RealtimeDialog;
