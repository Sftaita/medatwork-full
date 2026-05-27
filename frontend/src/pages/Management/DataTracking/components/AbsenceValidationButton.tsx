import { useState } from "react";
import { useTranslation } from "react-i18next";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import absencesApi from "../../../../services/absencesApi";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";

// Material UI

import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import { handleApiError } from "@/services/apiError";

const AbsenceValidationButton = ({ selected, absences, setAbsences }) => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [isPending, setIsPending] = useState(false);

  const handleUpdate = async (status) => {
    setIsPending(true);

    const originalAbsneces = [...absences];

    setAbsences((currentAbsences) => {
      return currentAbsences.map((absence) => {
        if (selected.includes(absence.absenceId)) {
          return { ...absence, isEditable: status === "invalidate" };
        }
        return absence;
      });
    });

    try {
      const { method, url } = absencesApi.updateAbsenceValidationStatus();
      const request = await axiosPrivate[method](url, {
        status: status,
        absenceIds: selected,
      });
      toast.success(t("data.saveSuccess"), toastSuccess);
      return request?.data;
    } catch (error) {
      handleApiError(error);
      setAbsences(originalAbsneces);
      toast.error(error?.response?.data?.message, toastError);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Box>
      <SpeedDial
        ariaLabel="SpeedDial"
        hidden={true}
        icon={<SpeedDialIcon />}
        direction={isMd ? "left" : "right"}
        sx={{ "& .MuiFab-primary": { width: 40, height: 40 } }}
        open={selected.length !== 0 ? true : false}
      >
        <SpeedDialAction
          key={1}
          icon={<DoneIcon />}
          sx={{ color: theme.palette.primary.main }}
          tooltipTitle={t("data.validateTooltip")}
          onClick={() => handleUpdate("validate")}
          disabled={isPending}
        />
        <SpeedDialAction
          key={2}
          icon={<ClearIcon />}
          sx={{ color: theme.palette.primary.main }}
          tooltipTitle={t("data.invalidateTooltip")}
          onClick={() => handleUpdate("invalidate")}
          disabled={isPending}
        />
      </SpeedDial>
    </Box>
  );
};

export default AbsenceValidationButton;
