import React from "react";

// Material UI
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";

// General components
import YearCard from "./components/YearCard";
import { Typography } from "@mui/material";
import useResidentYears from "../../../hooks/data/useResidentYears";

const YearsResidentPage = () => {
  const theme = useTheme();
  const { years, loading, setLoading } = useResidentYears();

  const handleLoading = (state) => {
    setLoading(state);
  };

  return (
    <Container>
      <Box
        maxWidth={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={theme.spacing(2)}
      >
        <Typography variant={"h3"} sx={{ marginBottom: theme.spacing(4) }}>
          Mes année(s)
        </Typography>
        <Box maxWidth={"100%"} display={"flex"} justifyContent={"center"}>
          {loading && (
            <Box
              display={"flex"}
              flexDirection={"row"}
              width={"100%"}
              justifyContent={"center"}
              marginTop={"20vh"}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
        {!loading && (
          <YearCard years={years} handleLoading={handleLoading} />
        )}
      </Box>
    </Container>
  );
};

export default YearsResidentPage;
