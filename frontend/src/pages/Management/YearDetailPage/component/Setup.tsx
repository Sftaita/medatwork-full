import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
            {t("yearDetail.setup.title")}
          </Typography>
        </Box>
        <Box paddingY={4}>
          <Divider />
        </Box>
        <form>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">{t("yearDetail.setup.events")}</Typography>
              <Typography variant="caption">
                {t("yearDetail.setup.eventsDesc")}
              </Typography>
              <Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label={t("yearDetail.setup.emailNotif")}
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label={t("yearDetail.setup.pushNotif")}
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label={t("yearDetail.setup.sms")}
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={false} color="primary" />}
                    label={t("yearDetail.setup.hrCall")}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">{t("yearDetail.setup.inconsistency")}</Typography>
              <Typography variant="caption">
                {t("yearDetail.setup.eventsDesc")}
              </Typography>
              <Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={false} color="primary" />}
                    label={t("yearDetail.setup.emailNotif")}
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={<Checkbox defaultChecked={true} color="primary" />}
                    label={t("yearDetail.setup.pushNotif")}
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
                    {t("yearDetail.setup.securityDesc")}{" "}
                    <Link color={"primary"} href={"#"} underline={"none"}>
                      {t("yearDetail.setup.securityLink")}
                    </Link>
                  </Typography>
                </Box>
                <Button size={"large"} variant={"contained"} type={"submit"}>
                  {t("yearDetail.setup.save")}
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
            {t("yearDetail.setup.exports")}
          </Typography>
        </Box>
        <Box paddingY={4}>
          <Divider />
        </Box>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">{t("yearDetail.setup.staffPlannerTitle")}</Typography>
            <Typography variant="caption">{t("yearDetail.setup.staffPlannerDesc")}</Typography>
            <Box marginTop={2}>
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setActiveLink("staffPlanner")}
              >
                {t("yearDetail.setup.configure")}
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">{t("yearDetail.setup.excelTitle")}</Typography>
            <Typography variant="caption">{t("yearDetail.setup.excelDesc")}</Typography>
            <Box marginTop={2}>
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setActiveLink("staffPlanner")}
                disabled
              >
                {t("yearDetail.setup.configure")}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Setup;
