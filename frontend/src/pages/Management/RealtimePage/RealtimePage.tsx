import { useEffect, useState, useMemo } from "react";
import timesheetsApi from "../../../services/timesheetsApi";
import { monthList } from "../../../doc/lists";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";

// Material UI
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FormControl from "@mui/material/FormControl";
import { Alert, Grid, MenuItem, Select, Typography } from "@mui/material";

// Components
import TimeCard from "./components/TimeCard";
import GraphCard from "./components/GraphCard";
import Dialog from "./components/Dialog";
import { handleApiError } from "@/services/apiError";

interface YearOption {
  yearId: number;
  title: string;
}

interface SavedSelection {
  month?: number;
  year?: number;
  currentYear?: number;
}

const STORAGE_KEY = "realtime_selection";

const loadSaved = (): SavedSelection => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const saveSelection = (updates: SavedSelection): void => {
  try {
    const current = loadSaved();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
  } catch {
    // localStorage unavailable — silently ignore
  }
};

const RealTimePage = () => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

  const today = useMemo(() => new Date(), []);
  const saved = useMemo(() => loadSaved(), []);

  const [month, setMonth] = useState<number>(saved.month ?? today.getMonth() + 1);
  const [year, setYear] = useState<number>(saved.year ?? today.getFullYear());

  const [timesheets, setTimesheets] = useState([]);
  const [years, setYears] = useState<YearOption[]>([]);
  const [currentYear, setCurrentYear] = useState<number | undefined>(saved.currentYear);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const getStatisticsByYear = async (yearId: number, forMonth: number) => {
    setLoading(true);
    try {
      const { method, url } = timesheetsApi.getRealtime();
      const request = await axiosPrivate[method](url + forMonth + "/" + yearId);
      setTimesheets(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getMyYears = async () => {
      try {
        const { method, url } = timesheetsApi.getFirstLoadStatistics();
        const request = await axiosPrivate[method](url + month);
        const fetchedYears: YearOption[] = request?.data.years;
        setYears(fetchedYears);

        const savedYearId = saved.currentYear;
        const targetYearId =
          savedYearId && fetchedYears.some((y) => y.yearId === savedYearId)
            ? savedYearId
            : fetchedYears[0]?.yearId;

        setCurrentYear(targetYearId);

        if (targetYearId === fetchedYears[0]?.yearId) {
          // First load already returns stats for years[0] — no extra call needed
          setTimesheets(request?.data?.statistics);
        } else {
          await getStatisticsByYear(targetYearId, month);
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };
    getMyYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axiosPrivate]);

  const handleClose = (_event?: unknown, reason?: string) => {
    if (reason !== "backdropClick") setOpen(false);
  };

  const handleYearsChange = (yearId: number) => {
    setCurrentYear(yearId);
    saveSelection({ currentYear: yearId });
    getStatisticsByYear(yearId, month);
  };

  const handleSelect = (selectedMonth: number, selectedYear: number) => {
    saveSelection({ month: selectedMonth, year: selectedYear, currentYear });
    setMonth(selectedMonth);
    setYear(selectedYear);
    getStatisticsByYear(currentYear!, selectedMonth);
    handleClose();
  };

  return (
    <Container>
      <Box
        maxWidth={"100%"}
        height={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={{ xs: theme.spacing(3), md: theme.spacing(2) }}
      >
        <Box marginBottom={{ xs: 2, md: 4 }}>
          <Typography
            sx={{ textTransform: "uppercase", fontWeight: "medium" }}
            gutterBottom
            color={"secondary"}
            align={"center"}
          >
            Activité par mois
          </Typography>
          <Typography variant="h4" align={"center"} gutterBottom sx={{ fontWeight: 700 }}>
            En temps réel
          </Typography>
        </Box>

        {!loading && (
          <Grid
            container
            direction={isMd ? "row" : "column"}
            justifyContent="flex-start"
            alignItems="center"
            marginBottom={{ xs: 1, md: 2 }}
            gap={{ xs: 1.5, md: 0 }}
            sx={{ width: "100%" }}
          >
            <Grid item sm={12} md={4} sx={{ width: "100%" }}>
              <FormControl size="small" fullWidth>
                <Select
                  labelId="year"
                  name={"year"}
                  value={currentYear}
                  onChange={(e) => handleYearsChange(e.target.value as number)}
                  fullWidth
                >
                  {years.map((item) => (
                    <MenuItem value={item.yearId} key={item.yearId}>
                      {item.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ width: "100%" }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                sx={{ marginLeft: { sm: 2 }, width: "100%" }}
                onClick={() => setOpen(true)}
              >
                <KeyboardArrowDownIcon />
                {monthList[month] + " " + year}
              </Button>
            </Grid>
          </Grid>
        )}

        {loading && (
          <Box
            display={"flex"}
            width={"100%"}
            height={400}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <CircularProgress />
          </Box>
        )}

        {!loading && timesheets?.length > 0 && (
          <>
            <TimeCard timesheets={timesheets} />
            <GraphCard timesheets={timesheets} date={today} month={month} year={year} />
          </>
        )}

        {!loading && timesheets?.length === 0 && (
          <Alert severity="info">
            <Typography>Aucun MACCS n'est enregistré pour cette année</Typography>
          </Alert>
        )}
      </Box>

      <Dialog
        open={open}
        month={month}
        year={year}
        handleClose={handleClose}
        handleSelect={handleSelect}
      />
    </Container>
  );
};

export default RealTimePage;
