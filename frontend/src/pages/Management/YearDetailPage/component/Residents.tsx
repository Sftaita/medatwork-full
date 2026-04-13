import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import residentsApi from "../../../../services/residentsApi";
import { toast } from "react-toastify";

// Material UI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

// Local import
import ResidentTable from "./ResidentsView/ResidentTable";
import { handleApiError } from "@/services/apiError";

const Residents = ({ yearId, adminRights }) => {
  const axiosPrivate = useAxiosPrivate();
  const [ResidentList, setResidentList] = useState([]);
  const [loading, setLoading] = useState();
  const fetchResidentList = useCallback(async () => {
    setLoading(true);
    try {
      const { method, url } = residentsApi.fetchResidents();
      const request = await axiosPrivate[method](url + yearId);
      setResidentList(request?.data?.residents);
    } catch (error) {
      handleApiError(error);
      toast.error(error.response.data.message, {
        position: "bottom-center",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, yearId]);

  useEffect(() => {
    if (!yearId) return;
    fetchResidentList();
  }, [fetchResidentList, yearId]);

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
            MACCS
          </Typography>
          <Typography color={"text.secondary"}>
            {adminRights
              ? "Ajouter, accepter ou désactiver les MACCS"
              : "Vous n'avez pas les droits administrateurs"}
          </Typography>
        </Box>
      </Box>
      {!loading && (
        <>
          {ResidentList?.length !== 0 ? (
            <ResidentTable
              residentList={ResidentList}
              setResidentList={setResidentList}
              yearId={yearId}
              adminRights={adminRights}
              fetchResidentList={fetchResidentList}
            />
          ) : (
            <Alert severity="info">
              Aucun MACCS n'a encore été enregistré pour cette année. Pour ajouter un MACCS,
              veuillez partager le code d'identification de l'année disponible dans l'onglet
              "Année(s)" avec votre MACCS.
            </Alert>
          )}
        </>
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
    </Box>
  );
};

export default Residents;
