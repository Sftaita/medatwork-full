import React, { useCallback, useEffect } from "react";

// Material UI
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";

// General components
import YearCard from "./component/YearCard";
import { Typography } from "@mui/material";
import useManagerYears from "../../../hooks/data/useManagerYears";

const ManagerYears = () => {
  const theme = useTheme();
  const { years, setYears, loading, setLoading } = useManagerYears();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLoading = useCallback(
    (state) => {
      setLoading(state);
    },
    [setLoading]
  );

  return (
    <Container>
      <Box
        maxWidth={"100%"}
        paddingLeft={theme.spacing(2)}
        paddingRight={theme.spacing(2)}
        paddingTop={{ xs: theme.spacing(3), md: theme.spacing(2) }}
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
        {!loading && <YearCard years={years} handleLoading={handleLoading} setYears={setYears} />}
      </Box>
    </Container>
  );
};

export default ManagerYears;
