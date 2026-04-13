import { useState, useEffect } from "react";
import yearsApi from "../../../services/yearsApi";
import { useLocation, useNavigate } from "react-router-dom";

// material UI
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

// component
import Timer from "./components/Timer";
import Garde from "./components/Garde";
import Absence from "./components/Absence";
import HelpDialog from "./components/HelpDialog";

import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { handleApiError } from "@/services/apiError";

const pages = [
  { id: "timer",   title: "Horaires" },
  { id: "garde",   title: "Gardes"   },
  { id: "absence", title: "Absences" },
] as const;

type PageId = (typeof pages)[number]["id"];

const TimerPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();

  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [noYears, setNoYears] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [activeLink, setActiveLink] = useState<PageId>("timer");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const findYears = async () => {
      setYearsLoading(true);
      try {
        const { method, url } = yearsApi.findResidentYears();
        const request = await axiosPrivate[method](url);
        if (request?.data?.length === 0) setNoYears(true);
        setYears(request.data);
      } catch (error) {
        handleApiError(error);
        const status = (error as any)?.response?.status;
        if (status === 401 || status === 403) {
          navigate("/login", { state: { from: location }, replace: true });
        }
      } finally {
        setYearsLoading(false);
      }
    };
    findYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box
      maxWidth={"100%"}
      paddingLeft={theme.spacing(2)}
      paddingRight={theme.spacing(2)}
      paddingTop={{ xs: theme.spacing(3), md: theme.spacing(2) }}
    >
      {!noYears && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Card sx={{ boxShadow: 3 }}>
              <List
                disablePadding
                sx={{
                  display: { xs: "inline-flex", md: "flex" },
                  flexDirection: { xs: "row", md: "column" },
                  overflow: "auto",
                  flexWrap: "nowrap",
                  width: "100%",
                  paddingY: { xs: 3, md: 4 },
                  paddingX: { xs: 4, md: 0 },
                }}
              >
                {pages.map((item) => (
                  <ListItem
                    key={item.id}
                    disableGutters
                    sx={{
                      marginRight: { xs: 2, md: 0 },
                      flex: 0,
                      paddingX: { xs: 0, md: 3 },
                      borderLeft: { xs: "none", md: "2px solid transparent" },
                      borderLeftColor: {
                        md: activeLink === item.id ? theme.palette.primary.main : "transparent",
                      },
                      borderBottom: { xs: "2px solid transparent", md: "none" },
                      borderBottomColor: {
                        xs: activeLink === item.id ? theme.palette.primary.main : "transparent",
                      },
                    }}
                  >
                    <Button onClick={() => setActiveLink(item.id)}>
                      <Typography
                        variant="subtitle1"
                        noWrap
                        color={activeLink === item.id ? "text.primary" : "text.secondary"}
                      >
                        {item.title}
                      </Typography>
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

          <Grid item container xs={12} md={6} alignItems={"flex-start"}>
            {activeLink === "timer"   && <Timer   years={years} yearsLoading={yearsLoading} onHelpOpen={() => setHelpOpen(true)} />}
            {activeLink === "garde"   && <Garde   years={years} yearsLoading={yearsLoading} onHelpOpen={() => setHelpOpen(true)} />}
            {activeLink === "absence" && <Absence years={years} yearsLoading={yearsLoading} onHelpOpen={() => setHelpOpen(true)} />}
          </Grid>
        </Grid>
      )}

      {noYears && (
        <Stack sx={{ width: "100%" }} spacing={2}>
          <Alert severity="info">
            Vous ne vous êtes pas encore enregistré à une année. Vous pouvez vous inscrire à une
            année en demandant le <b>code d'authentification</b> à votre maître de stage.
          </Alert>
        </Stack>
      )}

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialTab={activeLink}
      />
    </Box>
  );
};

export default TimerPage;
