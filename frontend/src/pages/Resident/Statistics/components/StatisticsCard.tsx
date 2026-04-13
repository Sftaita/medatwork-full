import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import Avatar from "@mui/material/Avatar";
import CountUp from "react-countup";

const StatisticsCard = ({ title = "", subtitle = "", number = 0, icon, detailNumber = "" }) => {
  const theme = useTheme();
  const hours = Math.floor(number);
  const minutes = Math.round((number - hours) * 60);

  return (
    <Grid item xs={12} sm={6} md={3} sx={{ marginBottom: theme.spacing(4), padding: 0 }}>
      <Box
        component={Card}
        paddingLeft={4}
        paddingRight={4}
        paddingBottom={0}
        paddingTop={4}
        variant={"outlined"}
        height={1}
      >
        <Box display={"flex"} flexDirection={"column"}>
          <Box
            component={Avatar}
            width={50}
            height={50}
            marginBottom={2}
            bgcolor={theme.palette.primary.main}
            color={theme.palette.background.paper}
          >
            {icon}
          </Box>
          <Typography variant={"h4"} color={"primary"} gutterBottom sx={{ fontWeight: 700 }}>
            <CountUp start={0} end={hours} duration={2} />
            {minutes !== 0 && (
              <Typography
                component={"span"}
                variant={"h4"}
                color={"primary"}
                sx={{ fontWeight: 700 }}
              >
                {"h"}
              </Typography>
            )}
            {minutes !== 0 && (
              <Typography
                component={"span"}
                variant={"h5"}
                color={"primary"}
                sx={{ fontWeight: 700 }}
              >
                <CountUp start={0} end={minutes < 10 ? "0" + minutes : minutes} duration={2} />
              </Typography>
            )}
            {detailNumber && (
              <Typography
                component={"span"}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginLeft: 1,
                  color: theme.palette.success,
                }}
              >
                {"| " + detailNumber}
              </Typography>
            )}
          </Typography>
          <Typography variant={"h6"} gutterBottom sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">{subtitle}</Typography>
        </Box>
      </Box>
    </Grid>
  );
};

export default StatisticsCard;
