import { useState } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import gardesApi from "../../../../services/gardesApi";
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

const GardeValidationButton = ({ selected, _setSelectedRows, gardes, setGardes }) => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [isPending, setIsPending] = useState(false);

  const handleUpdate = async (status) => {
    setIsPending(true);

    const originalGardes = [...gardes];

    setGardes((currentGardes) => {
      return currentGardes.map((garde) => {
        if (selected.includes(garde.gardeId)) {
          return { ...garde, isEditable: status === "invalidate" };
        }
        return garde;
      });
    });

    try {
      const { method, url } = gardesApi.updateGardeValidationStatus();
      const request = await axiosPrivate[method](url, {
        status: status,
        gardeIds: selected,
      });
      toast.success("Modification(s) enregistrée(s)", toastSuccess);
      return request?.data;
    } catch (error) {
      handleApiError(error);
      setGardes(originalGardes);
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
          tooltipTitle={"Valider les horaires"}
          onClick={() => handleUpdate("validate")}
          disabled={isPending}
        />
        <SpeedDialAction
          key={2}
          icon={<ClearIcon />}
          sx={{ color: theme.palette.primary.main }}
          tooltipTitle={"Invalider les horaires"}
          onClick={() => handleUpdate("invalidate")}
          disabled={isPending}
        />
      </SpeedDial>
    </Box>
  );
};

export default GardeValidationButton;
