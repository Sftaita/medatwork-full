import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useValidationContext from "../../../../../hooks/useValidationContext";

// Material UI
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function MessageBox({ openDialog, setOpenDialog, notificationType, residentId }) {
  const { t } = useTranslation();
  const { residentValidationData, setResidentValidationData } = useValidationContext();

  const notificationData = {
    ResidentNotification: {
      title: t("yearDetail.validation.msgResident"),
      text: t("yearDetail.validation.msgResidentDesc"),
    },
    ManagerNotification: {
      title: t("yearDetail.validation.msgManager"),
      text: t("yearDetail.validation.msgManagerDesc"),
    },
  };
  const [message, setMessage] = useState("");

  const handleValidation = () => {
    // Make a copy of the array
    const updatedData = [...residentValidationData];

    // Find the resident to update
    const residentIndex = updatedData.findIndex((resident) => resident.residentId === residentId);

    // Update the resident
    updatedData[residentIndex] = {
      ...updatedData[residentIndex],
      // Update the residentNotification or managerComment based on notificationType
      managerComment:
        notificationType === "ManagerNotification"
          ? message
          : updatedData[residentIndex].managerComment,
      residentNotification:
        notificationType === "ResidentNotification"
          ? message
          : updatedData[residentIndex].residentNotification,
    };

    // Update the state
    setResidentValidationData(updatedData);
    handleClose();
    setMessage("");
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  const handleOpen = () => {
    // Find the right resident in residentValidationData
    const resident = residentValidationData.find((resident) => resident.residentId === residentId);

    // Set the message to the appropriate notification based on notificationType
    setMessage(
      notificationType === "ResidentNotification"
        ? resident.residentNotification
        : resident.managerComment
    );
  };

  useEffect(() => {
    if (openDialog && residentValidationData.length > 0) {
      handleOpen();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationType, openDialog, residentValidationData]); // intentional: handleOpen excluded — it's redefined on every render but its logic depends on the listed deps

  return (
    <div>
      <Dialog open={openDialog} onClose={handleClose}>
        <DialogTitle>
          {notificationType === "ResidentNotification"
            ? notificationData.ResidentNotification.title
            : notificationData.ManagerNotification.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {notificationType === "ResidentNotification"
              ? notificationData.ResidentNotification.text
              : notificationData.ManagerNotification.text}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label={t("yearDetail.validation.msgLabel")}
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t("yearDetail.validation.msgCancel")}</Button>
          <Button onClick={handleValidation}>{t("yearDetail.validation.msgConfirm")}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
