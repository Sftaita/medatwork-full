import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import managersApi from "../../../../services/managersApi";
import yearsApi from "../../../../services/yearsApi";
import { jobList } from "../../../../doc/lists";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EditIcon from "@mui/icons-material/Edit";
import Stack from "@mui/material/Stack";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import CircularProgress from "@mui/material/CircularProgress";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DownloadIcon from "@mui/icons-material/Download";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Chip from "@mui/material/Chip";

// Local component
import SearchDialog from "./SearchDialog";
import RightsUpdate from "./PartnersView/RightsUpdate";
import { handleApiError } from "@/services/apiError";

//import Container from 'components/Container';

const Partners = ({ id, adminRights }) => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const [list, setList] = useState();
  const [loading, setLoading] = useState();
  const [managerList, setManagerList] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);

  const fetchManagers = useCallback(async () => {
    const { method, url } = managersApi.fetchHospitalManagers(id);
    const request = await axiosPrivate[method](url);
    setList(request?.data);
  }, [axiosPrivate, id]);

  const fetchYearManagers = useCallback(async () => {
    setLoading(true);
    const { method, url } = yearsApi.fetchYearManagers();
    try {
      const request = await axiosPrivate[method](url + id);
      setManagerList(request?.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, id]);

  useEffect(() => {
    if (!id) return;
    fetchYearManagers();
    fetchManagers();
  }, [fetchYearManagers, fetchManagers, id]);

  // Search Dialog
  const [open, setOpen] = useState(false);
  const [, setPending] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Manager selection
  const handleListItemClick = async (_id) => {
    setPending(true);
    //const originalList = [...list];
    const relation = {
      year: 1,
      guest: 22,
      dataValidation: false,
    };
    try {
      const { method, url } = yearsApi.inviteGuest();
      await axiosPrivate[method](url, relation);
    } catch (error) {
      handleApiError(error);
      //setList(originalList);
    } finally {
      setPending(false);
    }
  };

  const updateManagerList = () => {
    fetchYearManagers();
  };

  // Update Rights Dialog Controller
  const [openRightsUpdateDialog, setOpenRightsUpdateDialog] = useState(false);

  const handleRightsUpdate = (managerYearId) => {
    setSelectedManager(managerYearId);
    setOpenRightsUpdateDialog(true);
  };

  return (
    <Box>
      <Box
        display={"flex"}
        flexDirection={{ xs: "column", sm: "row" }}
        flex={"1 1 100%"}
        justifyContent={{ sm: "space-between" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        marginBottom={4}
      >
        <Box marginBottom={{ xs: 2, sm: 0 }}>
          <Typography variant={"h6"} fontWeight={700}>
            Collaborateur(s)
          </Typography>
          <Typography color={"text.secondary"}>
            {adminRights
              ? "Ajouter ou gérer vos collaborateurs"
              : "Vous n'avez pas les droits administrateurs"}
          </Typography>
        </Box>
        {adminRights && (
          <Button
            variant={"contained"}
            size="large"
            onClick={handleClickOpen}
            startIcon={
              <Box
                component={"svg"}
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
                width={20}
                height={20}
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </Box>
            }
          >
            Ajouter
          </Button>
        )}
      </Box>
      {!loading && (
        <Grid container>
          {managerList?.map((item) => (
            <Grid
              item
              xs={12}
              key={item.id}
              sx={{
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                paddingY={1}
              >
                <Box width={1} marginBottom={{ xs: 4, md: 0 }}>
                  <Stack direction="row" alignItems={"center"} spacing={1}>
                    <AccountCircleIcon
                      fontSize="large"
                      sx={{ color: theme.palette.primary.main }}
                    />
                    <Typography variant={"subtitle1"} fontWeight={700}>
                      {item.lastname} {item.firstname}
                    </Typography>
                  </Stack>

                  <Typography color={"text.secondary"}>{jobList[item.job]}</Typography>
                  <Box marginTop={1} display={"flex"} alignItems={"center"}>
                    <Grid container spacing={1} direction={"row"}>
                      {item?.admin && (
                        <Grid item>
                          {" "}
                          <Chip
                            icon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} color="primary" />}
                            label="Administrateur"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      {item?.dataAccess && (
                        <Grid item>
                          <Chip
                            icon={<RemoveRedEyeIcon sx={{ fontSize: 18 }} color="primary" />}
                            label="Consultation"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      {item?.dataValidation && (
                        <Grid item>
                          <Chip
                            icon={<BookmarkAddedIcon sx={{ fontSize: 18 }} color="primary" />}
                            label="Validation"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      {item?.dataDownload && (
                        <Grid item>
                          <Chip
                            icon={<DownloadIcon sx={{ fontSize: 18 }} color="primary" />}
                            label="Téléchargement"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      {item?.hasAgendaAccess && (
                        <Grid item>
                          <Chip
                            icon={<CalendarMonthIcon sx={{ fontSize: 18 }} color="primary" />}
                            label=" Calendrier"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      {item?.canManageAgenda && (
                        <Grid item>
                          {" "}
                          <Chip
                            icon={<CalendarTodayIcon sx={{ fontSize: 18 }} color="primary" />}
                            label="Planification"
                            color="primary"
                            variant="outlined"
                          />
                        </Grid>
                      )}
                    </Grid>
                    <RightsUpdate
                      open={openRightsUpdateDialog}
                      setOpen={setOpenRightsUpdateDialog}
                      managerList={managerList}
                      setManagerList={setManagerList}
                      selectedManager={selectedManager}
                    />
                  </Box>
                </Box>
                {adminRights && (
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color={"warning"}
                      size={"small"}
                      startIcon={<DeleteIcon />}
                      disabled
                    >
                      Supprimer
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      size={"small"}
                      onClick={() => handleRightsUpdate(item.id)}
                    >
                      Droits
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
      {loading && (
        <Grid container>
          <Box
            minHeight={1}
            width={1}
            display="flex"
            height={"20vh"}
            alignItems="center"
            justifyContent={"center"}
          >
            <CircularProgress />
          </Box>
        </Grid>
      )}
      <SearchDialog
        list={list}
        setList={setList}
        updateManagerList={updateManagerList}
        open={open}
        handleClickOpen={handleClickOpen}
        handleClose={handleClose}
        handleListItemClick={handleListItemClick}
        id={id}
      />
    </Box>
  );
};

export default Partners;
