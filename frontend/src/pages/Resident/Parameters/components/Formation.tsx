// material UI
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Section from "./Section";
import { specialityAbreviation } from "../../../../doc/lists";

import { useEffect, useState } from "react";

// local component
import SlideInDialog from "./SenderDialog";
import dayjs from "@/lib/dayjs";

const calculateYearOfFormation = (dateString) => {
  const today = new Date();
  const dateOfMaster = new Date(dateString);
  let age = today.getFullYear() - dateOfMaster.getFullYear();
  const m = today.getMonth() - dateOfMaster.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfMaster.getDate())) {
    age--;
  }
  return age + 1;
};

const years = {
  1: "1ère année",
  2: "2ème année",
  3: "3ème année",
  4: "4ème année",
  5: "5ème année",
  6: "6ème année",
  7: "7ème année",
  8: "8ème année",
};

const Formation = ({ info, fetchUserInfo }) => {
  const [year, setYear] = useState();

  useEffect(() => {
    setYear(years[calculateYearOfFormation(info?.dateOfMaster)]);
  }, [info]);

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
        title="Formation"
        subtitle="Concernent l'université à laquelle vous êtes rattaché et votre année de formation."
      >
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton edge="end" aria-label="update">
              <ArrowForwardIosIcon />
            </IconButton>
          }
        >
          <ListItemButton onClick={() => onClick("university")}>
            <ListItemText primary="Université" secondary={info?.university} />
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
          <ListItemButton onClick={() => onClick("speciality")}>
            <ListItemText
              primary="Formation"
              secondary={info.speciality && specialityAbreviation[info?.speciality]}
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
          <ListItemButton>
            <ListItemText primary="Année de formation" secondary={year} />
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
          <ListItemButton onClick={() => onClick("dateOfMaster")}>
            <ListItemText
              primary="Date de début de formation"
              secondary={info.dateOfMaster && dayjs(info?.dateOfMaster).format("DD/MM/YYYY")}
            />
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
export default Formation;
