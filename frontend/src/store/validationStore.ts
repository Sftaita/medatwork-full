import { create } from "zustand";

type Updater = (prev: unknown[]) => unknown[];

interface ValidationStore {
  activeStep: number;
  setActiveStep: (step: number) => void;
  periodId: number | undefined;
  setPeriodId: (id: number | undefined) => void;
  residentValidationData: unknown[];
  /** Accepte un tableau OU un updater fonctionnel (prev => next). */
  setResidentValidationData: (dataOrUpdater: unknown[] | Updater) => void;
}

export const useValidationStore = create<ValidationStore>((set) => ({
  activeStep: 0,
  setActiveStep: (activeStep) => set({ activeStep }),
  periodId: undefined,
  setPeriodId: (periodId) => set({ periodId }),
  residentValidationData: [],
  setResidentValidationData: (dataOrUpdater) =>
    set((state) => ({
      residentValidationData:
        typeof dataOrUpdater === "function"
          ? dataOrUpdater(state.residentValidationData)
          : dataOrUpdater,
    })),
}));
