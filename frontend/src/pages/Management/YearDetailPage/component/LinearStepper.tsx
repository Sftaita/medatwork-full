import React, { useState } from "react";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import yearsApi from "../../../../services/yearsApi";
import { toast } from "react-toastify";

// Material UI
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Button from "@mui/material/Button";
import { Grid } from "@mui/material";

// Local component
import SearchList from "./SearchList";
import Rights from "./Rights";
import Validation from "./Validation";
import { handleApiError } from "@/services/apiError";

const steps = [
  {
    label: "Rechercher",
    description: ``,
  },
  {
    label: "Gestion des droits",
    description: "Définissez les droits de votre invité.",
  },
  {
    label: "Enregistrement",
    description: `Nous enregisrtons votre demande.`,
  },
];

const LinearStepper = ({ list, id, handleClose, updateManagerList }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });
  const axiosPrivate = useAxiosPrivate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedManager, setSelectedManager] = useState({});
  const [completed] = useState({});
  const [state, setState] = useState({
    dataAccess: true,
    dataValidation: false,
    dataDownload: false,
    inviteAutorisation: false,
    admin: false,
    agenda: false,
    schedule: false,
  });

  const totalSteps = () => {
    return steps.length;
  };

  const completedSteps = () => {
    return Object.keys(completed).length;
  };

  const isLastStep = () => {
    return activeStep === totalSteps() - 1;
  };

  const allStepsCompleted = () => {
    return completedSteps() === totalSteps();
  };

  const handleNext = () => {
    const newActiveStep =
      isLastStep() && !allStepsCompleted()
        ? // It's the last step, but not all steps have been completed,
          // find the first step that has been completed
          steps.findIndex((step, i) => !(i in completed))
        : activeStep + 1;

    setActiveStep(newActiveStep);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStep = (step) => () => {
    setActiveStep(step);
  };

  // Send API request
  const handleListItemClick = async () => {
    handleNext();

    const relation = {
      year: id,
      guest: selectedManager.id,
      dataValidation: state.dataValidation,
      dataAccess: state.dataAccess,
      dataDownload: state.dataDownload,
      admin: state.admin,
      agenda: state.agenda,
      schedule: state.schedule,
    };

    try {
      const { method, url } = yearsApi.inviteGuest();
      await axiosPrivate[method](url, relation);
      toast.success("Enregistrement validé!", {
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
      handleClose();
      updateManagerList();
    }
  };

  return (
    <Box width={1}>
      <Box
        paddingLeft={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingRight={isMd ? theme.spacing(4) : theme.spacing(2)}
        paddingTop={isMd ? theme.spacing(4) : theme.spacing(2)}
      >
        <Grid container direction="column" justifyContent="space-between" alignItems="stretch">
          <Box>
            <Stepper activeStep={activeStep}>
              {steps.map((step, index) => (
                <Step
                  key={step.label}
                  completed={completed[index]}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    width: "100%",
                    "& .MuiButtonBase-root": {
                      position: "relative",
                      bgcolor: activeStep === index ? "primary.main" : "alternate.main",
                      color: activeStep === index ? "text.primary" : "common.white",
                      height: theme.spacing(6),
                      padding: theme.spacing(0, 3),
                      zIndex: 1,
                    },
                    "& .MuiStepLabel-label.Mui-active": {
                      color: theme.palette.common.white,
                    },
                    "& .MuiSvgIcon-root.Mui-active": {
                      color: theme.palette.common.white,
                      "& .MuiStepIcon-text": {
                        fill: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <React.Fragment>
                    <StepButton onClick={handleStep(index)}>{isMd ? step.label : ""}</StepButton>
                    {index === steps.length - 1 ? null : (
                      <Box
                        sx={{
                          width: 0,
                          height: 0,
                          borderTop: `${theme.spacing(3)} solid transparent`,
                          borderBottom: `${theme.spacing(3)} solid transparent`,
                          borderLeft: `${theme.spacing(2)} solid ${
                            activeStep === index ? theme.palette.primary : theme.palette.alternate
                          }`,
                          transform: `translateX(${theme.spacing(0)})`,
                          zIndex: 2,
                        }}
                      />
                    )}
                  </React.Fragment>
                </Step>
              ))}
            </Stepper>
            {activeStep === 0 && (
              <SearchList
                list={list}
                handleNext={handleNext}
                selectedManager={selectedManager}
                setSelectedManager={setSelectedManager}
              />
            )}
            {activeStep === 1 && (
              <Rights
                handleNext={handleNext}
                selectedManager={selectedManager}
                state={state}
                setState={setState}
                handleListItemClick={handleListItemClick}
              />
            )}
            {activeStep === 2 && (
              <Validation state={state} selectedManager={selectedManager} yearId={id} />
            )}
          </Box>

          {activeStep === 0 && (
            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Button color="primary" variant={"outlined"} onClick={handleClose} sx={{ mr: 1 }}>
                Annuler
              </Button>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Button
                color="primary"
                variant={"outlined"}
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Retour
              </Button>
              <Box sx={{ flex: "1 1 auto" }} />

              {activeStep !== 0 && (
                <Button variant={"contained"} onClick={handleListItemClick} sx={{ mr: 1 }}>
                  Valider
                </Button>
              )}
            </Box>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default LinearStepper;
