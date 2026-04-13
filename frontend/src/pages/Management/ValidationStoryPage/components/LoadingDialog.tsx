import { useEffect, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "@mui/material/Button";
import DialogTitle from "@mui/material/DialogTitle";
import Check from "../../../../images/Check";
import LinearProgress from "@mui/material/LinearProgress";
import ResidentList from "./ResidentList";

const text = {
  1: "MACCS: Vérification des données renseignées pour StaffPlanner",
  2: "Préparation du fichier en cours",
  3: "Renseignement(s) manquant(s)",
};

export default function LoadingDialog({
  open,
  step,
  residents,
  handleClose,
  dialogLoading,
}) {
  const descriptionElementRef = useRef(null);
  useEffect(() => {
    if (open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      scroll={"paper"}
      aria-labelledby="scroll-dialog-title"
      aria-describedby="scroll-dialog-description"
      fullWidth
      heigth={400}
    >
      <DialogTitle id="scroll-dialog-title">{text[step]}</DialogTitle>
      {dialogLoading && <LinearProgress />}

      <DialogContent dividers>
        {step === 3 && (
          <DialogContentText>
            Certaines informations nécessaire au fonctionnement de StaffPlanner doivent être
            renseignées . Vous pouvez renseigner ces dernières en vous rendant dans les paramètres
            de l'année.
          </DialogContentText>
        )}
        {dialogLoading && <Check />}
        {residents?.length !== 0 && <ResidentList residents={residents} />}
      </DialogContent>

      <DialogActions>
        <Button autoFocus disabled={dialogLoading} onClick={() => handleClose()}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
