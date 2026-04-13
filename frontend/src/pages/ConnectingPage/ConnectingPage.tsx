import { useEffect } from "react";
import Main from "./components/Main";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const ConnectingPage = () => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  });

  return (
    <Box
      maxWidth={"100%"}
      paddingLeft={theme.spacing(2)}
      paddingRight={theme.spacing(2)}
      paddingTop={isMd ? theme.spacing(2) : theme.spacing(6)}
    >
      <Main />
    </Box>
  );
};

export default ConnectingPage;
