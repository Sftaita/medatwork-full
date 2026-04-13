import React, { useState, useEffect } from "react";
import useAxiosPrivate from "../../../../../hooks/useAxiosPrivate";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../../doc/ToastParams";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import yearsApi from "../../../../../services/yearsApi";
import { ListItem } from "@mui/material";
import { handleApiError } from "@/services/apiError";

const RightsUpdate = ({ open, setOpen, managerList, setManagerList, selectedManager }) => {
  const axiosPrivate = useAxiosPrivate();
  // 1. Cherche dans managerList l'élément qui a le même id que selectedManager
  const manager = managerList.find((manager) => manager.id === selectedManager);

  // 2. Quand tu as trouvé, complète rights
  const [rights, setRights] = useState({
    admin: manager ? manager.admin : false,
    dataAccess: manager ? manager.dataAccess : false,
    dataValidation: manager ? manager.dataValidation : false,
    dataDownload: manager ? manager.dataDownload : false,
    canManageAgenda: manager ? manager.canManageAgenda : false,
    hasAgendaAccess: manager ? manager.hasAgendaAccess : false,
  });

  // Met à jour les droits lorsque selectedManager change
  useEffect(() => {
    setRights({
      admin: manager ? manager.admin : false,
      dataAccess: manager ? manager.dataAccess : false,
      dataValidation: manager ? manager.dataValidation : false,
      dataDownload: manager ? manager.dataDownload : false,
      canManageAgenda: manager ? manager.canManageAgenda : false,
      hasAgendaAccess: manager ? manager.hasAgendaAccess : false,
    });
  }, [selectedManager, manager]);

  const handleCheckboxChange = (event) => {
    const updatedRights = {
      ...rights,
      [event.target.name]: event.target.checked,
    };
    setRights(updatedRights);
  };

  const updateManagerRights = async () => {
    const initialRights = { ...rights }; // Sauvegarder les droits initiaux

    const { method, url } = yearsApi.updateManagerRigths();

    const payload = {
      managerYearId: selectedManager, // ou l'ID approprié ici
      newRights: rights,
    };
    setOpen(false);
    try {
      await axiosPrivate[method](url, payload);
      toast.success("Mise à jour réussie", toastSuccess);

      // Mettre à jour les droits du manager dans managerList
      const updatedManagerList = managerList.map((m) =>
        m.id === selectedManager ? { ...m, ...rights } : m
      );
      setManagerList(updatedManagerList);
      setOpen(false);
    } catch (error) {
      handleApiError(error);
      // Si une erreur se produit, rétablir les droits initiaux
      setRights(initialRights);
      toast.error(error?.response?.data?.message, toastError);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Modifier les droits du manager</DialogTitle>
      <DialogContent dividers>
        <List>
          <ListItem>
            <FormControlLabel
              control={
                <Checkbox checked={rights.admin} onChange={handleCheckboxChange} name="admin" />
              }
              label="Administrateur"
            />
          </ListItem>
          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rights.dataAccess}
                  onChange={handleCheckboxChange}
                  name="dataAccess"
                />
              }
              label="Accès aux données"
            />
          </ListItem>
          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rights.dataValidation}
                  onChange={handleCheckboxChange}
                  name="dataValidation"
                />
              }
              label="Validation des données"
            />
          </ListItem>
          <ListItem>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rights.dataDownload}
                  onChange={handleCheckboxChange}
                  name="dataDownload"
                />
              }
              label="Téléchargement des données"
            />
          </ListItem>
          <ListItem>
            {" "}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rights.canManageAgenda}
                  onChange={handleCheckboxChange}
                  name="canManageAgenda"
                />
              }
              label="Gérer l'agenda"
            />
          </ListItem>
          <ListItem>
            {" "}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rights.hasAgendaAccess}
                  onChange={handleCheckboxChange}
                  name="hasAgendaAccess"
                />
              }
              label="Accès à l'agenda"
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} color="primary">
          Annuler
        </Button>
        <Button onClick={updateManagerRights} color="primary">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RightsUpdate;
