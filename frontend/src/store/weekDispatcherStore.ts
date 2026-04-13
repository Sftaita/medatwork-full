import { create } from "zustand";
import type { Year, Resident } from "@/types/entities";

interface WeekInterval {
  id: number;
  startDate: string;
  endDate: string;
}

interface WeekTemplate {
  id: number;
  title: string;
}

interface Assignments {
  [key: string]: unknown;
}

interface WeekDispatcherStore {
  currentYearId: number | null;
  setCurrentYearId: (id: number | null) => void;
  years: Year[];
  setYears: (years: Year[]) => void;
  residents: Resident[];
  setResidents: (residents: Resident[]) => void;
  intervals: WeekInterval[];
  setInterval: (intervals: WeekInterval[]) => void;
  yearWeekTemplates: WeekTemplate[];
  setYearWeekTemplates: (templates: WeekTemplate[]) => void;
  assignments: Assignments;
  setAssignments: (assignments: Assignments) => void;
  pendingChange: unknown[];
  setPendingChange: (changes: unknown[]) => void;
}

export const useWeekDispatcherStore = create<WeekDispatcherStore>((set) => ({
  currentYearId: null,
  setCurrentYearId: (currentYearId) => set({ currentYearId }),
  years: [],
  setYears: (years) => set({ years }),
  residents: [],
  setResidents: (residents) => set({ residents }),
  intervals: [],
  setInterval: (intervals) => set({ intervals }),
  yearWeekTemplates: [],
  setYearWeekTemplates: (yearWeekTemplates) => set({ yearWeekTemplates }),
  assignments: {},
  setAssignments: (assignments) => set({ assignments }),
  pendingChange: [],
  setPendingChange: (pendingChange) => set({ pendingChange }),
}));
