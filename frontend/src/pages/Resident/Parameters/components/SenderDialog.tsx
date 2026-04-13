import { forwardRef } from "react";
import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import residentsApi from "../../../../services/residentsApi";

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

// Local component
import TextFieldSender from "./SenderBox/TextFieldSender";
import SpecialitySender from "./SenderBox/SpecialitySender";
import SexeSender from "./SenderBox/SexeSender";
import DateSender from "./SenderBox/DateSender";
import { handleApiError } from "@/services/apiError";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const validationSchema = yup.object({
  newValue: yup.string().trim().max(255, "La valeur renseignée est trop longue"),
});

const titleTable = {
  firstname: "Votre prénom",
  lastname: "Votre nom de famille",
  dateOfBirth: "Date de naissance",
  sexe: "Genre",
  university: "Université",
  speciality: "Spécialité",
  dateOfMaster: "Date de début de spécialisation",
};

const textTable = {
  firstname: "Votre nom et prénom peuvent être lus par les autres utilisateurs de l'application.",
  lastname: "Votre nom et prénom peuvent être lus par les autres utilisateurs de l'application.",
  dateOfBirth: "",
  sexe: "",
  university: "Université dans laquelle vous êtes inscrit en master de spécialisation.",
  speciality: "",
  dateOfMaster:
    "Correspond au premier jour de formation en master de spécialisation. Cette information nous permettra de calculer votre année de formation.",
};

const SenderDialog = ({
  handleClose,
  _handleClickOpen,
  open,
  target,
  _yearId,
  fetchUserInfo,
  userInfomrations,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [newValue, setNewValue] = useState({ newValue: "" });
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState();
  const [text, setText] = useState();
  const [dates, setDates] = useState({
    dateOfBirth: null,
    dateOfStart: null,
  });

  useEffect(() => {
    if (target === "lastname") {
      setTitle(titleTable.lastname);
      setText(textTable.lastname);
      setNewValue({ newValue: userInfomrations?.lastname });
    }

    if (target === "firstname") {
      setTitle(titleTable.firstname);
      setText(textTable.firstname);
      setNewValue({ newValue: userInfomrations?.firstname });
    }

    if (target === "dateOfBirth") {
      setTitle(titleTable.dateOfBirth);
      setText(textTable.dateOfBirth);
      setNewValue({ newValue: userInfomrations?.dateOfBirth });
    }

    if (target === "dateOfEnd") {
      setTitle(titleTable.dateOfEnd);
      setText(textTable.dateOfEnd);
      setNewValue({ newValue: userInfomrations?.dateOfEnd });
    }

    if (target === "sexe") {
      setTitle(titleTable.sexe);
      setText(textTable.sexe);
      setNewValue({ newValue: userInfomrations?.sexe });
    }

    if (target === "university") {
      setTitle(titleTable.university);
      setText(textTable.university);
      setNewValue({ newValue: userInfomrations?.university });
    }

    if (target === "speciality") {
      setTitle(titleTable.speciality);
      setText(textTable.speciality);
      setNewValue({ newValue: userInfomrations?.speciality });
    }

    if (target === "dateOfMaster") {
      setTitle(titleTable.dateOfMaster);
      setText(textTable.dateOfMaster);
      setNewValue({ newValue: userInfomrations?.dateOfMaster });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]); // intentional: userInfomrations fields excluded to avoid re-running on every prop update

  useEffect(() => {
    setDates((prev) => ({
      ...prev,
      dateOfBirth: userInfomrations?.dateOfBirth,
      dateOfMaster: userInfomrations?.dateOfMaster,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: initialize date fields once on mount

  const onSubmit = async (value) => {
    const dataSelector = () => {
      if (target === "dateOfBirth") {
        return dates.dateOfBirth;
      } else if (target === "dateOfMaster") {
        return dates.dateOfMaster;
      } else {
        return value.newValue;
      }
    };
    const data = {
      target: target,
      newValue: dataSelector(),
    };

    setLoading(true);
    try {
      const { method, url } = residentsApi.update();
      await axiosPrivate[method](url, data);
      fetchUserInfo();
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
    formik.resetForm();
  };

  const formik = useFormik({
    initialValues: newValue,
    enableReinitialize: true,
    validationSchema: validationSchema,
    onSubmit,
  });

  const layer = () => {
    if (target === "dateOfBirth") {
      return (
        <DateSender
          label={title}
          value={dates.dateOfBirth}
          onChange={(value) => setDates({ ...dates, dateOfBirth: value })}
        />
      );
    }

    if (target === "dateOfMaster") {
      return (
        <DateSender
          label={title}
          value={dates.dateOfMaster}
          onChange={(value) => setDates({ ...dates, dateOfMaster: value })}
        />
      );
    }

    if (target === "firstname" || target === "lastname" || target === "university") {
      return (
        <TextFieldSender
          label={title}
          value={formik.values.newValue}
          onChange={formik.handleChange}
          error={formik.touched.newValue && Boolean(formik.errors.newValue)}
          helperText={formik.touched.newValue && formik.errors.newValue}
        />
      );
    }

    if (target === "sexe") {
      return (
        <SexeSender
          error={formik.touched.newValue && Boolean(formik.errors.newValue)}
          value={formik.values.newValue}
          onChange={formik.handleChange}
          helperText={formik.touched.newValue && formik.errors.newValue}
          managers={userInfomrations?.sexe}
        />
      );
    }

    if (target === "speciality") {
      return (
        <SpecialitySender
          error={formik.touched.newValue && Boolean(formik.errors.newValue)}
          value={formik.values.newValue}
          onChange={formik.handleChange}
          helperText={formik.touched.newValue && formik.errors.newValue}
        />
      );
    }
  };

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
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <DialogContentText marginBottom={2} align={"justify"}>
              {text}
            </DialogContentText>
            {!loading && layer()}
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
            <Button onClick={close}>Annuler</Button>
            <Button type={"submit"}>Enregistrer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default SenderDialog;
