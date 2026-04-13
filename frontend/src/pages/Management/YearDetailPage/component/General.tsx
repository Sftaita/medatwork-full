import React, { useState, useEffect } from "react";
import periodsApi from "../../../../services/periodsApi";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { monthList } from "../../../../doc/lists";

// Material UI

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

// Local components
import Steper from "./Steper";
import CircularProgress from "@mui/material/CircularProgress";
import SummaryLoader from "./SummaryLoader";
import ResidentValidation from "./ValidationView/ResidentValidation";
import { handleApiError } from "@/services/apiError";

const General = ({ yearId, _adminRights }) => {
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [periodReport, setPeriodReport] = useState([]);
  const fetchPeriods = async () => {
    setLoading(true);

    try {
      const { method, url } = periodsApi.fetchPeriod();
      const request = await axiosPrivate[method](url + yearId);
      const transformed = transformer(request.data);

      setPeriods(transformed);
      if (transformed[0]?.id !== undefined) {
        getPeriodSummary(transformed[0].id);
      }
    } catch (error) {
      handleApiError(error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodSummary = async (periodId) => {
    if (periodId === undefined || periodId === null) return;
    setPeriodLoading(true);

    try {
      const { method, url } = periodsApi.getPeriodReport();
      const request = await axiosPrivate[method](url + periodId);
      setPeriodReport(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setPeriodLoading(false);
    }
  };

  const transformer = (periods) => {
    periods?.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);

      return dateB - dateA;
    });

    const months = periods.map((item) => ({
      id: item.id,
      label: monthList[item.month] + " " + item.year,
    }));

    return months;
  };

  useEffect(() => {
    if (yearId) {
      fetchPeriods();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]); // intentional: fetchPeriods is defined in component scope and doesn't need to be in deps

  return (
    <Grid container spacing={4}>
      {loading ? (
        <Grid container>
          <Box
            minHeight={1}
            width={1}
            display="flex"
            height={"20vh"}
            alignItems="center"
            justifyContent={"center"}
          >
            <CircularProgress />
          </Box>
        </Grid>
      ) : periods.length === 0 ? (
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
            <Typography color="text.secondary">Aucune période de validation disponible.</Typography>
          </Box>
        </Grid>
      ) : (
        <>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: { xs: 3, md: 3 } }}>
              <Box
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                flex="1 1 100%"
                justifyContent={{ sm: "space-between" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                marginBottom={4}
              >
                <Steper
                  periods={periods}
                  setPeriods={(x) => setPeriods(x)}
                  reload={() => fetchPeriods()}
                  getPeriodSummary={(periodId) => getPeriodSummary(periodId)}
                />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={9}>
            {periodLoading ? (
              <Card sx={{ paddingLeft: 2, paddingRight: 2 }}>
                <SummaryLoader />
              </Card>
            ) : (
              <ResidentValidation periodReport={periodReport} />
            )}
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default General;
