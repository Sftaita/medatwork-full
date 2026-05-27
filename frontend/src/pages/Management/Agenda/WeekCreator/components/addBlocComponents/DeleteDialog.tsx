import * as React from "react";
import { useTranslation } from "react-i18next";

// Material UI
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function DeleteDialog({ _handleClickOpen, handleClose, open, action }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{t("weekCreator.deleteDialog.title")}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t("weekCreator.deleteDialog.body")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("weekCreator.deleteDialog.cancel")}</Button>
        <Button onClick={action} style={{ color: theme.palette.warning.main }} autoFocus>
          {t("weekCreator.deleteDialog.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
