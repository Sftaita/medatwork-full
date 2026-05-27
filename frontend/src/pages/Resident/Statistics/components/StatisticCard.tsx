import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Avatar, IconButton, Popover } from "@mui/material";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import useMediaQuery from "@mui/material/useMediaQuery";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// General component
import ScrollDialog from "../../../../components/medium/ScrollDialog";


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
const convertHours = (value: number | null | undefined) => {
  if (value == null || !isFinite(value)) return { hours: 0, minutes: 0 };
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return { hours, minutes };
};

const StatisticCard = ({ item }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const title = t("stats.infoTitle");
  const text = [
    <><strong>{t("stats.infoScheduledTitle")} :</strong> {t("stats.infoScheduledDesc")}</>,
    <><strong>{t("stats.infoTotalTitle")} :</strong> {t("stats.infoTotalDesc")}</>,
    <><strong>{t("stats.infoHardTitle")} :</strong> {t("stats.infoHardDesc")}</>,
    <><strong>{t("stats.infoVeryHardTitle")} :</strong> {t("stats.infoVeryHardDesc")}</>,
    <><strong>{t("stats.infoCallableTitle")} :</strong> {t("stats.infoCallableDesc")}</>,
    <><strong>{t("stats.infoHospitalTitle")} :</strong> {t("stats.infoHospitalDesc")}</>,
    <><strong>{t("stats.infoScheduledChartTitle")} :</strong> {t("stats.infoScheduledChartDesc")}</>,
  ];

  const transformData = (item) => {
    if (!item || !item.week || typeof item.week !== "object") return [];
    return Object.keys(item.week).map((key) => ({
      name: `${t("stats.weekShort")} ${key}`,
      worked: item.week[key],
      scheduled: item.scheduledWeek?.[key] ?? 0,
    }));
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
                {t("stats.scheduledHoursMonth")}{" "}
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
              <IconButton onClick={() => setOpen(true)}>
                <QuestionMarkIcon color="primary" />
              </IconButton>
            }
          />
          <CardContent
            sx={{
              pt: (theme) => `${theme.spacing(4)} !important`,
              pb: (theme) => `${theme.spacing(5.5)} !important`,
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
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, mr: 1 }}>
                        <CountUp
                          start={0}
                          end={convertHours(item?.totalHours).hours}
                          duration={2}
                        />
                        h
                        {convertHours(item?.totalHours).minutes !== 0 && (
                          <CountUp
                            start={0}
                            end={convertHours(item?.totalHours).minutes}
                            duration={2}
                          />
                        )}
                      </Typography>
                      {item?.scheduledMonth > 0 && (
                        <Typography
                          component="sup"
                          variant="caption"
                          sx={{
                            color:
                              (item?.totalHours / item?.scheduledMonth) * 100 > 100
                                ? theme.palette.error.main
                                : theme.palette.success.main,
                          }}
                        >
                          {`${Math.round((item?.totalHours / item?.scheduledMonth) * 100)}%`}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex" }}>
                      {" "}
                      <Typography variant="body2">{t("stats.totalHours")}</Typography>
                    </Box>
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
                      <CountUp start={0} end={convertHours(item?.hardHours).hours} duration={2} />h
                      {convertHours(item?.hardHours).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item?.hardHours).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2">{t("stats.hardHours")}</Typography>
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
                        end={convertHours(item?.veryHardHours).hours}
                        duration={2}
                      />
                      h
                      {convertHours(item?.veryHardHours).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item?.veryHardHours).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>

                    <Typography variant="body2">{t("stats.veryHardHours")}</Typography>
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
                      <CountUp start={0} end={item?.callableGardeNb ?? 0} duration={2} />
                    </Typography>
                    <Typography variant="body2">{t("stats.callableGuards")}</Typography>
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
                        end={convertHours(item?.hospitalGardeNb).hours}
                        duration={2}
                      />
                      h
                      {convertHours(item?.hospitalGardeNb).minutes !== 0 && (
                        <CountUp
                          start={0}
                          end={convertHours(item?.hospitalGardeNb).minutes}
                          duration={2}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2">{t("stats.hospitalGuards")}</Typography>
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
                        <CountUp start={0} end={item?.monthNbOfAbsences ?? 0} duration={2} />
                      </Typography>
                      {(item?.absences?.yearScheduledAbsences?.totalScheduledLeaves ?? 0) > 0 && (
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

                    <Typography variant="body2">{t("stats.leaveDays")}</Typography>
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
                      {t("stats.annualLeave")} {item?.absences?.yearLegalLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.legalLeaves}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      {t("stats.scientificLeave")} {item?.absences?.yearScientificLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.scientificLeaves}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      {t("stats.paternityLeave")} {item?.absences?.yearPaternityLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.paternityLeave}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      {t("stats.maternityLeave")} {item?.absences?.yearMaternityLeaves} /
                      {" " + item?.absences?.yearScheduledAbsences?.maternityLeave}
                    </Typography>
                    <Typography sx={{ p: 1 }}>
                      {t("stats.unpaidLeave")} {item?.absences?.yearUnpaidLeaves} /
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
            <Typography variant="h6">{t("stats.scheduledChart")}</Typography>
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
                  dataKey="worked"
                  name={t("stats.workedHours")}
                  stackId="a"
                  fill={theme.palette.success.main}
                  fillOpacity={1}
                  radius={[10, 10, 10, 10]}
                  barSize={10}
                />
                <Bar
                  dataKey="scheduled"
                  name={t("stats.scheduledHoursBar")}
                  stackId="b"
                  fill={theme.palette.primary.main}
                  fillOpacity={0.3}
                  radius={[10, 10, 10, 10]}
                  barSize={10}
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
