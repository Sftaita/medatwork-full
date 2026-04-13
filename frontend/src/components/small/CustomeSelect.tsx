import React from "react";
import { useFormik } from "formik";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

const CustomeSelect = () => {
  const formik = useFormik({
    initialValues: {
      job: "",
    },
    // Add other formik configurations...
    onSubmit: (_values) => {},
  });

  return (
    <Grid item xs={12}>
      <Typography variant={"subtitle2"} sx={{ marginBottom: 2 }}>
        Renseignez votre rôle
      </Typography>
      <FormControl fullWidth error={formik.touched.job && Boolean(formik.errors.job)}>
        <InputLabel id="job">Rôle</InputLabel>
        <Select
          labelId="job"
          name={"job"}
          value={formik.values.job}
          onChange={formik.handleChange}
          label="Role"
        >
          <MenuItem value={"male"} key={1}>
            {"Maître de stage"}
          </MenuItem>
          <MenuItem value={"female"} key={2}>
            {"Personnel des ressources humaines"}
          </MenuItem>
        </Select>
        <FormHelperText>{formik.touched.job && formik.errors.job}</FormHelperText>
      </FormControl>
    </Grid>
  );
};

export default CustomeSelect;
