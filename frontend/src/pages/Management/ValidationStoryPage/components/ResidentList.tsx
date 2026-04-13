import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";

// Local component
import Woman from "../../../../images/icons/Woman.png";
import Man from "../../../../images/icons/Man.png";

export default function FolderList({ residents }) {
  return (
    <List sx={{ width: "100%", maxWidth: 360 }}>
      {residents?.map((item, key) => (
        <ListItem key={key}>
          <ListItemAvatar>
            <Avatar src={item.gender === "male" ? Man : Woman} />
          </ListItemAvatar>
          <ListItemText
            primary={item.lastname + " " + item.firstname}
            secondary={
              <>
                <Typography component="span" variant="subtitle2">
                  Année:
                </Typography>
                {" " + item.yearTitle}
                <br />
                {item.errors
                  ? "Manquant(s): " +
                    item.errors
                      .map((message, index) =>
                        index === item.errors.length - 1 ? `${message}.` : `${message},`
                      )
                      .join(" ")
                  : null}
              </>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
