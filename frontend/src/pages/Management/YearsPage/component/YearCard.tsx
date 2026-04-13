import React, { useState } from "react";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { useNavigate } from "react-router";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";

// material UI
import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import DeleteIcon from "@mui/icons-material/Delete";
import ExcelLogo from "../../../../images/icons/ExcelLogo";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";

import Container from "../../../../components/medium/Container";
import { IconButton, Stack } from "@mui/material";
import ConfirmationDialog from "./ConfirmationDialog";
import { handleApiError } from "@/services/apiError";
import dayjs from "@/lib/dayjs";

const YearCard = ({ years, handleLoading, setYears }) => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const navigate = useNavigate();

  // Excel API Call
  const excel = async (yearId, residentId, residentName) => {
    handleLoading(true);
    try {
      await axiosPrivate({
        url: "managers/ExcelGenerator/" + yearId + "/" + residentId,
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
        link.setAttribute("download", "Horaire-" + residentName + ".xlsx");
        document.body.appendChild(link);
        link.click();
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      handleLoading(false);
    }
  };

  // Delete button
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
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
                    <Grid item xs={12} sm={6}>
                      <Box marginBottom={4}>
                        <Typography fontWeight={600} variant={"h6"} gutterBottom>
                          {year?.title}
                        </Typography>
                        <Typography>
                          Période: {dayjs(year?.dateOfStart).format("DD/MM/YYYY")} -
                          {" " + dayjs(year?.dateOfEnd).format("DD/MM/YYYY")}
                        </Typography>
                        <Typography>
                          Maître de stage:{" "}
                          {year?.masterLastname ? year.masterLastname : "Non défini"}{" "}
                          {year?.masterFirstname && year.masterFirstname}
                        </Typography>
                      </Box>
                      <Grid container spacing={1}>
                        {year.residents &&
                          year.residents.map((item, i) => (
                            <Grid item xs={12} sm={6} key={i}>
                              <Box component={ListItem} disableGutters width={"auto"} padding={0}>
                                <Box
                                  component={ListItemAvatar}
                                  minWidth={"auto !important"}
                                  marginRight={2}
                                >
                                  {item?.allowed ? (
                                    <Box
                                      component={Avatar}
                                      bgcolor={theme.palette.secondary.main}
                                      width={20}
                                      height={20}
                                    >
                                      <svg
                                        width={12}
                                        height={12}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </Box>
                                  ) : (
                                    <PersonAddAltIcon fontSize="small" />
                                  )}
                                </Box>
                                <ListItemText primary={item.firstname + " " + item.lastname} />
                                {item?.allowed && (
                                  <>
                                    {year?.dataDownload && (
                                      <Button
                                        onClick={() =>
                                          excel(year.id, item.residentId, item.lastname)
                                        }
                                      >
                                        <ExcelLogo />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Box>
                            </Grid>
                          ))}
                      </Grid>
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
                            Envoyez ce code d'identification à votre équipe afin qu'elle puisse{" "}
                            <br />
                            rejoindre cette année de formation.
                          </Typography>
                        </Box>
                        <Stack
                          direction="row"
                          justifyContent="flex-start"
                          alignItems="center"
                          spacing={2}
                        >
                          <Button
                            size={"large"}
                            variant={"contained"}
                            onClick={() =>
                              navigate("/manager/year-detail", {
                                state: {
                                  id: year.id,
                                  title: year.title,
                                  adminRights: year.admin,
                                },
                              })
                            }
                          >
                            GERER
                          </Button>
                          {year.admin ? (
                            <Button
                              size={"large"}
                              variant={"outlined"}
                              onClick={() =>
                                navigate("/manager/year-parameters", {
                                  state: {
                                    yearId: year.id,
                                    haveAdminRights: year.admin,
                                  },
                                })
                              }
                            >
                              Modifer
                            </Button>
                          ) : null}

                          <IconButton
                            aria-label="delete"
                            sx={{ color: theme.palette.error.main }}
                            onClick={() => handleClickOpen()}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Container>
            <ConfirmationDialog
              open={open}
              handleClose={handleClose}
              yearId={year.id}
              years={years}
              setYears={setYears}
            />
          </Box>
        ))}
    </>
  );
};

export default YearCard;
