import { useState, useEffect } from "react";
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

const WeekTemplateImport = ({ open, handleClose }) => {
  const axiosPrivate = useAxiosPrivate();
  const [weekTemplates, setWeekTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [haveNoWeekTemplates, setHaveNoWeekTemplates] = useState(false);
  const { setYears, years, currentYearId, yearWeekTemplates, setYearWeekTemplates } =
    useWeekDispatcherContext();

  useEffect(() => {
    const getManagerWeekTemplates = async () => {
      setIsLoading(true);
      try {
        const { method, url } = weekTemplatesApi.getWeekTemplatesList();
        const request = await axiosPrivate[method](url);

        if (request?.data?.length === 0) {
          setHaveNoWeekTemplates(true);
        }
        // Firstly, we map the existing yearWeekTemplates to their weekTemplateIds.
        // The weekTemplateId field in the yearWeekTemplates data corresponds to the id field in the request.data
        const existingTemplateIds = yearWeekTemplates.map((template) => template.weekTemplateId);

        // Next, we filter the received templates from request.data.
        // For each template in the request.data, we check if its id is included in the existingTemplateIds array.
        // If the id exists in the array, it means the template is already present in the yearWeekTemplates,
        // so we exclude it from the final list by returning false in the filter function.
        const filteredWeekTemplates = request?.data.filter(
          (template) => !existingTemplateIds.includes(template.id)
        );

        // We then set the weekTemplates state with the filtered list.
        // This state now only includes weekTemplates that are not already included in the current year's templates.
        setWeekTemplates(filteredWeekTemplates);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
        handleClose();
      }
    };
    getManagerWeekTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearWeekTemplates, axiosPrivate]); // intentional: handleClose excluded — it's a prop callback, stable in practice

  const handleSubmmit = async () => {
    setIsLoading(true);

    const data = {
      yearId: currentYearId,
      weekTemplateIds: selectedItems,
    };

    try {
      const { method, url } = weekTemplatesApi.linkWeekTemplateToYear();
      const response = await axiosPrivate[method](url, data);

      // If the request is successful, add the new entities to the yearWeekTemplates state.
      setYearWeekTemplates((prevWeekTemplates) => [
        ...prevWeekTemplates,
        ...response.data, // response.data should contain the new entities
      ]);

      // Update yearWeekTemplates of years
      updateYearWeekTemplates(response.data);

      toast.success("Importation réussie!", {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } catch (error) {
      handleApiError(error);
      toast.error("Oupsune erreur c'est produite", {
        position: "bottom-center",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });

      // If the request fails, do nothing or handle the error accordingly.
    } finally {
      setIsLoading(false);
      setSelectedItems([]); // Set selectedItems to an empty array here
    }
    handleClose();
  };

  const updateYearWeekTemplates = (newTemplates) => {
    const yearIndex = years.findIndex((year) => year.yearId === currentYearId);
    const newYearsState = [...years];
    newYearsState[yearIndex] = {
      ...newYearsState[yearIndex],
      yearWeekTemplates: [...newYearsState[yearIndex].yearWeekTemplates, ...newTemplates],
    };
    setYears(newYearsState);
  };

  // Checkbox controller
  const handleCheckboxChange = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  return (
    <Dialog fullWidth={true} maxWidth={"md"} open={open} onClose={handleClose} scroll={"paper"}>
      <DialogTitle>Importer un poste à cette année</DialogTitle>
      <DialogContent sx={{ paddingLeft: 0, paddingRight: 0 }} dividers>
        {!isLoading && (
          <>
            {weekTemplates?.length !== 0 && (
              <List sx={{ width: "100%", marginLeft: 0 }}>
                {weekTemplates?.map((item) => (
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
            {weekTemplates?.length === 0 && (
              <Box padding={2} minHeight={"20vh"}>
                <Alert severity="info">
                  {haveNoWeekTemplates ? (
                    <Typography>
                      Vous n'avez pas encore créé de modèles de semaine. Une fois que vous aurez
                      créé ces modèles, vous pourrez les associer à l'année correspondante afin d'y
                      assigner vos résidents.
                    </Typography>
                  ) : (
                    <Typography>
                      Tous vos modèles de semaine ont déjà été importés pour cette année. Si aucun
                      ne répond à vos besoins, n'hésitez pas à en créer de nouveaux.
                    </Typography>
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
        <Button onClick={handleClose} disabled={isLoading ? true : false}>
          Annuler
        </Button>
        <Button onClick={handleSubmmit} disabled={isLoading ? true : false}>
          Importer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WeekTemplateImport;
