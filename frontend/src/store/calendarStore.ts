import { create } from "zustand";
import type { Year, YearResident } from "@/types/entities";

interface CalendarStore {
  years: Year[];
  setYears: (years: Year[]) => void;
  currentYear: Year | null;
  setCurrentYear: (year: Year | null) => void;
  /** IDs des résidents sélectionnés (filtre affiché sur le calendrier) */
  selectedResidents: number[];
  setSelectedResidents: (residentIds: number[]) => void;
  yearResidents: YearResident[];
  setYearResidents: (yearResidents: YearResident[]) => void;
  schedules: unknown[];
  setSchedules: (schedules: unknown | ((prev: unknown[]) => unknown[])) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  years: [],
  setYears: (years) => set({ years }),
  currentYear: null,
  setCurrentYear: (currentYear) => set({ currentYear }),
  selectedResidents: [],
  setSelectedResidents: (selectedResidents) => set({ selectedResidents }),
  yearResidents: [],
  setYearResidents: (yearResidents) => set({ yearResidents }),
  schedules: [],
  setSchedules: (schedules) =>
    set((state) => ({
      schedules: typeof schedules === "function" ? (schedules as (prev: unknown[]) => unknown[])(state.schedules) : schedules,
    })),
}));
