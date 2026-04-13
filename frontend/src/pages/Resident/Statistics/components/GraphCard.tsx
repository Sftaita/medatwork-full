import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";

// General components
import Container from "../../../../components/medium/Container";

const GraphCard = ({ timesheets, _month, _year }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const [data, setData] = useState([]);
  const [isPending, setIsPending] = useState(true);

  const createLabel = () => {
    if (timesheets && timesheets.week) {
      // Create an array to store the chart data
      const chartData = [];

      // Loop through each week and create a data object for each
      Object.keys(timesheets.week).forEach((key) => {
        // Calculate the hour value
        const heure = timesheets.week[key];
        const formattedHeure = `${Math.floor(heure)}h${Math.round(
          (heure - Math.floor(heure)) * 60
        )}`;
        // Push the data object to the chartData array
        chartData.push({ name: `Semaine ${key}`, heure, formattedHeure });
      });

      // Sort the data by week number to ensure chronological order
      chartData.sort((a, b) => {
        const aValue = parseInt(a.name.replace("Semaine ", ""), 10);
        const bValue = parseInt(b.name.replace("Semaine ", ""), 10);

        if (aValue > 40 && bValue < 10) {
          return -1;
        } else if (aValue < 10 && bValue > 40) {
          return 1;
        } else {
          return aValue - bValue;
        }
      });

      // Set the chart data to state and mark the loading as finished
      setData(chartData);
      setIsPending(false);
    }
  };

  const formatHourTooltip = (value) => {
    const hour = Math.floor(value);
    const minute = Math.round((value - hour) * 60)
      .toString()
      .padStart(2, "0");
    return `${hour}:${minute}`;
  };

  useEffect(() => {
    createLabel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesheets]); // intentional: createLabel is defined above and depends only on timesheets

  const findMaxValue = (data) => {
    return data.reduce((max, item) => {
      return Math.max(max, item.heure);
    }, 0);
  };

  const interval = 5;
  const maxValue = Math.ceil(Math.max(40, findMaxValue(data) + 5) / interval) * interval;

  return (
    <Box sx={{ marginBottom: theme.spacing(6) }}>
      <Container>
        {" "}
        <Box marginBottom={2}>
          <Typography color="primary" variant="h6" fontWeight={700}>
            Vue d'ensemble
          </Typography>
        </Box>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} sm={12}>
            <Card sx={{ p: { xs: 2, md: 4 } }}>
              <Typography color="text.secondary" gutterBottom>
                Heures / semaines
              </Typography>
              {!isPending && data.length > 0 && (
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
                      dataKey="name"
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
                      domain={[0, maxValue]}
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
                    <Line
                      type="monotone"
                      dataKey="heure"
                      stroke="#9C27B0"
                      strokeWidth={4}
                      strokeOpacity={0.7}
                      name="Heures"
                    />
                    <ReferenceLine y={60} stroke="orange" strokeDasharray="3 3" label="60" />
                    <ReferenceLine y={72} stroke="red" strokeDasharray="3 3" label="72" />
                    <ReferenceLine y={48} stroke="green" strokeDasharray="3 3" label="48" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {isPending && !data.length && (
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
