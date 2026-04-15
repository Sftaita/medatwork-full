import { useState } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";

// Local components
import Form from "./Form";

// General components
import Container from "../../components/medium/Container";

const Loginpage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { authentication } = useAuth();
  const [loading, setLoading] = useState(false);

  if (authentication.isAuthenticated) {
    let destination = "/maccs/timer";
    if (authentication.role === "manager") destination = "/manager/realtime";
    if (authentication.role === "super_admin") destination = "/admin";
    if (authentication.role === "hospital_admin") destination = "/hospital-admin/dashboard";
    return <Navigate to={destination} replace />;
  }

  const status = (element) => {
    setLoading(element);
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight={{ xs: "calc(100vh - 58px)", sm: "calc(100vh - 66px)", md: "calc(100vh - 71px)" }}
      px={2}
      py={{ xs: 4, md: 0 }}
    >
      {!loading && (
        <Container>
          <Grid container spacing={6} alignItems="center">
            {isMd ? (
              <Grid item container justifyContent={"center"} md={6}>
                <Box width={1} maxWidth={500}>
                  <Box
                    component={"img"}
                    src={
                      "https://assets.maccarianagency.com/svg/illustrations/drawkit-illustration2.svg"
                    }
                    width={1}
                    sx={{
                      filter: theme.palette.mode === "dark" ? "brightness(0.8)" : "none",
                    }}
                  />
                </Box>
              </Grid>
            ) : null}
            <Grid item container alignItems={"center"} justifyContent={"center"} xs={12} md={6}>
              <Form status={status} />
            </Grid>
          </Grid>
        </Container>
      )}
      {loading && <CircularProgress />}
    </Box>
  );
};

export default Loginpage;
