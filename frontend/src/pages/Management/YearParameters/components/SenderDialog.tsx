import { forwardRef } from "react";
import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

// Material UI
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";
import yearsApi from "../../../../services/yearsApi";
import { Box } from "@mui/system";
import { CircularProgress } from "@mui/material";
import DialogContentText from "@mui/material/DialogContentText";

// Local component
import TextFieldSender from "./SenderBox/TextFieldSender";
import SpecialitySender from "./SenderBox/SpecialitySender";
import MasterSender from "./SenderBox/MasterSender";
import PeriodSender from "./SenderBox/PeriodSender";
import DateSender from "./SenderBox/DateSender";
import { handleApiError } from "@/services/apiError";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const validationSchema = yup.object({
  newValue: yup
    .string()
    .trim()
    .max(255, "La valeur renseignée est trop longue")
    .required("N'oubliez pas de renseigner le champ"),
});

const titleTable = {
  dateOfStart: "Date de début de stage",
  dateOfEnd: "Date de fin de stage",
  period: "Période de stage",
  speciality: "Spécialité",
  location: "Lieu de stage",
  title: "Titre de l'année",
  master: "Maître de stage",
};

const textTable = {
  dateOfStart:
    "La période de stage doit couvrir l'ensemble de l'année académique des MACCS. Elle peut s'étendre sur une durée maximum de un an et 3 mois.",
  dateOfEnd:
    "La période de stage doit couvrir l'ensemble de l'année académique des MACCS. Elle peut s'étendre sur une durée maximum de un an et 3 mois.",
  period: "",
  speciality: "Elle correspond à la spécialité qui sera validée par le MACCS. ",
  location:
    "Le lieu de stage doit correspondre à celui renseigné dans le carnet de stage du MACCS.",
  title:
    "Nous vous conseillons un titre court et explicite. Par exemple: Ortho Saint-Luc 2021-2022.",
  master:
    "Afin de désigner un collègue maître de stage, vous devez disposez des droits administrateurs pour cette année. Les propositions de la liste ne reprennent que les collaborateurs enregistrés à l'année.  Le maître de stage désigné bénéficiera automatiquement des droits administrateurs.",
};

const SenderDialog = ({
  handleClose,
  open,
  target,
  yearId,
  fetchYearInformation,
  yearInfomrations,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [newValue, setNewValue] = useState({ newValue: "" });
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState();
  const [text, setText] = useState();
  const [dates, setDates] = useState({
    dateOfStart: null,
    dateOfEnd: null,
  });

  useEffect(() => {
    if (target === "dateOfStart") {
      setTitle(titleTable.dateOfStart);
      setText(textTable.dateOfStart);
      setNewValue({ newValue: yearInfomrations?.dateOfStart });
    }

    if (target === "dateOfEnd") {
      setTitle(titleTable.dateOfEnd);
      setText(textTable.dateOfEnd);
      setNewValue({ newValue: yearInfomrations?.dateOfEnd });
    }

    if (target === "location") {
      setTitle(titleTable.location);
      setText(textTable.location);
      setNewValue({ newValue: yearInfomrations?.location });
    }

    if (target === "title") {
      setTitle(titleTable.title);
      setText(textTable.title);
      setNewValue({ newValue: yearInfomrations?.title });
    }

    if (target === "speciality") {
      setTitle(titleTable.speciality);
      setText(textTable.speciality);
      setNewValue({ newValue: yearInfomrations?.speciality });
    }

    if (target === "master") {
      setTitle(titleTable.master);
      setText(textTable.master);
      setNewValue({ newValue: yearInfomrations?.master });
    }

    if (target === "period") {
      setTitle(titleTable.period);
      setText(textTable.period);
      setNewValue({ newValue: yearInfomrations?.period });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]); // intentional: yearInfomrations fields excluded to avoid re-running on every prop update

  useEffect(() => {
    setDates((prev) => ({
      ...prev,
      dateOfStart: yearInfomrations?.dateOfStart,
      dateOfEnd: yearInfomrations?.dateOfEnd,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: initialize date fields once on mount

  const onSubmit = async (value) => {
    const dataSelector = () => {
      if (target === "dateOfStart") {
        return dates.dateOfStart;
      } else if (target === "dateOfEnd") {
        return dates.dateOfEnd;
      } else {
        return value.newValue;
      }
    };

    const data = {
      yearId: yearId,
      target: target,
      newValue: dataSelector(),
    };

    setLoading(true);
    try {
      const { method, url } = yearsApi.update();
      await axiosPrivate[method](url, data);
      fetchYearInformation();
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
    if (target === "dateOfStart") {
      return (
        <DateSender
          label={title}
          value={dates.dateOfStart}
          onChange={(value) => setDates({ ...dates, dateOfStart: value })}
        />
      );
    }

    if (target === "dateOfEnd") {
      return (
        <DateSender
          label={title}
          value={dates.dateOfEnd}
          onChange={(value) => setDates({ ...dates, dateOfEnd: value })}
        />
      );
    }

    if (target === "period") {
      return (
        <PeriodSender
          l
          error={formik.touched.newValue && Boolean(formik.errors.newValue)}
          value={formik.values.newValue}
          onChange={formik.handleChange}
        />
      );
    }

    if (target === "location" || target === "title") {
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

    if (target === "master") {
      return (
        <MasterSender
          error={formik.touched.newValue && Boolean(formik.errors.newValue)}
          value={formik.values.newValue}
          onChange={formik.handleChange}
          helperText={formik.touched.newValue && formik.errors.newValue}
          managers={yearInfomrations?.managers}
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
