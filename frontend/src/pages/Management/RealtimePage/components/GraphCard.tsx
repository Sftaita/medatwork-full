import React, { useEffect, useState } from "react";
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Box, Grid, Card, Typography, useTheme, CircularProgress } from "@mui/material";
import Container from "../../../../components/medium/Container";
import useMediaQuery from "@mui/material/useMediaQuery";

const GraphCard = ({ timesheets, _month, _year }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [isPending] = useState(false);

  const [data, setData] = useState([]);

  useEffect(() => {
    const data = [];

    if (timesheets && timesheets?.length > 0) {
      const xAxisLabels = Object.keys(timesheets[0].week);

      // Sort the keys based on their numeric value to have them appear in chronological order
      // Weeks greater than 40 appear before weeks less than 10
      xAxisLabels.sort((a, b) => {
        const aValue = parseInt(a, 10);
        const bValue = parseInt(b, 10);

        if (aValue > 40 && bValue < 10) {
          return -1;
        } else if (aValue < 10 && bValue > 40) {
          return 1;
        } else {
          return aValue - bValue;
        }
      });

      xAxisLabels.forEach((week) => {
        const weekData = {
          week: `Semaine ${week}`,
        };
        timesheets.forEach((resident) => {
          weekData[resident.lastname] = resident.week[week];
        });
        data.push(weekData);
      });

      setData(data);
    }
  }, [timesheets]);

  const formatHourTooltip = (value) => {
    const hour = Math.floor(value);
    const minute = Math.round((value - hour) * 60)
      .toString()
      .padStart(2, "0");
    return `${hour}:${minute}`;
  };

  const colors = [
    "#9C27B0",
    "#2196F3",
    "#4CAF50",
    "#F44336",
    "#FF5722",
    "#3F51B5",
    "#009688",
    "#795548",
  ];

  const generateColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const residentLines = timesheets?.map((resident, index) => {
    const color = index < colors.length ? colors[index] : generateColor();
    return (
      <Line
        key={index}
        type="monotone"
        dataKey={resident.lastname}
        stroke={color}
        strokeWidth={4}
        strokeOpacity={0.7}
      />
    );
  });

  const findMaxValue = (data) => {
    let maxValue = 40;
    data.forEach((item) => {
      Object.values(item).forEach((value) => {
        if (typeof value === "number" && value > maxValue) {
          maxValue = value;
        }
      });
    });
    return Math.ceil(maxValue / 5) * 5;
  };

  return (
    <Box sx={{ marginBottom: { xs: theme.spacing(2), md: theme.spacing(6) } }}>
      <Container paddingY={{ xs: 1, md: 0 }}>
        <Box marginBottom={2}>
          <Typography color="primary" variant="h6" fontWeight={700}>
            Vue d'ensemble
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} sm={12}>
            <Card sx={{ p: { xs: 2, md: 4 } }}>
              <Typography color={"text.secondary"} gutterBottom>
                Heures / semaine
              </Typography>
              {!isPending && (
                <ResponsiveContainer height={400}>
                  <LineChart
                    data={data}
                    margin={{
                      top: 20,
                      right: 20,
                      left: isMd ? 0 : -32,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      withVerticalLabels={false}
                      withHorizontalLabels={false}
                      tickFormatter={(name) => {
                        if (!isMd) {
                          return name.replace("Semaine", "S");
                        }
                        return name;
                      }}
                    />
                    <YAxis
                      domain={[0, Math.max(40, findMaxValue(data) + 5)]}
                      type="number"
                      dataKey="heure"
                      label={{
                        value: isMd ? "Heures" : "",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      tickFormatter={(value) => {
                        return isMd ? `${value}h` : value;
                      }}
                    />
                    <Tooltip formatter={formatHourTooltip} />
                    <Legend />
                    {residentLines}
                    <ReferenceLine y={60} stroke="orange" strokeDasharray="3 3" label="60" />
                    <ReferenceLine y={72} stroke="red" strokeDasharray="3 3" label="72" />
                    <ReferenceLine y={48} stroke="green" strokeDasharray="3 3" label="48" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {isPending && (
                <Box display="flex" justifyContent="center">
                  <CircularProgress />
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
export default GraphCard;
