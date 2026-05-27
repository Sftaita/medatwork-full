import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import weekTemplatesApi from "../../../../../services/weekTemplatesApi";
import { toast } from "react-toastify";

// Material UI
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import {
  CircularProgress,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Alert,
  Typography,
} from "@mui/material";
import useWeekDispatcherContext from "../../../../../hooks/useWeekDispatcherContext";
import { handleApiError } from "@/services/apiError";

interface WeekTemplateItem {
  id: number;
  title: string;
  weekTemplateId?: number;
}

const WeekTemplateImport = ({ open, handleClose }: { open: boolean; handleClose: () => void }) => {
  const { t } = useTranslation();
  const axiosPrivate = useAxiosPrivate();
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [haveNoWeekTemplates, setHaveNoWeekTemplates] = useState(false);
  const { setYears, years, currentYearId, yearWeekTemplates, setYearWeekTemplates } =
    useWeekDispatcherContext();

  // Load available templates only when the dialog opens.
  // yearWeekTemplates is intentionally not in deps — we snapshot it at open time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;

    const getManagerWeekTemplates = async () => {
      setIsLoading(true);
      setSelectedItems([]);
      try {
        const { method, url } = weekTemplatesApi.getWeekTemplatesList();
        const request = await axiosPrivate[method](url);

        if (request?.data?.length === 0) {
          setHaveNoWeekTemplates(true);
        }

        const existingTemplateIds = yearWeekTemplates.map((t) => (t as any).weekTemplateId);
        const filtered = request?.data.filter(
          (template: WeekTemplateItem) => !existingTemplateIds.includes(template.id)
        );
        setWeekTemplates(filtered ?? []);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };

    getManagerWeekTemplates();
  }, [open, axiosPrivate]); // yearWeekTemplates excluded intentionally — snapshot at open

  const handleSubmmit = async () => {
    setIsLoading(true);

    const data = {
      yearId: currentYearId,
      weekTemplateIds: selectedItems,
    };

    try {
      const { method, url } = weekTemplatesApi.linkWeekTemplateToYear();
      const response = await axiosPrivate[method](url, data);

      setYearWeekTemplates((prev) => [...prev, ...response.data]);

      // Remove imported templates from local list without re-fetching
      setWeekTemplates((prev) => prev.filter((t) => !selectedItems.includes(t.id)));
      setSelectedItems([]);

      updateYearWeekTemplates(response.data);

      toast.success(t("weekDisp.import.success"), {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
    } catch (error) {
      handleApiError(error);
      toast.error(t("weekDisp.import.error"), {
        position: "bottom-center",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
    handleClose();
  };

  const updateYearWeekTemplates = (newTemplates: unknown[]) => {
    const yearIndex = years.findIndex((year) => (year as any).yearId === currentYearId);
    if (yearIndex === -1) return;

    const newYearsState = [...years];
    newYearsState[yearIndex] = {
      ...newYearsState[yearIndex],
      yearWeekTemplates: [
        ...((newYearsState[yearIndex] as any).yearWeekTemplates ?? []),
        ...newTemplates,
      ],
    } as any;
    setYears(newYearsState);
  };

  const handleCheckboxChange = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <Dialog fullWidth={true} maxWidth={"md"} open={open} onClose={handleClose} scroll={"paper"}>
      <DialogTitle>{t("weekDisp.import.dialogTitle")}</DialogTitle>
      <DialogContent sx={{ paddingLeft: 0, paddingRight: 0 }} dividers>
        {!isLoading && (
          <>
            {weekTemplates.length !== 0 && (
              <List sx={{ width: "100%", marginLeft: 0 }}>
                {weekTemplates.map((item) => (
                  <ListItem sx={{ paddingLeft: 0, paddingRight: 0 }} key={item.id}>
                    <ListItemButton onClick={() => handleCheckboxChange(item.id)}>
                      <ListItemIcon>
                        <Checkbox checked={selectedItems.includes(item.id)} />
                      </ListItemIcon>
                      <ListItemText primary={item.title} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            {weekTemplates.length === 0 && (
              <Box padding={2} minHeight={"20vh"}>
                <Alert severity="info">
                  {haveNoWeekTemplates ? (
                    <Typography>{t("weekDisp.import.noTemplates")}</Typography>
                  ) : (
                    <Typography>{t("weekDisp.import.allImported")}</Typography>
                  )}
                </Alert>
              </Box>
            )}
          </>
        )}
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSubmmit} disabled={isLoading || selectedItems.length === 0}>
          {t("weekDisp.import.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WeekTemplateImport;
