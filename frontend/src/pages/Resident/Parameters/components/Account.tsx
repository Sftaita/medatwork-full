// material UI
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Section from "./Section";

const Account = ({ info }) => {
  return (
    <Section title="Mon compte">
      <ListItem
        disablePadding
        secondaryAction={
          <IconButton edge="end" aria-label="update">
            <ArrowForwardIosIcon />
          </IconButton>
        }
      >
        <ListItemButton component="a" href="#simple-list">
          <ListItemText primary="Adresse email" secondary={info?.email} />
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
        <ListItemButton component="a" href="#simple-list">
          <ListItemText primary="Mot de passe" secondary="********" />
        </ListItemButton>
      </ListItem>
    </Section>
  );
};
export default Account;
