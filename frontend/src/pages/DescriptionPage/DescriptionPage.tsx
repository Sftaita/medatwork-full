import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Container from "./components/Container";
import Hero from "./components/Hero";
import About from "./components/About";
import Description from "./components/Description";
import Advertising from "./components/Advertising";

const DescriptionPage = () => {
  const theme = useTheme();

  return (
    <Box sd={{ maxWidth: "100%" }}>
      <Box
        position={"relative"}
        sx={{
          marginTop: -13,
          paddingTop: 13,
          backgroundColor: theme.palette.alternate.main,
          backgroundImage: `linear-gradient(120deg, ${theme.palette.background.paper} 0%, ${theme.palette.alternate.main} 100%)`,
        }}
      >
        <Container>
          <Hero />
        </Container>
        <Box
          component={"svg"}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          viewBox="0 0 1920 100.1"
          sx={{
            width: "100%",
            marginBottom: theme.spacing(-1),
          }}
        >
          <path
            fill={theme.palette.background.default}
            d="M0,0c0,0,934.4,93.4,1920,0v100.1H0L0,0z"
          ></path>
        </Box>
      </Box>

      <Container>
        <Box
          sx={{
            position: "relative",
            "&::after": {
              position: "absolute",
              content: '""',
              width: "60%",
              zIndex: 1,
              top: 0,
              left: 0,
              height: "70%",
              backgroundSize: "18px 18px",
              backgroundImage: `radial-gradient(${alpha(
                theme.palette.primary.dark,
                0.4
              )} 20%, transparent 20%)`,
              opacity: 0.2,
            },
          }}
        >
          <Box position={"relative"} zIndex={2} width={1}>
            <About />
          </Box>
        </Box>
      </Container>

      <Box bgcolor={"alternate.main"}>
        <Container>
          <Description />
        </Container>
      </Box>

      {/**<Container>
        <Features />
        </Container>
      <Box position={"relative"} bgcolor={"alternate.main"}>
        <Container>
          <Pricings />
        </Container>
        <Box
          component={"svg"}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          viewBox="0 0 1920 100.1"
          sx={{
            width: "100%",
            marginBottom: theme.spacing(-1),
          }}
        >
          <path
            fill={theme.palette.background.default}
            d="M0,0c0,0,934.4,93.4,1920,0v100.1H0L0,0z"
          ></path>
        </Box>
      </Box>
      **/}

      <Divider />
      <Container>
        <Advertising />
      </Container>
    </Box>
  );
};

export default DescriptionPage;
