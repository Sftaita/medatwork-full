import { useState } from "react";
import "aos/dist/aos.css";

import yearsApi from "../../../../services/yearsApi";
import { useNavigate } from "react-router";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { toast } from "react-toastify";

// Material UI
import Box from "@mui/material/Box";
import { Typography, Card, Grid, CircularProgress } from "@mui/material";
import Button from "@mui/material/Button";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DateRangeIcon from "@mui/icons-material/DateRange";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useTheme } from "@mui/material/styles";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const YearDisplay = ({ year }) => {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { method, url } = yearsApi.addYear();
      await axiosPrivate[method](url, { token: year.token });
      toast.success("Inscription validé!", {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
      navigate("/maccs/years");
    } catch (error) {
      handleApiError(error);
      toast.error(error.response.data.message, {
        position: "bottom-center",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight={300} height={"auto"} position={"relative"} data-aos="zoom-in">
      <Box>
        <Box>
          <Box sx={{ marginBottom: theme.spacing(2) }}>
            <Typography variant="h3" color="primary" gutterBottom>
              Année de formation trouvée
            </Typography>
            <Typography variant="h6" component="p" color="text.primary">
              Vérifiez l'année, le lieu de stage et le maître de stage.
            </Typography>
          </Box>
          <Box padding={{ xs: 3, sm: 6 }} component={Card} boxShadow={3}>
            <Box
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={{ xs: "flex-start", sm: "center" }}
              flexDirection={{ xs: "column", sm: "row" }}
            >
              <Box>
                <Typography fontWeight={700} variant={"h6"} gutterBottom>
                  {year.title}
                </Typography>

                <Grid
                  container
                  direction="row"
                  justifyContent="flex-start"
                  alignItems="center"
                  sx={{ marginBottom: theme.spacing(2) }}
                >
                  <LocationOnIcon color={"primary"} sx={{ marginRight: theme.spacing(2) }} />
                  <Typography>{year.location}</Typography>
                </Grid>

                <Grid
                  container
                  direction="row"
                  justifyContent="flex-start"
                  alignItems="center"
                  sx={{ marginBottom: theme.spacing(2) }}
                >
                  <DateRangeIcon color={"primary"} sx={{ marginRight: theme.spacing(2) }} />
                  <Typography>
                    {dayjs(year.dateOfStart).format("DD/MM/YYYY")}
                    {" - "}
                    {dayjs(year.dateOfEnd).format("DD/MM/YYYY")}
                  </Typography>
                </Grid>

                <Grid
                  container
                  direction="row"
                  justifyContent="flex-start"
                  alignItems="center"
                  sx={{ marginBottom: theme.spacing(2) }}
                >
                  <AccountCircleIcon color={"primary"} sx={{ marginRight: theme.spacing(2) }} />
                  {year?.lastname ? (
                    <Typography>
                      {"Dr "} {year.firstname} {year.lastname}
                    </Typography>
                  ) : (
                    <Typography>{"Le maître de stage n'a pas encore été défini"}</Typography>
                  )}
                </Grid>
              </Box>
              <Box display="flex" marginTop={{ xs: 2, md: 0 }} onClick={() => handleClick}>
                {!loading && (
                  <Button
                    variant="contained"
                    size="large"
                    color={"primary"}
                    onClick={handleClick}
                    disabled={loading ? true : false}
                  >
                    S'enregistrer
                  </Button>
                )}
                {loading && (
                  <div sx={{ marginRight: theme.spacing(9) }}>
                    <CircularProgress />
                  </div>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default YearDisplay;
