import React, { useEffect } from "react";
import useValidationContext from "../../../../hooks/useValidationContext";

// Material UI
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";

import StepButton from "@mui/material/StepButton";

const Steper = ({ periods, getPeriodSummary }) => {
  const { activeStep, setActiveStep } = useValidationContext();
  const { setPeriodId } = useValidationContext();

  const handleStep = (step, periodId) => () => {
    setActiveStep(step);
    getPeriodSummary(periodId);
    setPeriodId(periodId);
  };

  useEffect(() => {
    setPeriodId(periods[0]?.id);
  }, [periods, setPeriodId]);

  return (
    <Box maxWidth={800}>
      <Box>
        <Stepper nonLinear activeStep={activeStep} orientation="vertical">
          {periods?.map((step, index) => (
            <Step
              key={step.id}
              sx={{
                "& .MuiSvgIcon-root": {
                  width: 32,
                  height: 32,
                },
              }}
            >
              <StepButton color="inherit" onClick={handleStep(index, step.id)}>
                {step.label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Box>
    </Box>
  );
};

export default Steper;
