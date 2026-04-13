import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const steps = {
  timer: {
    label: "Horaires",
    intro: "Encodez vos heures de travail journalières.",
    items: [
      "Sélectionnez l'année de stage concernée.",
      "Choisissez l'heure de début et l'heure de fin de votre journée.",
      'Activez "Retour en garde" si vous étiez de garde appelable et avez été rappelé à l\'hôpital.',
      "Indiquez votre pause et le temps scientifique si nécessaire.",
      'Cliquez sur "Enregistrer".',
    ],
    tips: [
      { label: "Pause", text: "Déduite du total — n'est pas comptée comme temps travaillé." },
      { label: "Scientifique", text: "Formations, congrès, activités académiques." },
      { label: "Retour en garde", text: "Vous étiez de garde appelable et avez été rappelé à l'hôpital. Pause et scientifique sont ignorés." },
    ],
  },
  garde: {
    label: "Gardes",
    intro: "Encodez une garde de nuit ou de week-end.",
    items: [
      "Sélectionnez l'année de stage.",
      "Date de début : par défaut hier à 18h00.",
      "Date de fin : par défaut aujourd'hui à 08h00.",
      'Choisissez le type de garde.',
      "Commentaire optionnel via le bouton dédié.",
      'Cliquez sur "Enregistrer".',
    ],
    tips: [
      { label: "Appelable", text: "Vous êtes de garde à domicile, joignable si besoin." },
      { label: "Sur place", text: "Vous dormez à l'hôpital pendant la garde." },
    ],
  },
  absence: {
    label: "Absences",
    intro: "Encodez une absence (congé, maladie, maternité…).",
    items: [
      "Sélectionnez l'année de stage.",
      '"Dates multiples" si l\'absence couvre plusieurs jours consécutifs.',
      "Sélectionnez la date de début (et de fin si applicable).",
      "Choisissez le type d'absence.",
      'Cliquez sur "Enregistrer".',
    ],
    tips: [
      { label: "Congé maladie", text: "Certificat médical à transmettre aux RH." },
      { label: "Maternité / Paternité", text: "Certificat de naissance requis pour validation." },
    ],
  },
};

type TabKey = keyof typeof steps;
const tabKeys = Object.keys(steps) as TabKey[];

const HelpDialog = ({ open, onClose, initialTab = "timer" }: {
  open: boolean;
  onClose: () => void;
  initialTab?: TabKey;
}) => {
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const section = steps[tab];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 3 }}>
        <HelpOutlineIcon color="primary" fontSize="small" />
        <Typography variant="h6" component="span">
          Comment ça fonctionne ?
        </Typography>
      </DialogTitle>

      <Divider />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ px: 2, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0.5 } }}
      >
        {tabKeys.map((key) => (
          <Tab key={key} value={key} label={steps[key].label} />
        ))}
      </Tabs>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {section.intro}
        </Typography>

        <Typography variant="subtitle2" mb={0.75}>
          Étapes
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
          {section.items.map((item, i) => (
            <Typography
              key={i}
              component="li"
              variant="body2"
              sx={{ mb: 0.5, lineHeight: 1.5 }}
            >
              {item}
            </Typography>
          ))}
        </Box>

        {section.tips.length > 0 && (
          <>
            <Typography variant="subtitle2" mt={2} mb={0.75}>
              À savoir
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.75}>
              {section.tips.map((tip) => (
                <Box key={tip.label} display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={tip.label}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ flexShrink: 0, height: 22, fontSize: "0.7rem" }}
                  />
                  <Typography variant="body2" color="text.secondary" lineHeight={1.4}>
                    {tip.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" color="primary" size="small">
          J'ai compris
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
