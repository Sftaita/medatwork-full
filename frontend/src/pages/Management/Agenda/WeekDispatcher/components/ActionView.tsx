import React, { useState, useMemo } from "react";
import useWeekShedulerContext from "../../../../../hooks/useWeekShedulerContext";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import calendarApi from "../../../../../services/calendarApi";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
// General component
import CustomSelect from "../../../../../components/medium/CustomSelect";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";

// Material UI
import { MenuItem, Alert } from "@mui/material";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import LoadingButton from "@mui/lab/LoadingButton";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { handleApiError } from "@/services/apiError";

const ActionView = ({ isLoading, _setIsLoading }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("xl"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  useWeekShedulerContext();
  const [isPending, setIsPending] = useState(false);

  const {
    years,
    currentYearId,
    setCurrentYearId,
    setInterval,
    setResidents,
    setYearWeekTemplates,
    pendingChange,
    setPendingChange,
  } = useWeekDispatcherContext();

  const handleYearChange = (event) => {
    const yearId = event.target.value;

    // Recherche de l'année sélectionnée dans le tableau "years"
    const selectedYear = years?.find((year) => year.yearId === yearId);
    if (selectedYear) {
      // Met à jour les résidents et les intervalles pour l'année sélectionnée
      setResidents(selectedYear?.residents);
      setInterval(selectedYear?.weekIntervals);
      setYearWeekTemplates(selectedYear?.yearWeekTemplates);
    }
    setCurrentYearId(yearId);
  };

  const yearItems = useMemo(() => {
    return years.map((year) => (
      <MenuItem key={year?.yearId} value={year?.yearId}>
        {year?.yearInfo?.title}
      </MenuItem>
    ));
  }, [years]);

  const handleSubmit = async () => {
    setIsPending(true);
    try {
      const { method, url } = calendarApi.dispacthWeek(currentYearId);
      await axiosPrivate[method](url, pendingChange);
      setPendingChange([]);
      toast.success("Mise à jour réussie.", toastSuccess);
    } catch (error) {
      handleApiError(error);
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, toastError);
      } else {
        toast.error("Oups! Une erreur s'est produite.", toastError);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Grid container direction="column" paddingTop={2} spacing={2}>
        <Grid item md={12} sx={{ textAlign: "center" }}>
          <Typography variant="h6" color="primary">
            Répartition des semaines
          </Typography>
          {(years.length > 0 || isLoading) && (
            <>
              <Grid item xs={12} sx={{ textAlign: "left" }} padding={2}>
                <CustomSelect
                  label="Année"
                  name="year"
                  value={currentYearId}
                  onChange={handleYearChange}
                  item={yearItems}
                  loading={isLoading}
                />
              </Grid>
              <Grid item xs={12} sx={{ textAlign: "left" }} padding={2}>
                <LoadingButton
                  variant="contained"
                  fullWidth
                  disabled={pendingChange.length === 0 ? true : false}
                  onClick={handleSubmit}
                  loading={isPending}
                >
                  Enregistrer
                </LoadingButton>
              </Grid>
            </>
          )}

          {years.length === 0 && !isLoading && (
            <Grid item xs={12} sx={{ textAlign: "left" }} padding={2}>
              <Alert severity="info">
                Vous n'avez actuellement aucune année en cours. Seules les années en cours ou à
                venir sont susceptibles d'être planifées.{" "}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Grid>
      <Divider orientation={isMd ? "vertical" : "horizontal"} />
    </>
  );
};

export default ActionView;
