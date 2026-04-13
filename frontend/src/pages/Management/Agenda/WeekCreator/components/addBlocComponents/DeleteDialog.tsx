import * as React from "react";

// Material UI
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function DeleteDialog({ _handleClickOpen, handleClose, open, action }) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Suppression d'une semaine type"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Êtes-vous sûr de vouloir supprimer cette semaine type de votre répertoire de semaines
          types ?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={action} style={{ color: theme.palette.warning.main }} autoFocus>
          Supprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
