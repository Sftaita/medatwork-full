import React from "react";
import Box from "@mui/material/Box";

const Container = ({ children, ...rest }) => (
  <Box
    maxWidth={{ sm: 720, md: 1236 }}
    width={1}
    margin={"0 auto"}
    paddingX={2}
    paddingY={{ xs: 4, sm: 6, md: 8 }}
    {...rest}
  >
    {children}
  </Box>
);

export default Container;
