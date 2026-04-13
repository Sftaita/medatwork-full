import { useEffect } from "react";
import { useTheme } from "@mui/material/styles";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

// Local components
import Container from "./components/Container";
import Content from "./components/Content";
import Contact from "./components/Contact";

const TermsPage = () => {
  const theme = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  });

  return (
    <Box
      position={"relative"}
      minHeight={"calc(100vh - 247px)"}
      display={"flex"}
      alignItems={"center"}
      justifyContent={"center"}
    >
      <Container>
        <Box boxShadow={4} borderRadius={2}>
          <Box bgcolor={theme.palette.primary.main} borderRadius={2}>
            <Container paddingX={{ xs: 2, sm: 4 }}>
              <Typography
                variant={"h4"}
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: theme.palette.common.white,
                }}
              >
                Conditions d'utilisations & politique de confidentialité
              </Typography>
              <Typography
                gutterBottom
                sx={{
                  color: theme.palette.common.white,
                }}
              >
                Mise à jour le <strong>23 aout, 2022</strong>
              </Typography>
            </Container>
            <Box
              component={"svg"}
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              viewBox="0 0 1920 100.1"
              width={1}
              marginBottom={-1}
            >
              <path
                fill={theme.palette.background.paper}
                d="M0,0c0,0,934.4,93.4,1920,0v100.1H0L0,0z"
              ></path>
            </Box>
          </Box>
          <Container
            paddingTop={"0 !important"}
            paddingX={{ xs: 0, sm: 4 }}
            width={0.9}
            position={"relative"}
            top={0}
          >
            <Box
              component={Grid}
              container
              spacing={4}
              flexDirection={{ xs: "column-reverse", md: "row" }}
            >
              <Grid item xs={12} md={9}>
                <Content />
              </Grid>
              <Grid item xs={12} md={3}>
                <Box position={"sticky"} top={theme.spacing(10)} className={"sticky"}>
                  <Contact />
                </Box>
              </Grid>
            </Box>
          </Container>
        </Box>
      </Container>
    </Box>
  );
};

export default TermsPage;
