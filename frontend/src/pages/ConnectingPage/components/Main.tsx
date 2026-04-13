import { Link } from "react-router-dom";

// material ui components
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

const mock = [
  {
    avatar: "https://assets.maccarianagency.com/avatars/img5.jpg",
    name: "MACCS",
    title: "Je suis candidat(e) spécialiste",
    to: "/residentSignup",
  },
  {
    avatar: "https://assets.maccarianagency.com/avatars/img4.jpg",
    name: "Manager",
    title: "Je suis maître de stage ou personnel RH",
    to: "/managerSignup",
  },
];

const Main = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box bgcolor={"alternate.main"}>
      <Box display={"flex"} justifyContent={"center"} alignItems={"center"}>
        <Grid
          container
          spacing={isMd ? 10 : 4}
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          {mock.map((item, i) => (
            <Grid key={i} item xs={12} sm={4}>
              <Card
                sx={{
                  p: { xs: 2, md: 4 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "transparent",
                  backgroundImage: `linear-gradient(0deg, ${theme.palette.background.paper} 75%, ${theme.palette.primary.main} 0%)`,
                }}
              >
                <Avatar
                  src={item.avatar}
                  variant={"square"}
                  sx={{
                    width: isMd ? 240 : 150,
                    height: isMd ? 240 : 150,
                  }}
                />
                <Box display={"flex"} justifyContent={"center"} alignItems={"center"} marginTop={2}>
                  <Typography fontWeight={700}>{item.name}</Typography>
                </Box>
                <Typography color={"text.secondary"}>{item.title}</Typography>
                <Box flexGrow={1} />
                <Stack spacing={2} marginTop={4} width={"100%"} alignItems={"center"}>
                  <Grid item xs={12} sm={6}>
                    <Link to={item.to} style={{ textDecoration: "none" }}>
                      <Button
                        variant={"outlined"}
                        color={"primary"}
                        fullWidth
                        sx={{ textDecoration: "none" }}
                      >
                        S'enregistrer
                      </Button>
                    </Link>
                  </Grid>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Main;
