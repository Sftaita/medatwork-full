import { memo } from "react";
import Box from "@mui/material/Box";

const Container = ({ children, ...rest }) => (
  <Box
    maxWidth={{ sm: 720, md: 1236 }}
    width="100%"
    margin={"0 auto"}
    paddingY={{ xs: 4, sm: 4, md: 0 }}
    {...rest}
  >
    {children}
  </Box>
);

export default memo(Container);
