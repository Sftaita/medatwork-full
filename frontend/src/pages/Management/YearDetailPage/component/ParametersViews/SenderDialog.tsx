import { forwardRef } from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as yup from "yup";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import managersApi from "../../../../../services/managersApi";

// Material UI
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";
import { Box } from "@mui/system";
import { CircularProgress } from "@mui/material";
import DialogContentText from "@mui/material/DialogContentText";
import { TextField } from "@mui/material";
import { handleApiError } from "@/services/apiError";

// Local component

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const buildValidationSchema = (t) => yup.object({
  workerHRID: yup.string().trim().max(50, t("yearDetail.staffPlanner.tooLong")),
  sectionHRID: yup.string().trim().max(50, t("yearDetail.staffPlanner.tooLong")),
});

const SenderDialog = ({ handleClose, relation, open, fetchStaffPlannerList }) => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const [newValue, setNewValue] = useState({
    workerHRID: "",
    sectionHRID: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewValue({
      workerHRID: relation?.workerHRID,
      sectionHRID: relation?.sectionHRID,
    });
  }, [relation]);

  const onSubmit = async (values) => {
    setLoading(true);
    const data = {
      resourceId: relation?.relationId,
      workerHRID: values?.workerHRID,
      sectionHRID: values?.sectionHRID,
    };

    try {
      const { method, url } = managersApi.updateStaffPlannerList();
      await axiosPrivate[method](url, data);
      fetchStaffPlannerList();
      setNewValue({ ...newValue, workerHRID: "", sectionHRID: "" });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  // Closing dialog box
  const close = () => {
    handleClose();
    setNewValue({ ...newValue, workerHRID: "", sectionHRID: "" });
    formik.resetForm();
  };

  const formik = useFormik({
    initialValues: newValue,
    enableReinitialize: true,
    validationSchema: buildValidationSchema(t),
    onSubmit,
  });

  return (
    <div>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        fullWidth={"lg"}
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{t("yearDetail.staffPlanner.dialogTitle")}</DialogTitle>
          <DialogContent>
            <DialogContentText marginBottom={2} align={"justify"}>
              {t("yearDetail.staffPlanner.dialogDesc")}
            </DialogContentText>
            {!loading && (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  id="workerHRID"
                  name="workerHRID"
                  label={t("yearDetail.staffPlanner.worker")}
                  value={formik.values.workerHRID}
                  onChange={formik.handleChange}
                  type="text"
                  fullWidth
                  variant="standard"
                  error={formik.touched.workerHRID && Boolean(formik.errors.workerHRID)}
                  helperText={formik.touched.workerHRID && formik.errors.workerHRID}
                />
                <TextField
                  autoFocus
                  margin="dense"
                  id="sectionHRID"
                  name="sectionHRID"
                  label={t("yearDetail.staffPlanner.section")}
                  value={formik.values.sectionHRID}
                  onChange={formik.handleChange}
                  type="text"
                  fullWidth
                  variant="standard"
                  error={formik.touched.sectionHRID && Boolean(formik.errors.sectionHRID)}
                  helperText={formik.touched.sectionHRID && formik.errors.sectionHRID}
                />
              </>
            )}
            {loading && (
              <Box
                position={"relative"}
                display={"flex"}
                justifyContent={"center"}
                alignItems="center"
              >
                <Box minHeight={"100%"}>
                  <CircularProgress />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>{t("yearDetail.staffPlanner.cancel")}</Button>
            <Button type={"submit"}>{t("yearDetail.staffPlanner.save")}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default SenderDialog;
