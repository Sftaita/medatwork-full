import React from "react";
import { useNavigate } from "react-router";

// Material UI
import { useTheme } from "@mui/material/styles";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import useMediaQuery from "@mui/material/useMediaQuery";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

const ErrorPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box
      position={"relative"}
      minHeight={"calc(100vh - 247px)"}
      display={"flex"}
      alignItems={"center"}
      justifyContent={"center"}
      height={1}
      marginTop={isMd && -12}
      paddingTop={12}
    >
      <Box
        maxWidth={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={theme.spacing(2)}
      >
        <Grid container>
          <Grid item container alignItems={"center"} justifyContent={"center"} xs={12} md={6}>
            <Box>
              <Typography
                variant="h1"
                component={"h1"}
                align={isMd ? "left" : "center"}
                sx={{ fontWeight: 700 }}
              >
                404
              </Typography>
              <Typography
                variant="h6"
                component="p"
                color="text.secondary"
                align={isMd ? "left" : "center"}
              >
                Oops! On dirait que vous avez suivi un mauvais lien.
                <br />
                Si vous pensez qu'il s'agit d'un problème technique de notre part, vous pouvez nous
                le{" "}
                <a
                  href="mailto:info@medatwork.be"
                  style={{
                    color: theme.palette.primary.main,
                    textDecoration: "none",
                  }}
                >
                  signaler.
                </a>
              </Typography>
              <Box
                marginTop={4}
                display={"flex"}
                justifyContent={{ xs: "center", md: "flex-start" }}
              >
                <Button
                  component={Link}
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/")}
                >
                  Retour
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item container justifyContent={"center"} xs={12} md={6}>
            <Box height={1} width={1} maxWidth={500}>
              <Box
                component={"img"}
                src={
                  "https://assets.maccarianagency.com/svg/illustrations/drawkit-illustration6.svg"
                }
                width={1}
                height={1}
                sx={{
                  filter: theme.palette.mode === "dark" ? "brightness(0.8)" : "none",
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ErrorPage;
