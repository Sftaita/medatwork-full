import React from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DensitySmallIcon from "@mui/icons-material/DensitySmall";
import DensityMediumIcon from "@mui/icons-material/DensityMedium";
import DensityLargeIcon from "@mui/icons-material/DensityLarge";
import { C } from "../styles/tableStyles";
import type { Density } from "../hooks/useTableDensity";

const ICON: Record<Density, React.ReactElement> = {
  compact:     <DensitySmallIcon fontSize="small" />,
  normal:      <DensityMediumIcon fontSize="small" />,
  comfortable: <DensityLargeIcon fontSize="small" />,
};

interface DensityToggleButtonProps {
  density: Density;
  onCycle: () => void;
}

export function DensityToggleButton({ density, onCycle }: DensityToggleButtonProps) {
  const { t } = useTranslation();
  const LABEL: Record<Density, string> = {
    compact:     t("density.compact"),
    normal:      t("density.normal"),
    comfortable: t("density.comfortable"),
  };
  return (
  <Tooltip title={LABEL[density]} arrow>
    <IconButton
      size="small"
      onClick={onCycle}
      sx={{
        color: C.ink3,
        border: `1px solid ${C.line2}`,
        borderRadius: "8px",
        width: 38,
        height: 38,
        "&:hover": { bgcolor: C.surface2, color: C.ink },
      }}
    >
      {ICON[density]}
    </IconButton>
  </Tooltip>
  );
}
