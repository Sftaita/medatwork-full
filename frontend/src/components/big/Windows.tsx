import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

const Window = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      maxWidth={"100%"}
      paddingLeft={theme.spacing(2)}
      paddingRight={theme.spacing(2)}
      paddingTop={{ xs: theme.spacing(3), md: theme.spacing(2) }}
    >
      {children}
    </Box>
  );
};

export default Window;
