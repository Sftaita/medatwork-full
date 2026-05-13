import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const LS_KEY = "medatwork:theme";

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return "light";
}

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: readStoredMode(),
  setMode: (mode) => {
    try { localStorage.setItem(LS_KEY, mode); } catch {}
    set({ mode });
  },
}));
