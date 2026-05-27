import { useState } from "react";
import { useTranslation } from "react-i18next";

// material UI
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Section from "./Section";

// Local component
import SlideInDialog from "./SenderDialog";
import dayjs from "@/lib/dayjs";

const DateSection = ({ yearInfomrations, fetchYearInformation }) => {
  const { t } = useTranslation();
  const [target, setTarget] = useState();

  const onClick = (target) => {
    setTarget(target);
    handleClickOpen();
  };

  // Slide in Dialog
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Section title={t("yearParams.dateSectionTitle")} subtitle={t("yearParams.dateSectionSubtitle")}>
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("dateOfStart")}>
            <ListItemText
              primary={t("yearParams.dateStart")}
              secondary={dayjs(yearInfomrations?.dateOfStart).format("DD/MM/YYYY")}
            />
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("dateOfEnd")}>
            <ListItemText
              primary={t("yearParams.dateEnd")}
              secondary={dayjs(yearInfomrations?.dateOfEnd).format("DD/MM/YYYY")}
            />
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("period")}>
            <ListItemText primary={t("yearParams.period")} secondary={yearInfomrations?.period} />
          </ListItemButton>
        </ListItem>
      </Section>

      <SlideInDialog
        handleClickOpen={handleClickOpen}
        handleClose={handleClose}
        open={open}
        target={target}
        yearId={yearInfomrations?.id}
        fetchYearInformation={fetchYearInformation}
        yearInfomrations={yearInfomrations}
      />
    </>
  );
};
export default DateSection;
