import { Box } from "@mui/material";

import CircularProgress from "@mui/material/CircularProgress";

const Validation = () => {
  return (
    <Box minHeight={1} display="flex" height={"50vh"} alignItems="center" justifyContent={"center"}>
      <CircularProgress />
    </Box>
  );
};

export default Validation;
