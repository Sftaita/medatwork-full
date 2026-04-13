import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/system";
import ListItemButton from "@mui/material/ListItemButton";
import { Typography } from "@mui/material";
import { Paper } from "@mui/material";
import { jobList } from "../../../../doc/lists";

const SearchList = ({ list, handleNext, selectedManager, setSelectedManager }) => {
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const handleListItemClick = (id, lastname, firstname, job, sexe) => {
    setSelectedManager({ id, lastname, firstname, job, sexe });
    setSearch(lastname + " " + firstname);
    handleNext();
  };

  const handleWrite = (e) => {
    setSearch(e);
    setSelectedManager({});
  };

  const filteredSearch = list?.filter(
    (l) =>
      l.lastname.toLowerCase().includes(search.toLowerCase()) ||
      l.firstname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box marginTop={theme.spacing(2)} sx={{ marginLeft: 0 }}>
      <Typography variant={"h6"}>Rechercher un nouveau collaborateur</Typography>
      <TextField
        id="standard-basic"
        label="Qui recherchez vous?"
        variant="standard"
        fullWidth
        value={search}
        onChange={(e) => handleWrite(e.target.value)}
      />
      <Paper
        elevation={0}
        style={{
          height: "50vh",
          overflow: "auto",
          marginTop: theme.spacing(2),
        }}
      >
        <List
          sx={{
            width: 1,
            bgcolor: "background.paper",
          }}
        >
          {filteredSearch?.map((manager, i) => (
            <>
              <ListItemButton
                key={i}
                selected={manager.id === selectedManager.id}
                onClick={() =>
                  handleListItemClick(
                    manager.id,
                    manager.lastname,
                    manager.firstname,
                    manager.job,
                    manager.sexe
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar alt={"Remy Sharp"} src="/static/images/avatar/1.jpg" />
                </ListItemAvatar>
                <ListItemText
                  primary={manager.lastname + " " + manager.firstname}
                  secondary={jobList[manager.job]}
                />
              </ListItemButton>
              <Divider variant="inset" component="li" />
            </>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default SearchList;
