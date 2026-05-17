import { create } from "zustand";

export const LS_KEY = "medatwork:sidebar-collapsed";

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "true";
  } catch {
    return false;
  }
}

interface SidebarStore {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set, get) => {
  // Cross-tab sync: when another tab toggles the sidebar, reflect it here.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === LS_KEY) {
        set({ collapsed: e.newValue === "true" });
      }
    });
  }

  return {
    collapsed: readStoredCollapsed(),
    setCollapsed: (v) => {
      try { localStorage.setItem(LS_KEY, String(v)); } catch {}
      set({ collapsed: v });
    },
    toggle: () => {
      const next = !get().collapsed;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      set({ collapsed: next });
    },
  };
});
