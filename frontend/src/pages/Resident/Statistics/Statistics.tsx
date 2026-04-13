import { useState, useEffect, useCallback } from "react";
import timesheetsApi from "../../../services/timesheetsApi";
import { monthList } from "../../../doc/lists";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";

// material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FormControl from "@mui/material/FormControl";

// local component
import GraphCard from "./components/GraphCard";
import Dialog from "./components/Dialog";
import TimeCard from "./components/TimeCard";
import { Grid, Select, MenuItem } from "@mui/material";
import { Container } from "@mui/system";
import { handleApiError } from "@/services/apiError";

const Statistics = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();

  const [years, setYears] = useState([]);
  const [currentYear, setCurrentYear] = useState();
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setYearsLoading] = useState(true);

  const todayDate = new Date();

  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [open, setOpen] = useState(false);

  const getStats = useCallback(async () => {
    setLoading(true);
    setOpen(false);
    try {
      const { method, url } = timesheetsApi.getResidentStatisticsAtFirstLoad();
      const request = await axiosPrivate[method](url + month);

      setYears(request?.data.years);
      setStatistics(request?.data?.statistics[0]);
      setCurrentYear(request?.data?.years[0]["yearId"]);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
      setYearsLoading(false);
    }
  }, [axiosPrivate, month, year]);

  useEffect(() => {
    getStats();
  }, [getStats]);

  const getStatisticsByYear = async (yearId) => {
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.getResidentRealtimeByMonthAndYear();
      const request = await axiosPrivate[method](url + month + "/" + yearId);
      setStatistics(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearsChange = (yearId) => {
    setCurrentYear(yearId);
    getStatisticsByYear(yearId);
  };

  // Dialog controller
  const handleClose = (event, reason) => {
    if (reason !== "backdropClick") {
      setOpen(false);
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  return (
    <Container>
      <Box
        maxWidth={"100%"}
        height={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={theme.spacing(2)}
      >
        <Box marginBottom={4}>
          <Typography
            sx={{
              textTransform: "uppercase",
              fontWeight: "medium",
            }}
            gutterBottom
            color={"secondary"}
            align={"center"}
          >
            Activité par mois
          </Typography>
          <Typography
            variant="h4"
            align={"center"}
            gutterBottom
            sx={{
              fontWeight: 700,
            }}
          >
            En temps réel
          </Typography>
        </Box>
        <>
          {!loading && (
            <Grid
              container
              direction={isMd ? "row" : "column"}
              justifyContent="flex-start"
              alignItems="center"
              marginBottom={2}
            >
              <Grid item sm={12} md={4} sx={{ width: "100%" }}>
                <FormControl size="small" fullWidth>
                  <Select
                    labelId="year"
                    name={"year"}
                    value={currentYear}
                    onChange={(value) => handleYearsChange(value.target.value)}
                    fullWidth
                  >
                    {years.map((item, key) => (
                      <MenuItem value={item.yearId} key={key}>
                        {item.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3} sx={{ width: "100%" }}>
                <Box
                  component={Button}
                  variant="outlined"
                  color="primary"
                  size="large"
                  marginTop={{ xs: 2, sm: 0 }}
                  marginLeft={{ sm: 2 }}
                  fullWidth
                  onClick={handleClickOpen}
                >
                  <KeyboardArrowDownIcon />
                  {monthList[month] + " " + year}
                </Box>
              </Grid>
            </Grid>
          )}
          {!loading && (
            <>
              <TimeCard item={statistics} />

              <GraphCard timesheets={statistics} month={month} year={year} />
            </>
          )}
          {loading && (
            <Box
              display={"flex"}
              flexDirection={"row"}
              width={"100%"}
              justifyContent={"center"}
              marginTop={"20vh"}
            >
              <CircularProgress />
            </Box>
          )}

          <Dialog
            open={open}
            month={month}
            year={year}
            handleMonthChange={(event) => setMonth(event.target.value)}
            handleYearChange={(event) => setYear(event.target.value)}
            handleClose={handleClose}
            handleSelect={getStats}
          />
        </>
      </Box>
    </Container>
  );
};

export default Statistics;
