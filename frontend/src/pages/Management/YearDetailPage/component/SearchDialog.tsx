// Material UI
import Dialog from "@mui/material/Dialog";

// Local component
import LinearStepper from "./LinearStepper";

const FormDialog = ({ list, open, handleClose, id, updateManagerList }) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={"lg"}
      PaperProps={{
        sx: {
          minHeight: "90vh",
          maxHeight: "80vh",
        },
      }}
    >
      <LinearStepper
        list={list}
        id={id}
        handleClose={handleClose}
        updateManagerList={updateManagerList}
      />
    </Dialog>
  );
};

export default FormDialog;
