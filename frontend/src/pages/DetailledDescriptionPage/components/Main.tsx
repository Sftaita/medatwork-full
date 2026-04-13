import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import { NavLink } from "react-router-dom";

const jobDescription = {
  MACCS: {
    title: "MACCS",
    subTitle: "Gestionnaire de temps de travail",
    summaryTitle: "Notre objectif",
    summary: [
      "La nouvelle réglementation qui encadre la formation des médecins candidats spécialistes a permis de régler plusieurs problématiques soulevées depuis plusieurs années. Cependant, elle s'accompagne de contraintes horaires difficiles à suivre, nécessitant alors une collaboration avec le maître de stage (responsable légal).",
      "Par ailleurs, les MACCS déjà soumis à des tâches administratives importantes (carnet de stage, rapport d'hospitalisation, protocole, documents d'assurances, etc), sont maintenant tenus de rédiger un carnet horaire détaillé. Med@work permet, par une solution simple et rapide d'encodage, de vous décharger de cette tâche.",
    ],
    itemsTitle: "Fonctionnalités disponibles pour les MACCS",
    itemsIntroduction:
      "Le principe est simple : sortir de l'hôpital, prendre son smartphone, encoder son horaire et... c'est tout.",
    items: [
      "Encodage des heures prestées",
      "Suivi des horaires par semaine",
      "Suivi des heures normales, inconfortables et très inconfortables",
      "Suivi des jours de congé disponibles",
      "Suivi détaillé des encodages horaires",
      "Visualisation sur un agenda",
      "Collaboration avec les Ressources Humaines",
      "Téléchargement d'un tableur Excel reprennant toute l'année",
    ],
    conclusionTitle: "En cours de développement",
    conclusion: [
      "Med@work se développe à partir du feedback rapporté sur le terrain. Parmis les travaux en cours, un plannificateur tel que demandé par la loi, permettant de définir les rôles de chacun (consultation, bloc-opératoire, tour d'étage, etc).",
      "Une demande qui nous a récement été envoyée concerne la répartition des gardes, casse-tête habituel et source de frustrations. Nous développons actuellement la «roulette des gardes» permettant une répartition plus équitable des jours de garde et ce, en tenant compte des désidératats de chacun.",
    ],
  },
  Managers: {
    title: "Maîtres de stage et collaborateurs",
    subTitle: "Gestionnaire de temps de travail",
    summaryTitle: "Notre objectif",
    summary: [
      "La nouvelle réglementation qui encadre la formation des médecins candidats spécialistes a permis de régler plusieurs problématiques soulevées depuis plusieurs années. Cependant, elle s'accompagne de contraintes horaires difficiles à suivre, nécessitant alors une collaboration avec le maître de stage (responsable légal).",
      "Par ailleurs, les MACCS déjà soumis à des tâches administratives importantes (carnet de stage, rapport d'hospitalisation, protocole, documents d'assurances,etc), sont maintenant tenus de rédiger un carnet horaire détaillé.",
      "Med@work permet, par une solution simple et rapide d'encodage, de vous décharger de cette tâche.",
    ],
    itemsTitle: "Fonctionnalités disponibles pour les maîtres de stage",
    itemsIntroduction:
      "Nous nous efforcons de présenter une ergonomie réflechie afin que toutes les fonctionnalités suivantes soient le plus facilement accesibles. Dans notre idéal, le maître de stage ou ses collaborateurs doivent pouvoir suivre ce qu'il se passe depuis leur smartphone, ou et quand ils le souhaitent.",
    items: [
      "Suivi des horaires par semaine",
      "Suivi des heures normales, inconfortables et très inconfortables",
      "Suivi des jours de congé disponibles",
      "Suivi détaillé des encodages horaires",
      "Invitation et collaboration avec les collègues",
      "Collaboration avec les Ressources Humaines",
      "Visualisation résumée du mois précédent validation",
      "Téléchargement d'un tableur Excel reprennant toute l'année",
      "Validation numérique des mois",
    ],
    conclusionTitle: "En cours de développement",
    conclusion: [
      "Med@work se développe à partir du feedback rapporté sur le terrain. Parmis les travaux en cours, un plannificateur tel que demandé par la loi, permettant de définir les rôles de chacun (consultation, bloc-opératoire, tour d'étage, etc).",
      "Une demande qui nous a récement été envoyée concerne la répartition des gardes, casse-tête habituel et source de frustrations. Nous déveleppons actuellement la «roulette des gardes» permettant une répartition plus équitable des jours de gardeet ce, en tenant compte des désidératats de chacun.",
    ],
  },
  HR: {
    title: "Ressources Humaines",
    subTitle: "Gestionnaire de temps de travail",
    summaryTitle: "Notre objectif",
    summary: [
      "La nouvelle réglementation qui encadre la formation des médecins candidats spécialistes a permis de régler plusieurs problématiques soulevées depuis plusieurs années. Cependant, elle s'accompagne de contraintes horaires difficiles à suivre qui ont nécessité une réadaptation des services des Ressources Humaines.",
      "La nouvelle tarification horaire impose aux Ressources Humaines un encodage fastidieux, pouvant mener à des erreurs de paiement.",
    ],
    itemsTitle: "Fonctionnalités disponibles pour les Ressources Humaines",
    itemsIntroduction:
      "Nous nous efforcons de présenter une ergonomie réflechie afin que toutes les fonctionnalités suivantes soient le plus facilement accesibles. Dans notre idéal, le maître de stage ou ses collaborateurs doivent pouvoir suivre ce qu'il se passe depuis leur smartphone, ou et quand ils le souhaitent.",
    items: [
      "Suivi des horaires par semaine pour chaque MACCS et par discipline",
      "Suivi des heures normales, inconfortables et très inconfortables",
      "Suivi des jours de congé disponibles",
      "Suivi détaillé des encodages horaires",
      "Invitation et collaboration avec les collègues",
      "Collaboration avec les maîtres de stage",
      "Téléchargement d'un tableur Excel reprennant toute l'année",
      "Validation numérique des mois par les maîtres de stage",
    ],
    conclusionTitle: "En cours de développement",
    conclusion: [
      "Med@work se développe à partir du feedback rapporté sur le terrain. Parmis les travaux en cours, un transfert direct des données vers le logiciel Staff Planner, évitant ainsi l'encodage fastidieux",
    ],
  },
};

const Main = ({ job, _setJob }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const navigate = useNavigate();

  const [chapter, setChapter] = useState(jobDescription.MACCS);

  useEffect(() => {
    if (job === "Managers") {
      setChapter(jobDescription.Managers);
    }
    if (job === "Residents") {
      setChapter(jobDescription.MACCS);
    }
    if (job === "HR") {
      setChapter(jobDescription.HR);
    }
  }, [job]);

  return (
    <Box paddingBottom={4} paddingRight={2} paddingLeft={2}>
      <Box
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={{ xs: "flex-start", sm: "center" }}
        flexDirection={{ xs: "column", sm: "row" }}
      >
        <Box>
          <Typography fontWeight={700} variant={"h4"} gutterBottom>
            {chapter.title}
          </Typography>
          <Typography variant={"h6"}>{chapter.subTitle}</Typography>
        </Box>

        <Button variant="outlined" onClick={() => navigate(-1)}>
          Retour
        </Button>

        {/**<Box display="flex" marginTop={{ xs: 2, md: 0 }}>
          <FormControl fullWidth>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={job}
              onChange={handleChange}
            >
              <MenuItem value={"Managers"}>Maître de stage</MenuItem>
              <MenuItem value={"Residents"}>MACCS</MenuItem>
              <MenuItem value={"HR"}>Ressources Humaines</MenuItem>
            </Select>
          </FormControl>
        </Box>**/}
      </Box>
      <Divider sx={{ marginY: 4 }} />
      <Grid container spacing={isMd ? 4 : 2}>
        <Grid item xs={12} md={8}>
          <Box marginBottom={3}>
            <Typography variant={"h5"} fontWeight={700} gutterBottom>
              {chapter.summaryTitle}
            </Typography>
            {chapter?.summary?.map((text, i) => (
              <Typography component={"p"} align={"justify"} key={i}>
                {text}
              </Typography>
            ))}
          </Box>
          <Box marginBottom={3}>
            <Typography variant={"h5"} fontWeight={700} gutterBottom>
              {chapter?.itemsTitle}
            </Typography>
            <Typography component={"p"} align={"justify"}>
              {chapter?.itemsIntroduction}
            </Typography>
            <Grid container spacing={1} sx={{ marginTop: 1 }}>
              {chapter?.items?.map((item, i) => (
                <Grid item xs={12} key={i}>
                  <Box component={ListItem} disableGutters width={"auto"} padding={0}>
                    <Box component={ListItemAvatar} minWidth={"auto !important"} marginRight={2}>
                      <Box
                        component={Avatar}
                        bgcolor={theme.palette.secondary.main}
                        width={20}
                        height={20}
                      >
                        <svg
                          width={12}
                          height={12}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Box>
                    </Box>
                    <ListItemText primary={item} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box>
            <Typography variant={"h5"} fontWeight={700} gutterBottom>
              {chapter?.conclusionTitle}
            </Typography>
            {chapter?.conclusion?.map((text, i) => (
              <Typography component={"p"} align="justify" key={i}>
                {text}
              </Typography>
            ))}
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Grid container spacing={isMd ? 4 : 2} direction="column">
            <Grid item xs={12} data-aos="fade-up">
              <Box component={Card} bgcolor={"primary.main"}>
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    color="text.primary"
                    sx={{ color: "common.white" }}
                  >
                    Notre projet vous intéresse?
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{ color: "common.white" }}
                  >
                    Discutons-en ensemble afin d'identifier les bénéfices que vous pourriez en
                    tirer.
                  </Typography>
                </CardContent>
              </Box>
            </Grid>
            <Grid item xs={12} data-aos="fade-up">
              <Box component={Card}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.primary">
                    Gestionnaire de temps de travail médical
                  </Typography>
                  <NavLink to={"/connecting"} style={{ textDecoration: "none" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      endIcon={
                        <Box
                          component={"svg"}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          width={24}
                          height={24}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </Box>
                      }
                    >
                      Intéressé?
                    </Button>
                  </NavLink>
                </CardContent>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Main;
