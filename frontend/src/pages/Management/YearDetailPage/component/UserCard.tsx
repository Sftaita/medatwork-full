import React from "react";
import { jobList } from "../../../../doc/lists";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

// General Components
import Man from "../../../../images/icons/Man.png";
import Women from "../../../../images/icons/Woman.png";

const UserCard = ({ selectedManager }) => {
  const theme = useTheme();
  return (
    <Box bgcolor={"alternate.main"}>
      <Grid container spacing={4}>
        <Card
          sx={{
            p: { xs: 2, md: 4 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 1,
            height: 1,
            background: "transparent",
            backgroundImage: `linear-gradient(0deg, ${theme.palette.background.paper} 75%, ${theme.palette.primary.main} 0%)`,
          }}
        >
          <Avatar
            src={selectedManager?.sexe === "male" ? Man : Women}
            variant={"circular"}
            sx={{
              width: 120,
              height: 120,
            }}
          />
          <Box display={"flex"} justifyContent={"center"} alignItems={"center"} marginTop={2}>
            <Typography fontWeight={700}>
              {selectedManager?.lastname} {selectedManager?.firstname}
            </Typography>

            <Box
              component={"svg"}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              width={22}
              height={22}
              color={"primary.main"}
              marginLeft={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </Box>
          </Box>
          <Typography color={"text.secondary"}>
            {selectedManager?.job && jobList[selectedManager?.job]}
          </Typography>
          <Box flexGrow={1} />

          <Button component={"a"} variant={"outlined"} color={"primary"} fullWidth disabled>
            Voir le profil
          </Button>
        </Card>
      </Grid>
    </Box>
  );
};

export default UserCard;
