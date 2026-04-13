import React, { memo } from "react";
import { styled } from "@mui/system";

const ScrollbarStyles = styled("div")({
  width: "100%",
  height: "100%",
  overflow: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(155, 155, 155, 0.5) transparent",
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    borderRadius: "10px",
    backgroundColor: "#fff",
  },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: "10px",
    backgroundColor: "#3f51b5",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "#555",
  },
});

const CustomHorizontalScrollBar = ({ children }) => {
  return <ScrollbarStyles>{children}</ScrollbarStyles>;
};

export default memo(CustomHorizontalScrollBar);
