import React from "react";
import { toast } from "react-toastify";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import { toastError } from "../../../../../doc/ToastParams";

// Material UI
import {
  Grid,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { useState } from "react";
import { handleApiError } from "@/services/apiError";

const CreateWeekForm = ({ onCancel, _onSubmit }) => {
  const axiosPrivate = useAxiosPrivate();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#56ca00");
  const { weekTemplates, setWeekTemplates, setSelectedWeekId } =
    useWeekShedulerContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    if (title.trim() === "") {
      return;
    }
    const newWeekType = {
      title: title,
      description: description,
      color: color,
    };

    try {
      const { method, url } = weekTemplatesApi.CreateWeekTemplate();

      const request = await axiosPrivate[method](url, newWeekType);
      setWeekTemplates([...weekTemplates, request.data]);
      setSelectedWeekId(request.data.id);
      onCancel();
    } catch (error) {
      handleApiError(error);
      toast.error("Oups! Une erreur c'est produite.", toastError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2} direction="column" padding={4}>
        <Grid item>
          <Typography variant="h5" align="center" color={"primary"}>
            Créer une semaine
          </Typography>
        </Grid>
        <Grid item>
          <TextField
            label="Titre*"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
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
          />
        </Grid>
        <Grid item>
          <RadioGroup
            row
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="colors"
          >
            {["#56ca00", "#ffb400", "#9155fd", "#ff4c51", "#a439b6"].map((c) => (
              <FormControlLabel
                key={c}
                value={c}
                control={<Radio style={{ color: c }} />}
                label=""
              />
            ))}
          </RadioGroup>
        </Grid>
        <Grid item container spacing={2}>
          <Grid item>
            <LoadingButton
              type="submit"
              variant="contained"
              disabled={title.trim() === ""}
              loading={isLoading}
            >
              Enregistrer
            </LoadingButton>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={onCancel}>
              Annuler
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </form>
  );
};

export default CreateWeekForm;
