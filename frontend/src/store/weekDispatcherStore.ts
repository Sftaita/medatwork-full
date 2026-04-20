import { create } from "zustand";
import type { Year, Resident } from "@/types/entities";

/** Shape returned by YearSummaryBuilder::buildWeekIntervals */
export interface WeekInterval {
  weekIntervalId: number;
  dateOfStart: string;
  dateOfEnd: string;
  weekNumber: number;
  monthNumber: number;
  yearNumber: number;
}

/** Shape returned by YearSummaryBuilder::buildWeekTemplates */
export interface YearWeekTemplate {
  yearWeekTemplateId: number;
  yearId: number;
  weekTemplateId: number;
  title: string;
  description: string | null;
  color: string;
}

/** A resident assigned to a (template × interval) slot */
export interface ResidentAssignment {
  id: number;
  residentId: number;
  firstname: string;
  lastname: string;
  allowed: boolean;
}

/** assignments[yearWeekTemplateId][weekIntervalId] = ResidentAssignment | null */
export type Assignments = Record<number, Record<number, ResidentAssignment | null>>;

type Updater<T> = T | ((prev: T) => T);

interface WeekDispatcherStore {
  currentYearId: number | null;
  setCurrentYearId: (id: number | null) => void;
  years: Year[];
  setYears: (years: Year[]) => void;
  residents: Resident[];
  setResidents: (residents: Resident[]) => void;
  intervals: WeekInterval[];
  setInterval: (intervals: WeekInterval[]) => void;
  yearWeekTemplates: YearWeekTemplate[];
  setYearWeekTemplates: (templates: Updater<YearWeekTemplate[]>) => void;
  assignments: Assignments;
  setAssignments: (assignments: Updater<Assignments>) => void;
  pendingChange: unknown[];
  setPendingChange: (changes: Updater<unknown[]>) => void;
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
  setYearWeekTemplates: (templatesOrFn) =>
    set((state) => ({
      yearWeekTemplates:
        typeof templatesOrFn === "function"
          ? templatesOrFn(state.yearWeekTemplates)
          : templatesOrFn,
    })),
  assignments: {},
  setAssignments: (assignmentsOrFn) =>
    set((state) => ({
      assignments:
        typeof assignmentsOrFn === "function"
          ? assignmentsOrFn(state.assignments)
          : assignmentsOrFn,
    })),
  pendingChange: [],
  setPendingChange: (changesOrFn) =>
    set((state) => ({
      pendingChange:
        typeof changesOrFn === "function"
          ? changesOrFn(state.pendingChange)
          : changesOrFn,
    })),
}));
