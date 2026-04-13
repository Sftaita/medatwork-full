import React from "react";
import Box from "@mui/material/Box";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import FormControlLabel from "@mui/material/FormControlLabel";

const Setup = ({ setActiveLink }) => {
  return (
    <Box>
      <Box marginBottom={2}>
        <Box
          display={"flex"}
          flexDirection={{ xs: "column", md: "row" }}
          justifyContent={"space-between"}
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Typography variant="h6" fontWeight={700}>
            Paramètres de l'année
          </Typography>
        </Box>
        <Box paddingY={4}>
          <Divider />
        </Box>
        <form>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Evènement</Typography>
              <Typography variant="caption">
                Vous recevrez un email sur l'adresse email liée au compte
              </Typography>
              <Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label="Notification Email"
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label="Notification Push"
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label="SMS"
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={false} color="primary" />}
                    label="Appel RH"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Incohérence / Dépassement</Typography>
              <Typography variant="caption">
                Vous recevrez un email sur l'adresse email liée au compte
              </Typography>
              <Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={false} color="primary" />}
                    label="Notification Email"
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label="Notification Push"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item container xs={12}>
              <Box
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretched", sm: "center" }}
                justifyContent={"space-between"}
                width={1}
                margin={"0 auto"}
              >
                <Box marginBottom={{ xs: 1, sm: 0 }}>
                  <Typography variant={"subtitle2"}>
                    Cliquez ici pour mettre à jour vos{" "}
                    <Link color={"primary"} href={"#"} underline={"none"}>
                      paramètres de sécurité
                    </Link>
                  </Typography>
                </Box>
                <Button size={"large"} variant={"contained"} type={"submit"}>
                  Save
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>

      <Box marginBottom={2}>
        <Box
          display={"flex"}
          flexDirection={{ xs: "column", md: "row" }}
          justifyContent={"space-between"}
          alignItems={{ xs: "flex-start", md: "center" }}
          marginTop={4}
        >
          <Typography variant="h6" fontWeight={700}>
            Paramètres d'exportations
          </Typography>
        </Box>
        <Box paddingY={4}>
          <Divider />
        </Box>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">StaffPlanner</Typography>
            <Typography variant="caption">Paramètrez les resources nécessaires</Typography>
            <Box marginTop={2}>
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setActiveLink("staffPlanner")}
              >
                Configurer
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Excel</Typography>
            <Typography variant="caption">Définissez les règles d'exportation</Typography>
            <Box marginTop={2}>
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setActiveLink("staffPlanner")}
                disabled
              >
                Configurer
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Setup;
