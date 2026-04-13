import React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";

import Form from "./components/Form";

const PasswordReset = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  return (
    <Box>
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
                      "https://assets.maccarianagency.com/svg/illustrations/drawkit-illustration3.svg"
                    }
                    width={1}
                    height={1}
                    sx={{
                      filter: theme.palette.mode === "dark" ? "brightness(0.8)" : "none",
                    }}
                  />
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default PasswordReset;
