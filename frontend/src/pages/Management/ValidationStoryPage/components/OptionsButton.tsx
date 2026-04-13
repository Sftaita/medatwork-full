import { useState } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import staffPlannerApi from "../../../../services/staffPlannerApi";

// Material UI

import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";
import ShareIcon from "@mui/icons-material/Share";
import LoadingDialog from "./LoadingDialog";
import { handleApiError } from "@/services/apiError";

const actions = [
  {
    icon: <FileDownloadIcon />,
    name: "Exporter vers StaffPlanner",
    disabled: false,
  },
  { icon: <SaveIcon />, name: "Enregistrer", disabled: true },
  { icon: <PrintIcon />, name: "Imprimer", disabled: true },
  { icon: <ShareIcon />, name: "Partager", disabled: true },
];

const OptionsButton = ({ selected, _setLoading }) => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const [residents, setResidents] = useState([]);
  const [step, setStep] = useState(1);

  // Export to staff planner
  const exportToStaffPlanner = async () => {
    try {
      await axiosPrivate({
        url: "managers/SPImport",
        method: "POST",
        data: { periodsId: selected },
        responseType: "blob",
        withCredentials: false,
        headers: {
          Accept: "application/vnd.ms-text",
          "Content-Type": "application/json",
        },
      }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Validation" + ".txt");
        document.body.appendChild(link);
        link.click();
      });
    } catch (error) {
      handleApiError(error);
    }
  };

  const checkForResidentResources = async () => {
    try {
      const { method, url } = staffPlannerApi.checkResidentResource();
      const request = await axiosPrivate[method](url, {
        periodValidationArray: selected,
      });
      return request?.data;
    } catch (error) {
      handleApiError(error);
    }
  };

  const update = (list) => {
    setResidents(list);
  };

  // Loading Dialog
  const [open, setOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleClick = async () => {
    update([]);
    setDialogLoading(true);
    setStep(1);
    setOpen(true);
    const list = await checkForResidentResources();
    update(list);

    if (list?.length === 0) {
      setStep(2);
      await exportToStaffPlanner();
      setDialogLoading(false);
      setOpen(false);
    }

    if (list?.length !== 0) {
      setStep(3);
      setDialogLoading(false);
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
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            sx={{ color: theme.palette.primary.main }}
            tooltipTitle={action.name}
            disabled={action.disabled}
            onClick={() => handleClick()}
          />
        ))}
      </SpeedDial>
      <LoadingDialog
        open={open}
        setOpen={setOpen}
        handleClose={handleClose}
        step={step}
        residents={residents}
        dialogLoading={dialogLoading}
      />
    </Box>
  );
};

export default OptionsButton;
