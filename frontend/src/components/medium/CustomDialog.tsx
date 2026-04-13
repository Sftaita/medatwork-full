import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import InfoIcon from "@mui/icons-material/Info";
import { Stack, Typography } from "@mui/material";

const CustomDialog = ({ handleClose, open, title, text }) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
          <InfoIcon color={"primary"} />
          <Typography variant="h4"></Typography> {title}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText align="justify" id="alert-dialog-description">
          {text}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomDialog;
