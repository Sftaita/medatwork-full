import { create } from "zustand";

export type ThemeMode = "light" | "dark";

export const LS_KEY = "medatwork:theme";

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

export const useThemeStore = create<ThemeStore>((set) => {
  // Cross-tab sync: when another tab writes to localStorage, update this tab's store.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === LS_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        set({ mode: e.newValue });
      }
    });
  }

  return {
    mode: readStoredMode(),
    setMode: (mode) => {
      try { localStorage.setItem(LS_KEY, mode); } catch {}
      set({ mode });
    },
  };
});
