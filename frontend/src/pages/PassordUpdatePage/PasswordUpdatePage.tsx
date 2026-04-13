import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import Search from "../../images/Search";
import Form from "./Components/Form";

const PasswordUpdatePage = ({ _match }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { token = "noToken" } = useParams();
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    if (token.length !== 64) {
      setValidToken(false);
    }
  }, [token]);

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
              <Form token={token} validToken={validToken} />
            </Grid>
            {isMd ? (
              <Grid item container justifyContent={"center"} xs={12} md={6}>
                <Box height={1} width={1} maxWidth={600}>
                  <Search width={"100%"} height={"100%"} />
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};
export default PasswordUpdatePage;
