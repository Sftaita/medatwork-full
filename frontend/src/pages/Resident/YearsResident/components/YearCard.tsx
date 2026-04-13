import React, { useState } from "react";

import { CopyToClipboard } from "react-copy-to-clipboard";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

// material UI
import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import Chip from "@mui/material/Chip";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

// General component
import Container from "../../../../components/medium/Container";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const YearCard = ({ years, handleLoading }) => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [, setPending] = useState(false);

  // Excel API Call
  const excel = async (id) => {
    handleLoading(true);
    try {
      await axiosPrivate({
        url: "timesheets/ExcelGenerator/" + id,
        method: "GET",
        responseType: "blob",
        withCredentials: false,
        headers: {
          Accept: "application/vnd.ms-excel",
        },
      }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Horaire.xlsx");
        document.body.appendChild(link);
        link.click();
      });
    } catch (error) {
      handleApiError(error);
      setPending(false);
      //handleClose();
    } finally {
      handleLoading(false);
    }
  };

  return (
    <>
      {years.length !== 0 &&
        years.map((year) => (
          <Box marginBottom={theme.spacing(8)} key={year.id}>
            <Container key={year.id}>
              <Card sx={{ boxShadow: 4, borderRadius: 3 }}>
                <CardContent sx={{ padding: { sm: 4 } }}>
                  <Grid container spacing={4}>
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      sx={{
                        minHeight: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box marginBottom={4}>
                        <Typography fontWeight={600} variant={"h6"} gutterBottom>
                          {year.title}
                        </Typography>
                        {year?.firstname && (
                          <Typography>
                            Dr {year.lastname} {year.firstname}
                          </Typography>
                        )}

                        <Typography>
                          Période: {dayjs(year.dateOfStart).format("DD/MM/YYYY")} -
                          {" " + dayjs(year.dateOfEnd).format("DD/MM/YYYY")}
                        </Typography>
                      </Box>
                      <Box>
                        {year?.residentAllowed && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            fullWidth={isMd ? false : true}
                            onClick={() => excel(year.id)}
                          >
                            Générer un carnet
                          </Button>
                        )}
                        {!year?.residentAllowed && (
                          <Chip
                            label="En attente d'acceptation"
                            color="primary"
                            variant="outlined"
                            icon={<HourglassEmptyIcon />}
                            size={"large"}
                          />
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        width={1}
                        height={1}
                        borderLeft={{
                          xs: 0,
                          sm: `1px solid ${theme.palette.divider}`,
                        }}
                        paddingLeft={{ xs: 0, sm: 4 }}
                        paddingTop={{ xs: 4, sm: 0 }}
                        borderTop={{
                          xs: `1px solid ${theme.palette.divider}`,
                          sm: 0,
                        }}
                      >
                        <Box marginBottom={4}>
                          <Grid
                            container
                            direction="row"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                          >
                            <Typography fontWeight={500} variant={"h6"} gutterBottom>
                              {year.token}
                            </Typography>
                            <CopyToClipboard text={year.token}>
                              <Button>Copier</Button>
                            </CopyToClipboard>
                          </Grid>

                          <Typography>
                            Envoyez ce code d'identification à vos collègues afin qu'ils puissent{" "}
                            <br />
                            rejoindre cette année de formation.
                          </Typography>
                        </Box>
                        <Button size={"large"} variant={"contained"} disabled={true}>
                          INFO
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Container>
          </Box>
        ))}
    </>
  );
};

export default YearCard;
