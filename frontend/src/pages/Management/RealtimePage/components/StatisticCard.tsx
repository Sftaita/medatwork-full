import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import CountUp from "react-countup";

// ** MUI Imports
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import { styled, useTheme } from "@mui/material/styles";
import MoreTimeIcon from "@mui/icons-material/MoreTime";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import RunningWithErrorsIcon from "@mui/icons-material/RunningWithErrors";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import { Avatar, CircularProgress, IconButton, Popover, Tooltip as MuiTooltip } from "@mui/material";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import useMediaQuery from "@mui/material/useMediaQuery";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// General component
import ScrollDialog from "../../../../components/medium/ScrollDialog";
import ExcelLogo from "../../../../images/icons/ExcelLogo";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

export const title = "Informations";
export const text = [
  <>
    <strong>Nombre d'heures prévues :</strong> Représente le nombre d'heures prévues pour le mois
    entier (du premier au dernier jour du mois), calculé à partir des horaires prévisionnels. Si
    vous n'avez pas établi d'horaire prévisionnel, cette valeur sera de 0.
  </>,
  <>
    <strong>Heures totales :</strong> Décompte des heures effectuées (du premier au dernier jour du
    mois) à l'hôpital pour le mois sélectionné. Elle inclut les heures classiques, les gardes sur
    place, les retours de garde appelables et les absences justifiées, comptabilisées comme 9h36 par
    jour d'absence. Les heures totales englobent les heures normales, inconfortables et très
    inconfortables. Notez l'apparition d'un pourcentage à droite du total d'heures, indiquant la
    progression des heures réalisées par rapport aux heures prévues. Le pourcentage devient rouge et
    dépasse 100% lorsque le nombre d'heures effectuées est supérieur au nombre d'heures prévu.
  </>,
  <>
    <strong>Heures inconfortables :</strong> Heures de pénibilité majorées de 25% du salaire horaire
    (pour les samedis et les heures comprises entre 20h et 8h).
  </>,
  <>
    <strong>Heures très inconfortables :</strong> Heures de pénibilité majorées de 50% du salaire
    horaire (pour les dimanches et jours fériés).
  </>,
  <>
    <strong>Nombre de gardes appelables :</strong> Correspond au nombre de périodes de garde
    appelable. Une période légale s'étend de 8h à 20h et de 20h à 8h.
  </>,
  <>
    <strong>Garde sur place :</strong> Heures effectuées pendant une garde sur place.
  </>,
  <>
    <strong>Horaire prévisionnel :</strong> Comparaison entre les heures prévues et les heures
    effectivement réalisées. Si aucun horaire prévisionnel n'a été établi, la colonne des heures
    prévisionnelles restera vide.
  </>,
];

// Styled Grid component
const StyledGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  [theme.breakpoints.up("sm")]: {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const getIcon = (iconName) => {
  switch (iconName) {
    case "AccessTimeIcon":
      return <AccessTimeIcon />;
    case "MoreTimeIcon":
      return <MoreTimeIcon />;
    case "PhoneForwardedIcon":
      return <PhoneForwardedIcon />;
    case "RunningWithErrorsIcon":
      return <RunningWithErrorsIcon />;
    case "LocalHospitalIcon":
      return <LocalHospitalIcon />;
    case "BeachAccessIcon":
      return <BeachAccessIcon />;
    default:
      return <MoreTimeIcon />;
  }
};

const convertHours = (value) => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return { hours, minutes };
};

const StatisticCard = ({ item }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  const [excelLoading, setExcelLoading] = useState(false);

  const handleExcel = async () => {
    setExcelLoading(true);
    try {
      const response = await axiosPrivate({
        url: `managers/ExcelGenerator/${item.yearId}/${item.residentId}`,
        method: "GET",
        responseType: "blob",
        headers: { Accept: "application/vnd.ms-excel" },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Horaire-${item.lastname}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error);
    } finally {
      setExcelLoading(false);
    }
  };

  const transformData = (item) => {
    const data = Object.keys(item.week).map((key) => ({
      name: `Sem ${key}`,
      "Heures prestées": item.week[key], // <-- changer le nom de la clé ici
      "Heures prévisionnelles": item.scheduledWeek[key] || 0, // <-- changer le nom de la clé ici
    }));

    return data;
  };

  const data = transformData(item);

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

  const formatHourTooltip = (value) => {
    const hour = Math.floor(value);
    const minute = Math.round((value - hour) * 60)
      .toString()
      .padStart(2, "0");
    return `${hour}:${minute}`;
  };

  // Dialog controller
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  // Popover controller
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClickPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);
  const id = openPopover ? "simple-popover" : undefined;
  return (
    <Card>
      <Grid container>
        <StyledGrid item xs={12} sm={7}>
          <CardHeader
            title={item?.firstname + " " + item?.lastname}
            subheader={
              <Typography variant="body2">
                Nombre d'heures prévues pour le mois:{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {convertHours(item?.scheduledMonth).hours}h
                  {convertHours(item?.scheduledMonth).minutes !== 0 &&
                    convertHours(item?.scheduledMonth).minutes}
                </Box>{" "}
              </Typography>
            }
            subheaderTypographyProps={{
              sx: { lineHeight: "1.25rem", fontSize: "0.875rem !important" },
            }}
            titleTypographyProps={{
              sx: {
                fontSize: "1.5rem !important",
                lineHeight: "2rem !important",
                letterSpacing: "0.43px !important",
              },
            }}
            action={
              <Box display="flex" alignItems="center">
                <MuiTooltip title="Télécharger l'horaire Excel" arrow>
                  <span>
                    <IconButton onClick={handleExcel} disabled={excelLoading} size="small">
                      {excelLoading ? <CircularProgress size={25} /> : <ExcelLogo />}
                    </IconButton>
                  </span>
                </MuiTooltip>
                <IconButton onClick={() => setOpen(true)}>
                  <QuestionMarkIcon color="primary" />
                </IconButton>
              </Box>
            }
          />
          <CardContent
            sx={{
              pt: { xs: 1, md: 4 },
              pb: { xs: 2, md: 5.5 },
            }}
          >
            <Grid container direction="row" justifyContent="flex-start" alignItems="flex-start">
              <Grid item xs={12} sm={6}>
                <Box name="total hours" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.success.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("AccessTimeIcon")}{" "}
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Box
                      sx={{
                        mt: 1.5,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, mr: 1 }}>
                        <CountUp start={0} end={convertHours(item.totalHours).hours} duration={2} />
                        h
                        {convertHours(item.totalHours).minutes !== 0 && (
                          <CountUp
                            start={0}
                            end={convertHours(item.totalHours).minutes}
                            duration={2}
                          />
                        )}
                      </Typography>
                      {item.scheduledMonth > 0 && (
                        <Typography
                          component="sup"
                          variant="caption"
                          sx={{
                            color:
                              (item.totalHours / item.scheduledMonth) * 100 > 100
                                ? theme.palette.error.main
                                : theme.palette.success.main,
                          }}
                        >
                          {`${Math.round((item.totalHours / item.scheduledMonth) * 100)}%`}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="body2">Heures totales</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box name="Hard hours" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.warning.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("MoreTimeIcon")}{" "}
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography sx={{ fontWeight: 600, mr: 1 }}>
                      <CountUp start={0} end={convertHours(item.hardHours).hours} duration={2} />h
                      {convertHours(item.hardHours).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item.hardHours).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2">Heures inconfortables</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box name="Very hard hours" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.error.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("RunningWithErrorsIcon")}{" "}
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography sx={{ fontWeight: 600, mr: 1 }}>
                      <CountUp
                        start={0}
                        end={convertHours(item.veryHardHours).hours}
                        duration={2}
                      />
                      h
                      {convertHours(item.veryHardHours).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item.veryHardHours).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>

                    <Typography variant="body2"> Heures très inconfortables</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box name="Very hard hours" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.purple.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("PhoneForwardedIcon")}{" "}
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      <CountUp start={0} end={item.callableGardeNb} duration={2} />
                    </Typography>
                    <Typography variant="body2">Nombre de gardes appelables</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box name="Very hard hours" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.info.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("LocalHospitalIcon")}{" "}
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography sx={{ fontWeight: 600, mr: 1 }}>
                      <CountUp
                        start={0}
                        end={convertHours(item.hospitalGardeNb).hours}
                        duration={2}
                      />
                      h
                      {convertHours(item.hospitalGardeNb).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item.hospitalGardeNb).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2"> Gardes sur place</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box name="Leaves" sx={{ mb: 4, display: "flex", alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      mr: 3,
                      boxShadow: 3,
                      bgcolor: theme.palette.secondary.main,
                      width: 44,
                      height: 44,
                      "& svg": { fontSize: "1.75rem" },
                    }}
                  >
                    {getIcon("BeachAccessIcon")}{" "}
                  </Avatar>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        mt: 1.5,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, mr: 1 }}>
                        <CountUp start={0} end={item?.monthNbOfAbsences} duration={2} />
                      </Typography>
                      {item?.absences?.yearScheduledAbsences.totalScheduledLeaves > 0 && (
                        <Typography
                          component="sup"
                          variant="caption"
                          sx={{
                            color: (theme) =>
                              item?.absences?.YearTotalAbsenceDay >
                              item?.absences?.yearScheduledAbsences?.totalScheduledLeaves
                                ? theme.palette.error.main
                                : theme.palette.success.main,
                          }}
                        >
                          {item?.absences?.YearTotalAbsenceDay +
                            "/" +
                            item?.absences?.yearScheduledAbsences?.totalScheduledLeaves}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="body2">Jours de congé</Typography>
                  </Box>
                  <IconButton onClick={handleClickPopover}>
                    <KeyboardArrowDownIcon fontSize="large" color="primary" />
                  </IconButton>
                  <Popover
                    id={id}
                    open={openPopover}
                    anchorEl={anchorEl}
                    onClose={handleClosePopover}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                  >
                    <Typography sx={{ p: 1 }}>
                      Congé annuel: {item?.absences?.yearLegalLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.legalLeaves}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      Congé scientifique: {item?.absences?.yearScientificLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.scientificLeaves}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      Congé paternité: {item?.absences?.yearPaternityLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.paternityLeave}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      Congé maternité: {item?.absences?.yearMaternityLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.maternityLeave}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      Congé non rémunéré: {item?.absences?.yearUnpaidLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.unpaidLeave}
                    </Typography>
                  </Popover>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </StyledGrid>

        <Grid item xs={12} sm={5} paddingRight={2}>
          <CardContent
            sx={{
              width: "100%",
              height: "100%",
            }}
          >
            <Typography variant="h6">Horaire prévisionnel</Typography>
            <ResponsiveContainer height={400}>
              <BarChart
                data={data}
                margin={{
                  top: 20,
                  right: 20,
                  left: isMd ? 0 : -32,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={(name) => {
                    if (!isMd) {
                      return name.replace("Sem", "");
                    }
                    return name;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, Math.max(40, findMaxValue(data) + 5)]}
                  tickFormatter={(value) => {
                    return isMd ? `${value}h` : value;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={formatHourTooltip} />
                <Legend />
                <Bar
                  dataKey="Heures prestées"
                  stackId="a"
                  fill={theme.palette.success.main}
                  fillOpacity={1}
                  radius={[10, 10, 10, 10]} // Ajouter un rayon pour arrondir les hauts des barres
                  barSize={10} // Diminuer la largeur des barres
                />
                <Bar
                  dataKey="Heures prévisionnelles"
                  stackId="b"
                  fill={theme.palette.primary.main}
                  fillOpacity={0.3}
                  radius={[10, 10, 10, 10]} // Ajouter un rayon pour arrondir les hauts des barres
                  barSize={10} // Diminuer la largeur des barres
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Grid>
      </Grid>
      <ScrollDialog handleClose={handleClose} open={open} title={title} text={text} />
    </Card>
  );
};

export default StatisticCard;
