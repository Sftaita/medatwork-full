import * as React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const [, setLoading] = React.useState(false);
  const deleteYear = async () => {
    setLoading(true);
    try {
      const { method, url } = yearsApi.deleteYear();
      await axiosPrivate[method](url + yearId);
      toast.success(t("years.deleted"), toastSuccess);
      const updatedYears = years.filter((year) => year.id !== yearId);
      setYears(updatedYears);
    } catch (error) {
      handleApiError(error);
      toast.error(t("years.deleteError"), toastError);
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
      <DialogTitle id="alert-dialog-title">{t("years.leaveTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t("years.leaveBody")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button onClick={() => deleteYear()} autoFocus>
          {t("years.leaveConfirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
