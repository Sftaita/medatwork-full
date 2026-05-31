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
import { specialityAbreviation } from "../../../../doc/lists";
import SlideInDialog from "./SenderDialog";

const GeneralInformation = ({ yearInfomrations, fetchYearInformation }) => {
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
      <Section
        title={t("yearParams.generalTitle")}
        subtitle={t("yearParams.generalSubtitle")}
      >
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("speciality")}>
            <ListItemText
              primary={t("yearParams.speciality")}
              secondary={specialityAbreviation[yearInfomrations?.speciality]}
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
          <ListItemButton onClick={() => onClick("location")}>
            <ListItemText primary={t("yearParams.location")} secondary={yearInfomrations?.location} />
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
          <ListItemButton onClick={() => onClick("title")}>
            <ListItemText primary={t("yearParams.titleFull")} secondary={yearInfomrations?.title} />
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
          <ListItemButton onClick={() => onClick("trainingSupervisor")}>
            <ListItemText
              primary={t("yearParams.master")}
              secondary={
                yearInfomrations?.trainingSupervisorId != null
                  ? t("yearParams.dr") +
                    yearInfomrations?.trainingSupervisorLastname +
                    " " +
                    yearInfomrations?.trainingSupervisorFirstname
                  : t("yearParams.masterNotSet")
              }
            />
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
export default GeneralInformation;
