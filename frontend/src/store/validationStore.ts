import { create } from "zustand";

interface ValidationStore {
  activeStep: number;
  setActiveStep: (step: number) => void;
  periodId: number | undefined;
  setPeriodId: (id: number | undefined) => void;
  residentValidationData: unknown[];
  setResidentValidationData: (data: unknown[]) => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  activeStep: 0,
  setActiveStep: (activeStep) => set({ activeStep }),
  periodId: undefined,
  setPeriodId: (periodId) => set({ periodId }),
  residentValidationData: [],
  setResidentValidationData: (residentValidationData) => set({ residentValidationData }),
}));
