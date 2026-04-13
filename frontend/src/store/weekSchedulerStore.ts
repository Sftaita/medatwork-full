import { create } from "zustand";

interface SelectedWeek {
  start: string | null;
  end: string | null;
}

interface WeekSchedulerStore {
  weekTemplates: unknown[];
  setWeekTemplates: (templates: unknown[]) => void;
  selectedWeekId: number | undefined;
  setSelectedWeekId: (id: number | undefined) => void;
  selectedWeek: SelectedWeek;
  setSelectedWeek: (week: SelectedWeek) => void;
  currentWeek: unknown[];
  setCurrentWeek: (week: unknown[]) => void;
  selectedWeekDay: number;
  setSelectedWeekDay: (day: number) => void;
  selectedTask: unknown | null;
  setSelectedTask: (task: unknown | null) => void;
  taskMode: "creation" | "update";
  setTaskMode: (mode: "creation" | "update") => void;
  currentWeekId: number | undefined;
  setCurrentWeekId: (id: number | undefined) => void;
  mode: "weekDispatcher" | "weekCreator";
  setMode: (mode: "weekDispatcher" | "weekCreator") => void;
}

export const useWeekSchedulerStore = create<WeekSchedulerStore>((set) => ({
  weekTemplates: [],
  setWeekTemplates: (weekTemplates) => set({ weekTemplates }),
  selectedWeekId: undefined,
  setSelectedWeekId: (selectedWeekId) => set({ selectedWeekId }),
  selectedWeek: { start: null, end: null },
  setSelectedWeek: (selectedWeek) => set({ selectedWeek }),
  currentWeek: [],
  setCurrentWeek: (currentWeek) => set({ currentWeek }),
  selectedWeekDay: 1,
  setSelectedWeekDay: (selectedWeekDay) => set({ selectedWeekDay }),
  selectedTask: null,
  setSelectedTask: (selectedTask) => set({ selectedTask }),
  taskMode: "creation",
  setTaskMode: (taskMode) => set({ taskMode }),
  currentWeekId: undefined,
  setCurrentWeekId: (currentWeekId) => set({ currentWeekId }),
  mode: "weekDispatcher",
  setMode: (mode) => set({ mode }),
}));
