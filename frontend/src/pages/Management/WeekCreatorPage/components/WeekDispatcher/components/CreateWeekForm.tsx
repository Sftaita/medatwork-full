import React from "react";
import useWeekShedulerContext from "../../../../../../hooks/useWeekShedulerContext";
import {
  Grid,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
} from "@mui/material";

const CreateWeekForm = ({ onCancel, _onSubmit }) => {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#16b1ff");
  const { weekTypes, setWeekTypes } = useWeekShedulerContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() === "") {
      return;
    }
    const newWeekType = {
      id: `new${Date.now()}`, // Remplacez par la méthode appropriée pour générer un nouvel ID
      name: title,
      description: description,
      color: color,
    };

    setWeekTypes([...weekTypes, newWeekType]);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2} direction="column" padding={2}>
        <Grid item>
          <Typography variant="h5" align="center" color={"primary"}>
            Créer une semaine
          </Typography>
        </Grid>
        <Grid item>
          <TextField
            label="Titre"
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
            {["#16b1ff", "#56ca00", "#ffb400", "#9155fd", "#ff4c51", "#a439b6"].map((c) => (
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
            <Button type="submit" variant="contained" disabled={title.trim() === ""}>
              Continuer
            </Button>
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
