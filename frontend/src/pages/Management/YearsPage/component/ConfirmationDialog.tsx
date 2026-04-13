import * as React from "react";
import yearsApi from "../../../../services/yearsApi";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

export default function ConfirmationDialog({ open, handleClose, yearId, years, setYears }) {
  const axiosPrivate = useAxiosPrivate();
  const [, setLoading] = React.useState(false);
  const deleteYear = async () => {
    setLoading(true);
    try {
      const { method, url } = yearsApi.deleteYear();
      await axiosPrivate[method](url + yearId);
      toast.success("Année supprimée!", toastSuccess);

      // Filter out the deleted year from the local state
      const updatedYears = years.filter((year) => year.id !== yearId);
      setYears(updatedYears); // Update the state with the new array
    } catch (error) {
      handleApiError(error);
      toast.error("Oups, une erreur c'est produite!", toastError);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Quitter l'année de formation?"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Êtes-vous sûr de vouloir quitter cette année de formation ? En confirmant, vous perdrez
          tout lien avec l'année de formation. Vous pourrez toujours demander à y être réinvité.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={() => deleteYear()} autoFocus>
          Oui, je suis sûr
        </Button>
      </DialogActions>
    </Dialog>
  );
}
