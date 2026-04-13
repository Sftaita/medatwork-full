// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local components
import Form from "./components/Form";
import Container from "../../../components/medium/Container";

const ManagerSignupPage = () => {
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
    >
      <Box
        maxWidth={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={theme.spacing(2)}
      >
        <Container>
          <Grid container spacing={6}>
            <Grid item container alignItems={"center"} justifyContent={"center"} xs={12} md={6}>
              <Form />
            </Grid>
            {isMd ? (
              <Grid item container justifyContent={"center"} xs={12} md={6}>
                <Box height={1} width={1} maxWidth={500}>
                  <Box
                    component={"img"}
                    src={
                      "https://assets.maccarianagency.com/svg/illustrations/drawkit-illustration4.svg"
                    }
                    width={1}
                    height={1}
                  />
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default ManagerSignupPage;
