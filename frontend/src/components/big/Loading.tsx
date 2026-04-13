import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const loading = () => {
  return (
    <Box
      position={"relative"}
      minHeight={"calc(100vh - 247px)"}
      display={"flex"}
      justifyContent={"center"}
      alignItems="center"
    >
      <Box minHeight={"100%"}>
        <CircularProgress />
      </Box>
    </Box>
  );
};
export default loading;
