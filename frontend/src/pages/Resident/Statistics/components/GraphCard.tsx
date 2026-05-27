import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const [data, setData] = useState([]);
  const [isPending, setIsPending] = useState(true);

  const createLabel = () => {
    if (timesheets && timesheets.week) {
      const chartData = [];

      Object.keys(timesheets.week).forEach((key) => {
        const heure = timesheets.week[key];
        const weekNum = parseInt(key, 10);
        const formattedHeure = `${Math.floor(heure)}h${Math.round(
          (heure - Math.floor(heure)) * 60
        )}`;
        chartData.push({ name: `${t("stats.week")} ${key}`, weekNum, heure, formattedHeure });
      });

      chartData.sort((a, b) => {
        if (a.weekNum > 40 && b.weekNum < 10) return -1;
        if (a.weekNum < 10 && b.weekNum > 40) return 1;
        return a.weekNum - b.weekNum;
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
            {t("stats.overview")}
          </Typography>
        </Box>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} sm={12}>
            <Card sx={{ p: { xs: 2, md: 4 } }}>
              <Typography color="text.secondary" gutterBottom>
                {t("stats.hoursPerWeek")}
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
                      tickFormatter={(name: string) => {
                        if (!isMd) {
                          return t("stats.weekShort") + name.split(" ").pop();
                        }
                        return name;
                      }}
                    />
                    <YAxis
                      domain={[0, maxValue]}
                      type="number"
                      dataKey="heure"
                      label={{
                        value: isMd ? t("stats.hours") : "",
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
                      name={t("stats.hours")}
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
