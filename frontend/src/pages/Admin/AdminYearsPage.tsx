import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import adminApi from "../../services/adminApi";
import type { HospitalYear, Hospital } from "../../types/entities";

const AdminYearsPage = () => {
  useAxiosPrivate();
  const qc = useQueryClient();

  const { data: years = [], isLoading: loadingYears } = useQuery({
    queryKey: ["admin-all-years"],
    queryFn: adminApi.listAllYears,
  });

  const { data: hospitals = [], isLoading: loadingHospitals } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: adminApi.listHospitals,
  });

  const assignMutation = useMutation({
    mutationFn: ({ yearId, hospitalId }: { yearId: number; hospitalId: number }) =>
      adminApi.assignYearHospital(yearId, hospitalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-years"] });
      toast.success("Hôpital mis à jour.");
      setAssignTarget(null);
      setSelectedHospitalId("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur lors de la réattribution"),
  });

  const [search, setSearch] = useState("");
  const [assignTarget, setAssignTarget] = useState<HospitalYear | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | "">("");

  const q = search.toLowerCase();
  const filtered = years.filter(
    (y: HospitalYear) =>
      y.title.toLowerCase().includes(q) ||
      y.period.toLowerCase().includes(q) ||
      (y.location ?? "").toLowerCase().includes(q) ||
      (y.hospital?.name ?? "Sans hôpital").toLowerCase().includes(q)
  );

  const openAssignDialog = (year: HospitalYear) => {
    setAssignTarget(year);
    setSelectedHospitalId(year.hospital?.id ?? "");
  };

  return (
    <Box p={3} maxWidth={1400} mx="auto">
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Années de stage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vue globale — toutes années, tous hôpitaux
        </Typography>
      </Box>

      {loadingYears && <CircularProgress size={24} />}

      {!loadingYears && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
            <Typography variant="h6" fontWeight={600}>
              Années ({filtered.length}{search ? `/${years.length}` : ""})
            </Typography>
            <TextField
              size="small"
              placeholder="Rechercher par titre, période, hôpital…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 340 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {filtered.length === 0 ? (
            <Alert severity="info">
              {years.length === 0
                ? "Aucune année enregistrée."
                : "Aucun résultat pour cette recherche."}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Titre</strong></TableCell>
                    <TableCell><strong>Période</strong></TableCell>
                    <TableCell><strong>Lieu</strong></TableCell>
                    <TableCell><strong>Hôpital</strong></TableCell>
                    <TableCell align="center"><strong>Résidents</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((year: HospitalYear) => (
                    <TableRow key={year.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {year.title}
                        </Typography>
                        {year.speciality && (
                          <Typography variant="caption" color="text.secondary">
                            {year.speciality}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{year.period}</TableCell>
                      <TableCell>{year.location}</TableCell>
                      <TableCell>
                        {year.hospital ? (
                          year.hospital.name
                        ) : (
                          <Chip label="Sans hôpital" size="small" color="warning" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={year.residentCount ?? 0}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SwapHorizIcon />}
                          onClick={() => openAssignDialog(year)}
                        >
                          Changer hôpital
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Assign hospital dialog */}
      <Dialog
        open={assignTarget !== null}
        onClose={() => { setAssignTarget(null); setSelectedHospitalId(""); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Changer l'hôpital</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" mb={2}>
            Année : <strong>{assignTarget?.title}</strong>
          </Typography>
          {loadingHospitals ? (
            <CircularProgress size={20} />
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel>Hôpital</InputLabel>
              <Select
                value={selectedHospitalId}
                label="Hôpital"
                onChange={(e) => setSelectedHospitalId(e.target.value as number)}
              >
                {(hospitals as Hospital[]).map((h) => (
                  <MenuItem key={h.id} value={h.id}>
                    {h.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssignTarget(null); setSelectedHospitalId(""); }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!selectedHospitalId || assignMutation.isPending}
            onClick={() =>
              assignTarget &&
              selectedHospitalId !== "" &&
              assignMutation.mutate({ yearId: assignTarget.id, hospitalId: selectedHospitalId as number })
            }
          >
            {assignMutation.isPending ? <CircularProgress size={20} /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminYearsPage;
