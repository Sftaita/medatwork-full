import { useState } from "react";

// Material UI
import { useTheme } from "@mui/material/styles";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import dayjs from "@/lib/dayjs";

const SummaryCard = ({
  timeProblem,
  smoothedTime,
  absences,
  totalAbsences,
  shiftErrors,
  residentInfo,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <div>
      <Accordion expanded={expanded === "panel1"} onChange={handleChange("panel1")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Horaires</Typography>
          {timeProblem.length !== 0 && (
            <>
              <Typography sx={{ color: "warning.main" }}>Problème horaire repéré</Typography>
            </>
          )}
          {timeProblem.length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>Rien à signaler</Typography>
          )}
        </AccordionSummary>

        <AccordionDetails>
          {timeProblem.map((item, i) => {
            return (
              <Alert key={i} severity="error" sx={{ marginBottom: theme.spacing(1) }}>
                <Typography>{item.error}</Typography>
                <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                  <PersonIcon />
                  <Typography>{item.residentLastname + " " + item.residentFirstname}</Typography>
                </Stack>
              </Alert>
            );
          })}
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === "panel2"} onChange={handleChange("panel2")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2bh-content"
          id="panel2bh-header"
        >
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Absences</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {totalAbsences} jour(s) enregistré(s)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {absences.map((item, key) => (
            <Alert severity="info" key={key} sx={{ marginBottom: theme.spacing(1) }}>
              {item.residentLastname + " " + item.residentFirstname}: {item.absences + " jours(s)"}
            </Alert>
          ))}
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === "panel3"} onChange={handleChange("panel3")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3bh-content"
          id="panel3bh-header"
        >
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Doublons de garde</Typography>
          {shiftErrors && shiftErrors.length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>
              Aucune incohérence mise en évidence
            </Typography>
          )}
          {shiftErrors && shiftErrors.length !== 0 && (
            <Typography sx={{ color: "warning.main" }}>
              Une incohérence a été mise en évidence
            </Typography>
          )}
        </AccordionSummary>
        <AccordionDetails>
          {shiftErrors.map((item) => {
            return item?.shiftErrors?.map((error, i) => {
              return (
                <Alert key={i} severity="error" sx={{ marginBottom: theme.spacing(1) }}>
                  <Typography>
                    {item.residentLastname + " " + item.residentFirstname + ": " + error}
                  </Typography>
                </Alert>
              );
            });
          })}
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === "panel4"} onChange={handleChange("panel4")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel4bh-content"
          id="panel4bh-header"
        >
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Détails</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {smoothedTime?.length === 0 && (
            <Alert severity="success">
              Lissage sur 13 semaines de tous les MACCS est en ordre.
            </Alert>
          )}
          {smoothedTime?.length !== 0}
          {smoothedTime.map((item, i) => {
            return (
              <Alert key={i} severity="error">
                Le calcul du lissage sur 13 semaines du Dr{" "}
                {item.residentLastname + " " + item.residentFirstname} présente un dépassement
                horaire.
              </Alert>
            );
          })}
        </AccordionDetails>
        {residentInfo?.map((item, key) => {
          return (
            <AccordionDetails key={key}>
              <Alert severity="info">
                <Typography>{item.residentLastname + " " + item.residentFirstname}</Typography>
                <br />
                <Typography>
                  {" "}
                  Opting out:{" "}
                  <span style={{ fontWeight: "bold" }}>{item?.optingOut ? "Oui" : "Non"}</span>
                </Typography>
                <Typography>- Temps de travail hebdomadaire légal: 48h</Typography>
                <Typography>
                  - Temps de travail hebdomadaire moyen maximum autorisé sur 13 semaines:{" "}
                  {item?.optingOut ? "60h" : "48h"}
                </Typography>
                <Typography>- Temps de travail additionnel autorisé: 12h</Typography>
                <Typography>
                  - Temps de travail maximum absolue autorisé: {item?.optingOut ? "72h" : "60h"}
                </Typography>

                <br />
                {item?.periods?.length === 1 && (
                  <Typography>
                    Période: Ce mois se situe sur une période de 13 semaines allant du{" "}
                    {dayjs(item?.periods[0]?.periodStart).format("DD-MM-YY")} au{" "}
                    {dayjs(item?.periods[0]?.periodEnd).format("DD-MM-YY")}
                  </Typography>
                )}
                {item?.periods?.length > 1 && (
                  <Typography>
                    Périodes: Ce mois est à chevalle sur deux périodes de 13 semaines allant du{" "}
                    <span style={{ fontWeight: 600 }}>
                      {dayjs(item?.periods[0]?.periodStart).format("DD-MM-YY")}
                    </span>{" "}
                    au{" "}
                    <span style={{ fontWeight: "bold" }}>
                      {dayjs(item?.periods[0]?.periodEnd).format("DD-MM-YY")}
                    </span>{" "}
                    et{" "}
                    <span style={{ fontWeight: "bold" }}>
                      {dayjs(item?.periods[1]?.periodStart).format("DD-MM-YY")}
                    </span>{" "}
                    au{" "}
                    <span style={{ fontWeight: 600 }}>
                      {dayjs(item?.periods[1]?.periodEnd).format("DD-MM-YY")}
                    </span>
                    . La vérification du lissage a donc été réalisée sur ces deux intervalles.
                  </Typography>
                )}
                <br />
                <Typography>
                  {" "}
                  Dépassement du temps de travail dans le respect du temps additionnel (légal):{" "}
                  <span style={{ fontWeight: 600 }}>
                    {item?.warningHours?.length === 0 ? "Non" : "Oui"}
                  </span>
                </Typography>
                {item?.warningHours?.length > 0 &&
                  item?.warningHours?.map((week, index) => {
                    return (
                      <Typography key={index}>
                        Semaine {week.weekNb}: {week.value}
                      </Typography>
                    );
                  })}

                <br />
                <Typography>
                  {" "}
                  Dépassement du temps de travail maximum absolue sur la/les période(s) de 13
                  semaines (illégal):{" "}
                  <span style={{ fontWeight: 600 }}>
                    {item?.illegalHours?.length === 0 ? "Non" : "Oui"}
                  </span>
                </Typography>
                {item?.illegalHours?.length > 0 &&
                  item.illegalHours.map((week, index) => (
                    <Typography sx={{ color: "warning.main" }} key={index}>
                      - Semaine {week.weekNb}: {week.value}
                    </Typography>
                  ))}

                <br />
                <Typography>Nombre de garde</Typography>
                <Typography>
                  - Garde sur place: <span style={{ fontWeight: 600 }}>{item?.hospitalShift}</span>
                </Typography>
                <Typography>
                  - Garde appelable: <span style={{ fontWeight: 600 }}>{item?.callableShift}</span>
                </Typography>
              </Alert>
            </AccordionDetails>
          );
        })}
      </Accordion>
    </div>
  );
};

export default SummaryCard;
