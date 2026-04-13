import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CountUp from "react-countup";
import { useTheme } from "@mui/material/styles";
import { Card } from "@mui/material";

const CardItem = ({ title, icon: Icon, value, color: _color, detailNumber }) => {
  const theme = useTheme();
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);

  return (
    <Card sx={{ p: { xs: 2, md: 4 } }}>
      <Stack
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        spacing={1}
        marginBottom={1}
      >
        <Icon color="primary" />
        <Typography color={"text.secondary"} gutterBottom>
          {title}
        </Typography>
      </Stack>
      <Typography variant={"h4"} color={"primary"} gutterBottom sx={{ fontWeight: 700 }}>
        <CountUp start={0} end={hours} duration={2} />

        <Typography component={"span"} variant={"h4"} color={"primary"} sx={{ fontWeight: 700 }}>
          {"h"}
        </Typography>

        {minutes !== 0 && (
          <Typography component={"span"} variant={"h5"} color={"primary"} sx={{ fontWeight: 700 }}>
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
    </Card>
  );
};

export default CardItem;
