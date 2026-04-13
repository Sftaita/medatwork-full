import { useState } from "react";

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
        title="Renseignements géréraux"
        subtitle="Concernent les informations relatives à l'année."
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
              primary="Spécialité"
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
            <ListItemText primary="Lieu de stage" secondary={yearInfomrations?.location} />
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
            <ListItemText primary="Titre" secondary={yearInfomrations?.title} />
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
          <ListItemButton onClick={() => onClick("master")}>
            <ListItemText
              primary="Maître de stage"
              secondary={
                yearInfomrations?.master !== null
                  ? "Dr " +
                    yearInfomrations?.masterLastname +
                    " " +
                    yearInfomrations?.masterFirstname
                  : "Non renseigné"
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
