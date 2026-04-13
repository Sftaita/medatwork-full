import { useState } from "react";

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
      <Section title="Période de stage" subtitle="Définissent la périodes d'encodages">
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
              primary="Date de début de stage"
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
              primary="Date de fin de stage"
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
            <ListItemText primary="Période de stage" secondary={yearInfomrations?.period} />
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
