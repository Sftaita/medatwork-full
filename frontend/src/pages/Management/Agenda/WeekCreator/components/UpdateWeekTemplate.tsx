import React from "react";
import { toast } from "react-toastify";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTheme } from "@mui/material/styles";

// Material UI
import {
  Grid,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Alert,
} from "@mui/material";
import DeleteDialog from "./addBlocComponents/DeleteDialog";
import { handleApiError } from "@/services/apiError";

const UpdateWeekTemplates = ({ onCancel }) => {
  const theme = useTheme();

  const axiosPrivate = useAxiosPrivate();

  const { weekTemplates, selectedWeekId, setWeekTemplates, setSelectedWeekId } = useWeekShedulerContext();
  // Trouver le weekType par son id
  const selectedWeekTemplate = weekTemplates.find((weekType) => weekType.id === selectedWeekId);

  const [title, setTitle] = React.useState(selectedWeekTemplate?.title || "");
  const [description, setDescription] = React.useState(selectedWeekTemplate?.description || "");
  const [color, setColor] = React.useState(selectedWeekTemplate?.color || "#16b1ff");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (title.trim() === "") {
      return;
    }
    const newWeekTemplate = {
      id: selectedWeekId,
      title: title,
      description: description,
      color: color,
      weekTaskList: selectedWeekTemplate?.weekTaskList,
      canEdit: selectedWeekTemplate?.canEdit,
      canShare: selectedWeekTemplate?.canShare,
    };

    // Store initial state
    const initialWeekTemplates = [...weekTemplates];

    // Update local state optimistically
    setWeekTemplates(
      weekTemplates.map((template) => (template.id === selectedWeekId ? newWeekTemplate : template))
    );
    onCancel();
    toast.success("Mise à jour de la semaine type.", toastSuccess);
    try {
      const { method, url } = weekTemplatesApi.UpdateWeekTemplate(selectedWeekId);
      await axiosPrivate[method](url, newWeekTemplate);
    } catch (error) {
      handleApiError(error);
      toast.error("Oups! Une erreur s'est produite.", toastError);
      // If error occurs, revert back to initial state
      setWeekTemplates(initialWeekTemplates);
    }
  };

  const handleDelete = async () => {
    const initialWeekTemplates = [...weekTemplates];

    setWeekTemplates(weekTemplates.filter((template) => template.id !== selectedWeekId));
    handleClose();
    onCancel();
    toast.success("Suppression de la semaine type.", toastSuccess);
    try {
      const { method, url } = weekTemplatesApi.DeleteWeekTemplate(selectedWeekId);
      await axiosPrivate[method](url);
    } catch (error) {
      handleApiError(error);
      toast.error("Oups! Une erreur s'est produite.", toastError);
      setWeekTemplates(initialWeekTemplates);
    }
  };

  const handleCopy = async () => {
    try {
      const { method, url } = weekTemplatesApi.copyTemplate(selectedWeekId);
      const response = await axiosPrivate[method](url);
      const newTemplate = response.data;
      setWeekTemplates([...weekTemplates, newTemplate]);
      setSelectedWeekId(newTemplate.id);
      onCancel();
      toast.success("Semaine dupliquée avec succès.", toastSuccess);
    } catch (error) {
      handleApiError(error);
      toast.error("Oups! Une erreur s'est produite lors de la duplication.", toastError);
    }
  };

  // Delete Dialog Controller
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const action = () => {
    handleClose();
    handleDelete();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2} direction="column" padding={4}>
          <Grid item>
            <Typography variant="h5" align="center" color={"primary"}>
              {selectedWeekTemplate?.canEdit ? "Editer une semaine" : "Détail de la semaine"}
            </Typography>
          </Grid>
          <Grid item>
            <TextField
              label="Titre*"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                readOnly: selectedWeekTemplate?.canEdit ? false : true,
              }}
            />
          </Grid>
          <Grid item>
            <TextField
              name="description"
              label="Description"
              rows={3}
              multiline
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                readOnly: selectedWeekTemplate?.canEdit ? false : true,
              }}
            />
          </Grid>
          {selectedWeekTemplate?.canEdit && (
            <Grid item>
              <RadioGroup
                row
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="colors"
              >
                {["", "#56ca00", "#ffb400", "#9155fd", "#ff4c51", "#a439b6"].map((c) => (
                  <FormControlLabel
                    key={c}
                    value={c}
                    control={<Radio style={{ color: c }} />}
                    label=""
                  />
                ))}
              </RadioGroup>
            </Grid>
          )}

          <Grid item container spacing={2}>
            {selectedWeekTemplate?.canEdit && (
              <>
                <Grid item>
                  <Button type="submit" variant="contained" disabled={title.trim() === ""}>
                    Modifier
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" onClick={onCancel}>
                    Annuler
                  </Button>
                </Grid>
              </>
            )}
            <Grid item>
              <Button onClick={handleCopy} title="Dupliquer">
                <ContentCopyIcon color="primary" />
              </Button>
            </Grid>
            <Grid item>
              <Button onClick={handleClickOpen}>
                <DeleteIcon style={{ color: theme.palette.warning.main }} />
              </Button>
            </Grid>
          </Grid>

          {!selectedWeekTemplate?.canEdit && (
            <Grid marginLeft={2} marginTop={2}>
              <Alert severity="info">
                Vous n'avez pas les droit pour modifier cette semaine type.
              </Alert>
            </Grid>
          )}
        </Grid>
      </form>
      <DeleteDialog
        handleClickOpen={handleClickOpen}
        handleClose={handleClose}
        open={open}
        action={action}
      />
    </>
  );
};

export default UpdateWeekTemplates;
