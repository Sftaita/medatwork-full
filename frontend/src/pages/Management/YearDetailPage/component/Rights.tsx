import React from "react";
import { useTranslation } from "react-i18next";
import Switch from "@mui/material/Switch";
import { Box } from "@mui/system";
import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local component
import UserCard from "./UserCard";

const Rights = ({ selectedManager, state, setState }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const handleChange = (event) => {
    setState({
      ...state,
      [event.target.name]: event.target.checked,
    });
    if (event.target.name === "admin" && event.target.checked === true) {
      setState({
        dataAccess: true,
        dataValidation: true,
        dataDownload: true,
        inviteAutorisation: true,
        admin: true,
        agenda: true,
        schedule: true,
      });
    }
  };

  return (
    <Box marginTop={theme.spacing(2)} bgcolor={"alternate.main"} padding={theme.spacing(2)}>
      <Typography variant={"h6"} sx={{ marginBottom: theme.spacing(2) }}>
        {t("yearDetail.rights.title")}
      </Typography>
      <Grid
        container
        direction={isMd ? "row" : "column"}
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid item xs={6} md={8}>
          <FormControl component="fieldset" variant="standard">
            <FormLabel component="legend">{t("yearDetail.rights.responsibility")}</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch checked={state.dataAccess} onChange={handleChange} name="dataAccess" />
                }
                label={t("yearDetail.rights.dataConsult")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={state.dataValidation}
                    onChange={handleChange}
                    name="dataValidation"
                  />
                }
                label={t("yearDetail.rights.dataValidation")}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={state.dataDownload}
                    onChange={handleChange}
                    name="dataDownload"
                  />
                }
                label={t("yearDetail.rights.dataDownload")}
              />

              <FormControlLabel
                control={<Switch checked={state.agenda} onChange={handleChange} name="agenda" />}
                label={t("yearDetail.rights.agenda")}
              />
              <FormControlLabel
                control={
                  <Switch checked={state.schedule} onChange={handleChange} name="schedule" />
                }
                label={t("yearDetail.rights.planning")}
              />
            </FormGroup>
            <FormControlLabel
              control={<Switch checked={state.admin} onChange={handleChange} name="admin" />}
              label={t("yearDetail.rights.admin")}
            />
            <FormHelperText>{t("yearDetail.rights.note")}</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={4} marginTop={isMd ? "" : theme.spacing(5)}>
          <UserCard selectedManager={selectedManager} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Rights;
