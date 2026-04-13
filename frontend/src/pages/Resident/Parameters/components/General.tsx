import { useState } from "react";

// material UI
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Section from "./Section";

// local component
import SlideInDialog from "./SenderDialog";
import dayjs from "@/lib/dayjs";

const genderTranslator = {
  male: "Homme",
  female: "Femme",
};

const General = ({ info, fetchUserInfo }) => {
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
        title="Informations générales"
        subtitle="Certaines de ces informations peuvent être vues par les autres
              utilisateurs de l'application."
      >
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("lastname")}>
            <ListItemText primary="Nom" secondary={info?.lastname} />
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
          <ListItemButton onClick={() => onClick("firstname")}>
            <ListItemText primary="Prénom" secondary={info?.firstname} />
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
          <ListItemButton onClick={() => onClick("dateOfBirth")}>
            <ListItemText
              primary="Date de naissance"
              secondary={info?.dateOfBirth && dayjs(info?.dateOfBirth).format("DD/MM/YYYY")}
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
          <ListItemButton onClick={() => onClick("sexe")}>
            <ListItemText primary="Genre" secondary={info?.sexe && genderTranslator[info?.sexe]} />
          </ListItemButton>
        </ListItem>
      </Section>

      <SlideInDialog
        handleClickOpen={handleClickOpen}
        handleClose={handleClose}
        open={open}
        target={target}
        yearId={info?.id}
        fetchUserInfo={fetchUserInfo}
        userInfomrations={info}
      />
    </>
  );
};
export default General;
