import React from "react";

// Material UI
import { alpha, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/system";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const Container = styled("div")`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
`;

const CircleWrapper = styled("div")`
  width: 100%;
  padding-bottom: 100%;
  position: relative;
`;

const PositionedCircle = styled(CircularProgress)`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`;

const TextContainer = styled("div")`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HoursCircle = ({ hours, minutes }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const totalHours = 72;
  const completedPercentage = Math.min(((hours * 60 + minutes) / (totalHours * 60)) * 100, 100);

  const angle48 = (48 / totalHours) * 360 - 90;
  const angle60 = (60 / totalHours) * 360 - 90;

  const radius = 54;
  const label48X = 50 + radius * Math.sin((angle48 + 90) * (Math.PI / 180));
  const label48Y = 50 - radius * Math.cos((angle48 + 90) * (Math.PI / 180));
  const label60X = 50 + radius * Math.sin((angle60 + 90) * (Math.PI / 180));
  const label60Y = 50 - radius * Math.cos((angle60 + 90) * (Math.PI / 180));

  return (
    <Box padding={isMd ? 4 : 10}>
      <Container>
        <CircleWrapper>
          <PositionedCircle
            variant="determinate"
            value={100}
            size="100%"
            thickness={4}
            style={{
              color: alpha("#a439b6", 0.2),
            }}
          />
          <PositionedCircle
            variant="determinate"
            value={completedPercentage}
            size="100%"
            thickness={4}
            style={{
              color: "#a439b6",
            }}
            sx={{
              strokeLinecap: "round",
            }}
          />

          <PositionedCircle variant="determinate" value={0.1} size="100%" thickness={4} />
          <PositionedCircle
            variant="determinate"
            value={1}
            size="100%"
            thickness={4}
            style={{
              color: "#a439b6",
              transform: `rotate(${angle48}deg)`,
            }}
          />
          <PositionedCircle
            variant="determinate"
            value={1}
            size="100%"
            thickness={4}
            style={{
              color: "#a439b6",
              transform: `rotate(${angle60}deg)`,
            }}
          />
          <TextContainer>
            <Typography variant="h6">
              {hours}h{minutes !== 0 && minutes}
            </Typography>
          </TextContainer>
          <Typography
            variant="caption"
            style={{
              position: "absolute",
              top: `${label48Y}%`,
              left: `${label48X}%`,
              transform: "translate(-100%, -50%)",
            }}
          >
            48
          </Typography>
          <Typography
            variant="caption"
            style={{
              position: "absolute",
              top: `${label60Y}%`,
              left: `${label60X}%`,
              transform: "translate(-100%, -55%)",
            }}
          >
            60
          </Typography>
        </CircleWrapper>
      </Container>
      <Typography variant="body1" align="center">
        Total semaine
      </Typography>
    </Box>
  );
};

export default HoursCircle;
