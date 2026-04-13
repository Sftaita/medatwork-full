import React from "react";
import ContentLoader from "react-content-loader";

// Material UI
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/system";

const TableLoader = (props) => {
  const theme = useTheme();

  return (
    <ContentLoader
      speed={2}
      width={"1500"}
      height={165}
      viewBox="0 0 1500 165"
      backgroundColor={alpha("#a439b6", 0.1)}
      foregroundColor="#ecebeb"
      {...props}
    >
      <rect x="0" y="0" rx="4" ry="4" width={theme.spacing(23)} height={theme.spacing(6)} />
      <rect x="0" y="55" rx="4" ry="4" width={theme.spacing(23)} height={theme.spacing(6)} />
      <rect x="0" y="111" rx="4" ry="4" width={theme.spacing(23)} height={theme.spacing(6)} />

      <rect
        x={theme.spacing(24)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(24)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(24)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />

      <rect
        x={theme.spacing(48)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(48)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(48)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />

      <rect
        x={theme.spacing(72)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(72)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(72)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />

      <rect
        x={theme.spacing(96)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(96)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(96)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />

      <rect
        x={theme.spacing(120)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(120)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(120)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />

      <rect
        x={theme.spacing(144)}
        y="0"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(144)}
        y="55"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
      <rect
        x={theme.spacing(144)}
        y="111"
        rx="4"
        ry="4"
        width={theme.spacing(23)}
        height={theme.spacing(6)}
      />
    </ContentLoader>
  );
};

export default TableLoader;
